// server.js
// Node 18+ required (uses built-in fetch)
const express = require("express");
const app = express();

const PORT = process.env.PORT || 3001;

/** ── EDIT THESE TWO ───────────────────────────────────────────── **/
const TOKEN_MINT = "0x60445b34c6834e1b775c4bd8789d7cbf5adf4444"; // your BEP-20 contract
const SUPPLY = 1_000_000_000;                                     // total token supply (1 token units)
/** ─────────────────────────────────────────────────────────────── **/

// Your Birdeye API key (hardcoded by request)
const BIRDEYE_API_KEY = "c9d5e2f71899433fa32469947e2ac7ab";

// Birdeye EVM price endpoint (BNB chain)
const PRICE_URL = `https://public-api.birdeye.so/defi/evm/price?address=${TOKEN_MINT}&chain=bsc`;
// (Alt multi-price, kept as fallback if you ever need it)
// const MULTI_URL = `https://public-api.birdeye.so/defi/evm/multi_price?chain=bsc&list_address=${encodeURIComponent(TOKEN_MINT)}`;

const POLL_MS = 5000; // match the frontend 5s timer

let cache = {
  ok: false,
  price: null,
  marketCap: null,
  fetchedAt: 0,
  error: null,
};

// Basic 0x address sanity check (Birdeye will 400 on bad format)
const EVM_ADDR_RE = /^0x[a-fA-F0-9]{40}$/;
if (!EVM_ADDR_RE.test(TOKEN_MINT)) {
  console.error(
    `[FATAL] TOKEN_MINT is not a valid EVM address: ${TOKEN_MINT}. ` +
    `Must match ${EVM_ADDR_RE}`
  );
}

async function fetchBirdeyePrice() {
  const headers = {
    "X-API-KEY": BIRDEYE_API_KEY,
    accept: "application/json",
  };

  // Try the EVM price endpoint
  const res = await fetch(PRICE_URL, { headers });
  const bodyText = await res.text();
  let json;
  try { json = bodyText ? JSON.parse(bodyText) : {}; } catch { json = {}; }

  if (!res.ok) {
    throw new Error(
      `[price:bsc] HTTP ${res.status} | ${bodyText || "(no body)"}`
    );
  }

  // Expect: { success: true, data: { value: <number>, ... } }
  const price = json?.data?.value;
  if (!(typeof price === "number") || !isFinite(price) || price <= 0) {
    throw new Error(
      `Birdeye returned no/invalid price: ${JSON.stringify(json)}`
    );
  }
  return price;
}

async function poll() {
  try {
    if (!EVM_ADDR_RE.test(TOKEN_MINT)) {
      throw new Error("Configured TOKEN_MINT fails EVM address regex");
    }

    const price = await fetchBirdeyePrice();
    const marketCap = price * SUPPLY;

    cache = {
      ok: true,
      price,
      marketCap,
      fetchedAt: Date.now(),
      error: null,
    };

    // console.log(`[OK] ${new Date().toISOString()} price=${price} mcap=${marketCap}`);
  } catch (err) {
    cache = { ...cache, ok: false, error: String(err) };
    console.error(`[ERR] ${new Date().toISOString()} Birdeye poll: ${err.message}`);
  }
}

// Initial poll then every 5s
poll();
setInterval(poll, POLL_MS);

// Allow any origin (frontend fetch)
app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// API: marketcap
app.get("/api/marketcap", (_, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(cache);
});

// API: health
app.get("/api/health", (_, res) => {
  res.json({
    running: true,
    fetchedAt: cache.fetchedAt,
    ok: cache.ok,
    lastError: cache.error,
  });
});

app.listen(PORT, () => {
  console.log(`✅ Cache server listening on http://localhost:${PORT}`);
});
