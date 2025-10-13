// server.js
// Node 18+ required (uses built-in fetch)
const express = require("express");
const app = express();

const PORT = 3001; // fixed port; change if you need

// ==== EDIT THESE TWO LINES (hard-coded) ====
const TOKEN_MINT = "0x60445b34c6834e1b775c4bd8789d7cbf5adf4444"; // <-- paste your BEP-20 contract here
const SUPPLY = 1_000_000_000;                    // <-- total token supply (raw units, not decimals-adjusted)
// ===========================================

// Birdeye API key (hard-coded as requested)
const BIRDEYE_API_KEY = "c9d5e2f71899433fa32469947e2ac7ab";

// Birdeye BNB chain price endpoint for EVM token
const BIRDEYE_URL = `https://public-api.birdeye.so/defi/price?address=${TOKEN_MINT}&chain=BNB&include_liquidity=true`;

// Poll every 5 seconds to match the UI timer
const POLL_MS = 5000;

// In-memory cache served to the frontend
let cache = {
  ok: false,
  price: null,
  marketCap: null,
  fetchedAt: 0,
  error: null,
};

async function pollBirdeye() {
  try {
    const res = await fetch(BIRDEYE_URL, {
      headers: {
        "X-API-KEY": BIRDEYE_API_KEY,
        "accept": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Birdeye HTTP ${res.status}`);
    }

    const json = await res.json();
    // Expect { data: { value: number } }
    const tokenPrice = Number(json?.data?.value);

    if (!Number.isFinite(tokenPrice) || tokenPrice <= 0) {
      throw new Error("Invalid or missing price in Birdeye response");
    }

    const marketCap = tokenPrice * SUPPLY;

    cache = {
      ok: true,
      price: tokenPrice,
      marketCap,
      fetchedAt: Date.now(),
      error: null,
    };

    // console.log(`[OK] ${new Date().toISOString()} price=${tokenPrice} mcap=${marketCap}`);
  } catch (err) {
    cache = {
      ...cache,
      ok: false,
      error: String(err?.message || err),
    };
    console.error(`[ERR] ${new Date().toISOString()} Birdeye poll:`, err?.message || err);
  }
}

// Prime immediately, then every 5s
pollBirdeye();
setInterval(pollBirdeye, POLL_MS);

// CORS + no-store (frontend fetches every 5s)
app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Data endpoints
app.get("/api/marketcap", (_, res) => {
  res.json(cache);
});

app.get("/api/health", (_, res) => {
  res.json({
    running: true,
    token: TOKEN_MINT,
    supply: SUPPLY,
    fetchedAt: cache.fetchedAt,
    ok: cache.ok,
    lastError: cache.error,
  });
});

app.listen(PORT, () => {
  console.log(`✅ Cache server listening on http://localhost:${PORT}`);
  console.log(`   TOKEN_MINT=${TOKEN_MINT}`);
  console.log(`   SUPPLY=${SUPPLY.toLocaleString()}`);
  console.log(`   POLL_MS=${POLL_MS}ms`);
});
