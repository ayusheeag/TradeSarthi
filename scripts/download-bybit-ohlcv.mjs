#!/usr/bin/env node
/**
 * Download historical OHLCV candles from Bybit's public market-data API.
 *
 * Zero dependencies — uses Node's built-in global `fetch` (Node 18+; tested on 22).
 *
 * Defaults reproduce the original request: 1-minute candles for the last 60 days
 * for LABUSDT, SLXUSDT, VINEUSDT, ETHUSDT and BTCUSDT. Each symbol is written to
 * its own Excel (.xlsx) and CSV file under ./data/bybit/.
 *
 * Usage:
 *   node scripts/download-bybit-ohlcv.mjs
 *   node scripts/download-bybit-ohlcv.mjs --symbols BTCUSDT,ETHUSDT --days 30 --interval 1
 *   node scripts/download-bybit-ohlcv.mjs --category linear --out data/perps
 *   node scripts/download-bybit-ohlcv.mjs --format xlsx
 *
 * Options:
 *   --symbols   Comma-separated list        (default: LABUSDT,SLXUSDT,VINEUSDT,ETHUSDT,BTCUSDT)
 *   --days      Look-back window in days     (default: 60)
 *   --interval  Bybit kline interval         (default: 1)   e.g. 1,3,5,15,30,60,240,D,W
 *   --category  spot | linear | inverse | auto (default: auto — tries spot, then linear)
 *   --format    xlsx | csv | both           (default: both)
 *   --out       Output directory             (default: data/bybit)
 *   --base      API base URL                 (default: https://api.bybit.com)
 *
 * Note: This is a data downloader, not a Bybit endpoint. Some networks/proxies block
 * api.bybit.com — run it from a machine with unrestricted egress. api.bytick.com is a
 * documented mirror if the primary host is unreachable (pass --base https://api.bytick.com).
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { writeXlsx } from "./lib/xlsx.mjs";

const BYBIT_MAX_LIMIT = 1000; // max candles per kline request

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

const SYMBOLS = String(args.symbols ?? "LABUSDT,SLXUSDT,VINEUSDT,ETHUSDT,BTCUSDT")
  .split(",")
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);
const DAYS = Number(args.days ?? 60);
const INTERVAL = String(args.interval ?? "1");
const CATEGORY = String(args.category ?? "auto").toLowerCase();
const FORMAT = String(args.format ?? "both").toLowerCase(); // xlsx | csv | both
const OUT_DIR = String(args.out ?? "data/bybit");
const BASE = String(args.base ?? "https://api.bybit.com").replace(/\/+$/, "");

const HEADER = ["timestamp", "datetime", "open", "high", "low", "close", "volume", "turnover"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** GET the kline endpoint with basic retry/backoff on transient failures. */
async function fetchKline({ category, symbol, interval, start, end, limit }) {
  const url = new URL(`${BASE}/v5/market/kline`);
  url.searchParams.set("category", category);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("start", String(start));
  url.searchParams.set("end", String(end));
  url.searchParams.set("limit", String(limit));

  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      if (json.retCode !== 0) {
        // retCode 10001 etc. — usually an invalid symbol/category; surface it.
        throw new Error(`retCode ${json.retCode}: ${json.retMsg}`);
      }
      return json.result?.list ?? [];
    } catch (err) {
      lastErr = err;
      // Don't retry clear "invalid symbol" style errors — they won't recover.
      if (String(err.message).startsWith("retCode")) throw err;
      const backoff = 500 * 2 ** attempt;
      await sleep(backoff);
    }
  }
  throw lastErr;
}

/** Probe which category a symbol lives in (spot first, then linear). */
async function detectCategory(symbol) {
  if (CATEGORY !== "auto") return { category: CATEGORY };
  const now = Date.now();
  let reachedApi = false;
  let lastErr;
  for (const category of ["spot", "linear", "inverse"]) {
    try {
      const list = await fetchKline({
        category,
        symbol,
        interval: INTERVAL,
        start: now - 60 * 60 * 1000,
        end: now,
        limit: 1,
      });
      reachedApi = true; // a valid JSON response came back
      if (list.length > 0) return { category };
    } catch (err) {
      // retCode errors mean we reached the API (symbol invalid for that category);
      // anything else (DNS, TLS, 403 proxy, timeout) is a connectivity problem.
      if (String(err.message).startsWith("retCode")) reachedApi = true;
      lastErr = err;
    }
  }
  // Distinguish "API reachable but symbol absent" from "couldn't reach the API".
  if (!reachedApi) {
    throw new Error(`cannot reach ${BASE} (${lastErr?.message ?? "network error"})`);
  }
  return { category: null };
}

/**
 * Page backwards through the [start, end] window collecting every candle.
 * Bybit returns candles newest-first, up to `limit` per call, so we walk the
 * `end` cursor down to `start`.
 */
async function downloadSymbol(symbol, startMs, endMs) {
  const { category } = await detectCategory(symbol);
  if (!category) {
    console.warn(`\n  ✗ ${symbol}: not found on spot/linear/inverse — skipping`);
    return null;
  }

  const byTime = new Map(); // startTime(ms) -> row, dedupes overlapping pages
  let cursorEnd = endMs;
  let requests = 0;

  while (cursorEnd > startMs) {
    const list = await fetchKline({
      category,
      symbol,
      interval: INTERVAL,
      start: startMs,
      end: cursorEnd,
      limit: BYBIT_MAX_LIMIT,
    });
    requests++;
    if (list.length === 0) break;

    let oldest = Infinity;
    for (const row of list) {
      const t = Number(row[0]);
      if (t >= startMs && t <= endMs) byTime.set(t, row);
      if (t < oldest) oldest = t;
    }

    // Fewer than a full page means we've reached the start of available history.
    if (list.length < BYBIT_MAX_LIMIT) break;
    if (oldest <= startMs) break;
    cursorEnd = oldest - 1;

    await sleep(120); // stay well under Bybit's public rate limit
  }

  const rows = [...byTime.values()].sort((a, b) => Number(a[0]) - Number(b[0]));
  return { category, requests, rows };
}

/** Map raw Bybit kline rows ([start, o, h, l, c, v, turnover]) to a typed table. */
function toTable(rows) {
  return rows.map((r) => {
    const t = Number(r[0]);
    return [t, new Date(t).toISOString(), +r[1], +r[2], +r[3], +r[4], +r[5], +r[6]];
  });
}

function toCsv(table) {
  const lines = table.map((r) => r.join(","));
  return [HEADER.join(","), ...lines].join("\n") + "\n";
}

async function main() {
  const endMs = Date.now();
  const startMs = endMs - DAYS * 24 * 60 * 60 * 1000;

  console.log(
    `Bybit OHLCV downloader\n` +
      `  base=${BASE}  category=${CATEGORY}  interval=${INTERVAL}m  days=${DAYS}  format=${FORMAT}\n` +
      `  window: ${new Date(startMs).toISOString()} -> ${new Date(endMs).toISOString()}\n` +
      `  symbols: ${SYMBOLS.join(", ")}\n`,
  );

  const summary = [];
  for (const symbol of SYMBOLS) {
    process.stdout.write(`• ${symbol} … `);
    try {
      const result = await downloadSymbol(symbol, startMs, endMs);
      if (!result) {
        summary.push({ symbol, status: "not found" });
        continue;
      }
      const { category, requests, rows } = result;
      const table = toTable(rows);
      const base = join(OUT_DIR, `${symbol}_${INTERVAL}m`);
      await mkdir(dirname(base), { recursive: true });

      const written = [];
      if (FORMAT === "csv" || FORMAT === "both") {
        await writeFile(`${base}.csv`, toCsv(table));
        written.push(`${base}.csv`);
      }
      if (FORMAT === "xlsx" || FORMAT === "both") {
        await writeXlsx(`${base}.xlsx`, {
          sheetName: `${symbol}_${INTERVAL}m`,
          header: HEADER,
          rows: table,
        });
        written.push(`${base}.xlsx`);
      }

      const first = table[0] ? table[0][1] : "-";
      const last = table.length ? table.at(-1)[1] : "-";
      console.log(
        `${rows.length} candles [${category}] via ${requests} req -> ${written.join(", ")}\n` +
          `    range ${first} … ${last}`,
      );
      summary.push({ symbol, category, candles: rows.length, files: written.join(", ") });
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      summary.push({ symbol, status: `error: ${err.message}` });
    }
  }

  console.log("\nDone.");
  console.table(summary);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exitCode = 1;
});
