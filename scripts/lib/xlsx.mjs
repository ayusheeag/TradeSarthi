/**
 * Minimal, zero-dependency .xlsx (OOXML SpreadsheetML) writer.
 *
 * Produces a genuine Excel workbook that opens cleanly in Excel / LibreOffice /
 * Google Sheets — no "file format differs" warning. Uses only Node built-ins
 * (zlib for DEFLATE; a hand-rolled ZIP container with CRC-32).
 *
 * writeXlsx(filePath, { sheetName, header, rows })
 *   header : string[]            column titles (written as text)
 *   rows   : (number|string)[][] cell values; numbers are written as numeric
 *                                cells, everything else as inline strings
 */

import { deflateRawSync } from "node:zlib";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

// ---- CRC-32 (needed by the ZIP container) --------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ---- ZIP writer (store-or-deflate, no data descriptors) ------------------
function zip(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const compressed = deflateRawSync(data);
    const useDeflate = compressed.length < data.length;
    const body = useDeflate ? compressed : data;
    const method = useDeflate ? 8 : 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local file header signature
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(method, 8); // compression method
    local.writeUInt16LE(0, 10); // mod time
    local.writeUInt16LE(0x21, 12); // mod date (1980-01-01)
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18); // compressed size
    local.writeUInt32LE(data.length, 22); // uncompressed size
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra length
    chunks.push(local, nameBuf, body);

    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0); // central dir header signature
    cen.writeUInt16LE(20, 4); // version made by
    cen.writeUInt16LE(20, 6); // version needed
    cen.writeUInt16LE(0, 8); // flags
    cen.writeUInt16LE(method, 10);
    cen.writeUInt16LE(0, 12); // mod time
    cen.writeUInt16LE(0x21, 14); // mod date
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(body.length, 20);
    cen.writeUInt32LE(data.length, 24);
    cen.writeUInt16LE(nameBuf.length, 28);
    cen.writeUInt16LE(0, 30); // extra length
    cen.writeUInt16LE(0, 32); // comment length
    cen.writeUInt16LE(0, 34); // disk number start
    cen.writeUInt16LE(0, 36); // internal attrs
    cen.writeUInt32LE(0, 38); // external attrs
    cen.writeUInt32LE(offset, 42); // local header offset
    central.push(Buffer.concat([cen, nameBuf]));

    offset += local.length + nameBuf.length + body.length;
  }

  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // end of central dir signature
  end.writeUInt16LE(entries.length, 8); // entries on this disk
  end.writeUInt16LE(entries.length, 10); // total entries
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16); // central dir offset
  return Buffer.concat([...chunks, centralBuf, end]);
}

// ---- XML helpers ---------------------------------------------------------
const xmlEscape = (s) =>
  String(s).replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));

function colName(n) {
  let s = "";
  n += 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function cell(ref, value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}"><v>${value}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
}

function sheetXml(header, rows) {
  const all = [header, ...rows];
  const lastCol = colName(header.length - 1);
  const parts = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    `<dimension ref="A1:${lastCol}${all.length}"/>`,
    "<sheetData>",
  ];
  for (let r = 0; r < all.length; r++) {
    const rowNum = r + 1;
    const cells = all[r].map((v, c) => cell(`${colName(c)}${rowNum}`, v)).join("");
    parts.push(`<row r="${rowNum}">${cells}</row>`);
  }
  parts.push("</sheetData></worksheet>");
  return parts.join("");
}

function sanitizeSheetName(name) {
  // Excel sheet names: max 31 chars, none of : \ / ? * [ ]
  return (name || "Sheet1").replace(/[:\\/?*[\]]/g, "_").slice(0, 31) || "Sheet1";
}

const CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  "</Types>";

const ROOT_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  "</Relationships>";

const WORKBOOK_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  "</Relationships>";

/** Write rows to a real .xlsx workbook. */
export async function writeXlsx(filePath, { sheetName = "Sheet1", header, rows }) {
  const name = sanitizeSheetName(sheetName);
  const workbook =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets><sheet name="${xmlEscape(name)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;

  const entries = [
    { name: "[Content_Types].xml", data: Buffer.from(CONTENT_TYPES) },
    { name: "_rels/.rels", data: Buffer.from(ROOT_RELS) },
    { name: "xl/workbook.xml", data: Buffer.from(workbook) },
    { name: "xl/_rels/workbook.xml.rels", data: Buffer.from(WORKBOOK_RELS) },
    { name: "xl/worksheets/sheet1.xml", data: Buffer.from(sheetXml(header, rows)) },
  ];

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, zip(entries));
}
