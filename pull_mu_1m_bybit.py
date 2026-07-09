#!/usr/bin/env python3
"""Pull 1-minute (1m) candlestick data for MU from Bybit and save it to CSV.

Uses Bybit's public v5 market kline endpoint (no API key required):
    GET https://api.bybit.com/v5/market/kline

The endpoint returns at most 1000 candles per request, newest first, as
[startTime, open, high, low, close, volume, turnover]. This script paginates
backwards in time until it has collected the requested number of bars (or has
covered the requested date range), then writes them oldest-first to a CSV.

Examples
--------
    # Last day (1440 bars) of MU 1-minute spot candles -> mu_1m_bybit.csv
    python pull_mu_1m_bybit.py

    # Last 5000 bars of a linear perpetual, custom output file
    python pull_mu_1m_bybit.py --category linear --bars 5000 -o mu.csv

    # An explicit UTC date range
    python pull_mu_1m_bybit.py --start 2026-07-01 --end 2026-07-02
"""

from __future__ import annotations

import argparse
import csv
import sys
import time
from datetime import datetime, timezone

import requests

# Primary host plus official mirrors, tried in order if one is unreachable.
BYBIT_HOSTS = (
    "https://api.bybit.com",
    "https://api.bytick.com",
)
KLINE_PATH = "/v5/market/kline"
MAX_LIMIT = 1000            # Bybit hard cap on candles per request
INTERVAL = "1"             # 1-minute candles
MINUTE_MS = 60_000

COLUMNS = [
    "timestamp_ms",
    "datetime_utc",
    "open",
    "high",
    "low",
    "close",
    "volume",
    "turnover",
]


def parse_dt(value: str) -> int:
    """Parse a UTC date/datetime string into epoch milliseconds."""
    value = value.strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(value, fmt).replace(tzinfo=timezone.utc)
            return int(dt.timestamp() * 1000)
        except ValueError:
            continue
    raise argparse.ArgumentTypeError(
        f"Unrecognized date/time: {value!r} (use e.g. 2026-07-01 or "
        "'2026-07-01 09:30:00')"
    )


def fetch_page(
    session: requests.Session,
    *,
    category: str,
    symbol: str,
    start: int | None,
    end: int | None,
    limit: int,
    timeout: float,
    retries: int,
) -> list[list[str]]:
    """Fetch a single kline page, trying each host and retrying transient errors."""
    params = {
        "category": category,
        "symbol": symbol,
        "interval": INTERVAL,
        "limit": limit,
    }
    if start is not None:
        params["start"] = start
    if end is not None:
        params["end"] = end

    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        for host in BYBIT_HOSTS:
            url = host + KLINE_PATH
            try:
                resp = session.get(url, params=params, timeout=timeout)
                resp.raise_for_status()
                payload = resp.json()
            except requests.RequestException as exc:
                last_error = exc
                continue

            ret_code = payload.get("retCode")
            if ret_code != 0:
                # A non-zero retCode is an API-level error (bad symbol,
                # category, etc.) -- retrying won't help, so fail fast.
                raise RuntimeError(
                    f"Bybit API error retCode={ret_code}: "
                    f"{payload.get('retMsg')!r} "
                    f"(symbol={symbol}, category={category})"
                )
            return payload.get("result", {}).get("list", []) or []

        # All hosts failed this attempt -> back off and retry.
        if attempt < retries:
            backoff = 2 ** (attempt - 1)
            print(
                f"  request failed ({last_error}); retry {attempt}/{retries - 1} "
                f"in {backoff}s",
                file=sys.stderr,
            )
            time.sleep(backoff)

    raise ConnectionError(
        f"Could not reach Bybit ({', '.join(BYBIT_HOSTS)}) after {retries} "
        f"attempts. Last error: {last_error}"
    )


def pull_klines(
    *,
    category: str,
    symbol: str,
    start: int | None,
    end: int | None,
    bars: int,
    timeout: float,
    retries: int,
) -> list[list]:
    """Collect 1-minute klines, paginating backwards. Returns rows oldest-first.

    Each returned row is [ts_ms, datetime_utc, open, high, low, close,
    volume, turnover].
    """
    session = requests.Session()
    session.headers.update({"User-Agent": "TradeSarthi-bybit-1m-puller/1.0"})

    # De-duplicate by candle start time; Bybit ranges can overlap at edges.
    collected: dict[int, list] = {}
    # When a date range is given we page until we pass `start`; otherwise we
    # page until we have `bars` candles.
    cursor_end = end
    lower_bound = start

    while True:
        page = fetch_page(
            session,
            category=category,
            symbol=symbol,
            start=lower_bound,
            end=cursor_end,
            limit=MAX_LIMIT,
            timeout=timeout,
            retries=retries,
        )
        if not page:
            break

        for row in page:
            ts = int(row[0])
            if lower_bound is not None and ts < lower_bound:
                continue
            iso = datetime.fromtimestamp(ts / 1000, tz=timezone.utc).strftime(
                "%Y-%m-%d %H:%M:%S"
            )
            collected[ts] = [
                ts, iso, row[1], row[2], row[3], row[4], row[5], row[6]
            ]

        oldest_ts = min(int(r[0]) for r in page)

        # Stop conditions.
        if lower_bound is not None:
            if oldest_ts <= lower_bound:
                break
        elif len(collected) >= bars:
            break

        # Page one minute older than the oldest candle we just saw.
        next_end = oldest_ts - MINUTE_MS
        if cursor_end is not None and next_end >= cursor_end:
            break  # no forward progress -> avoid an infinite loop
        cursor_end = next_end

        # Fewer than a full page means we've hit the start of history.
        if len(page) < MAX_LIMIT:
            break

    rows = [collected[ts] for ts in sorted(collected)]
    if lower_bound is None and len(rows) > bars:
        rows = rows[-bars:]  # trim to the newest `bars` candles
    return rows


def write_csv(rows: list[list], path: str) -> None:
    with open(path, "w", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(COLUMNS)
        writer.writerows(rows)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Pull 1-minute candlestick data for MU (or any symbol) "
        "from Bybit into a CSV file.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--symbol", default="MUUSDT",
        help="Bybit trading symbol (e.g. MUUSDT).",
    )
    parser.add_argument(
        "--category", default="spot", choices=["spot", "linear", "inverse"],
        help="Bybit market category.",
    )
    parser.add_argument(
        "--bars", type=int, default=1440,
        help="Number of 1-minute candles to fetch (ignored if --start given).",
    )
    parser.add_argument(
        "--start", type=parse_dt, default=None,
        help="Start of range in UTC (e.g. 2026-07-01 or '2026-07-01 09:30:00').",
    )
    parser.add_argument(
        "--end", type=parse_dt, default=None,
        help="End of range in UTC. Defaults to now.",
    )
    parser.add_argument(
        "-o", "--output", default="mu_1m_bybit.csv",
        help="Output CSV file path.",
    )
    parser.add_argument(
        "--timeout", type=float, default=20.0,
        help="Per-request timeout in seconds.",
    )
    parser.add_argument(
        "--retries", type=int, default=4,
        help="Number of attempts per page before giving up.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    if args.start is not None and args.end is not None and args.end <= args.start:
        print("error: --end must be after --start", file=sys.stderr)
        return 2

    target = (
        f"range {args.start}..{args.end or 'now'} (ms)"
        if args.start is not None
        else f"{args.bars} bars"
    )
    print(
        f"Pulling 1m {args.symbol} klines from Bybit "
        f"[category={args.category}, {target}] ..."
    )

    try:
        rows = pull_klines(
            category=args.category,
            symbol=args.symbol,
            start=args.start,
            end=args.end,
            bars=args.bars,
            timeout=args.timeout,
            retries=args.retries,
        )
    except (ConnectionError, RuntimeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    if not rows:
        print(
            f"No candles returned for {args.symbol} ({args.category}). "
            "Double-check the symbol/category on Bybit.",
            file=sys.stderr,
        )
        return 1

    write_csv(rows, args.output)
    print(
        f"Saved {len(rows)} candles to {args.output}\n"
        f"  first: {rows[0][1]} UTC  close={rows[0][5]}\n"
        f"  last:  {rows[-1][1]} UTC  close={rows[-1][5]}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
