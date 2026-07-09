# Data scripts

## `download-bybit-ohlcv.mjs`

Downloads historical OHLCV candles from Bybit's **public** market-data API
(`/v5/market/kline`). Zero dependencies — just Node 18+ (uses the built-in
global `fetch`; Excel output uses a small self-contained `.xlsx` writer in
`lib/xlsx.mjs`, no npm install required).

### Quick start

```bash
# Defaults: 1-minute candles, last 60 days, for LAB/SLX/VINE/ETH/BTC USDT.
npm run download:bybit
# or directly:
node scripts/download-bybit-ohlcv.mjs
```

By default each symbol is written to both an Excel file and a CSV under
`data/bybit/` — `<SYMBOL>_<INTERVAL>m.xlsx` and `<SYMBOL>_<INTERVAL>m.csv`
(use `--format xlsx` or `--format csv` for just one). Columns:

```
timestamp,datetime,open,high,low,close,volume,turnover
```

`timestamp` is the candle open time in Unix milliseconds; `datetime` is the same
instant as ISO-8601 UTC. In the `.xlsx`, numeric columns are real numbers.

### Options

| Flag         | Default                                      | Notes |
|--------------|----------------------------------------------|-------|
| `--symbols`  | `LABUSDT,SLXUSDT,VINEUSDT,ETHUSDT,BTCUSDT`   | Comma-separated |
| `--days`     | `60`                                         | Look-back window |
| `--interval` | `1`                                          | Bybit interval: `1,3,5,15,30,60,120,240,360,720,D,W,M` |
| `--category` | `auto`                                       | `auto` probes `spot` → `linear` → `inverse`; or force `spot`/`linear`/`inverse` |
| `--format`   | `both`                                       | `xlsx`, `csv`, or `both` |
| `--out`      | `data/bybit`                                 | Output directory |
| `--base`     | `https://api.bybit.com`                      | Use `https://api.bytick.com` if the primary host is blocked |

Examples:

```bash
node scripts/download-bybit-ohlcv.mjs --symbols BTCUSDT,ETHUSDT --days 30
node scripts/download-bybit-ohlcv.mjs --category linear --interval 5 --out data/perps
node scripts/download-bybit-ohlcv.mjs --base https://api.bytick.com
```

### Notes

- 60 days of 1-minute data is ~86,400 candles per symbol. Bybit caps each
  request at 1000 candles, so the script pages backwards through the window
  (~87 requests/symbol) with a short delay to stay under the public rate limit.
- `auto` category detection means you don't need to know whether a symbol trades
  on spot or as a USDT perpetual — it tries spot first, then linear.
- Requires unrestricted outbound access to `api.bybit.com`. Sandboxed/corporate
  networks (and Claude Code's cloud sandbox) may block it — if you see
  `cannot reach https://api.bybit.com`, run it from an unrestricted machine or
  point `--base` at the `api.bytick.com` mirror.
