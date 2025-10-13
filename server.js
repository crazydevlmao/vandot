// server.js
// Node 18+ required (uses built-in fetch)
const express = require("express");
const app = express();

const PORT = process.env.PORT || 3001;

// ==== EDIT THESE TWO LINES ====
const TOKEN_MINT = "0xYourBnbTokenAddressHere"; // <-- paste your BEP-20 contract
const SUPPLY = 1_000_000_000;                   // <-- total token supply (raw, not adjusted)
// ==============================

// ✅ Your paid Birdeye API key
const BIRDEYE_API_KEY = "c9d5e2f71899433fa32469947e2ac7ab";

// ✅ use BNB chain endpoint
const BIRDEYE_URL = `https://public-api.birdeye.so/defi/price?address=${TOKEN_MINT}&chain=BNB&include_liquidity=true`;

let cache = {
  ok: false,
  price: null,
  marketCap: null,
  fetchedAt: 0,
  error: null,
};

async function pollBirdEye() {
  try {
    const res = await fetch(BIRDEYE_URL, {
      headers: {
        "X-API-KEY": BIRDEYE_API_KEY,
        "accept": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Birdeye API HTTP ${res.status}`);
    }

    const json = await res.json();
    const tokenPrice = json?.data?.value;

    if (!tokenPrice || isNaN(tokenPrice)) {
      throw new Error("Invalid price in BirdEye response");
    }

    const marketCap = Number(tokenPrice) * SUPPLY;

    cache = {
      ok: true,
      price: Number(tokenPrice),
      marketCap,
      fetchedAt: Date.now(),
      error: null,
    };

    // console.log(`[OK] ${new Date().toISOString()} price=${tokenPrice} mcap=${marketCap}`);
  } catch (err) {
    cache = { ...cache, ok: false, error: String(err) };
    console.error(`[ERR] ${new Date().toISOString()} BirdEye poll error:`, err.message);
  }
}

// Initial poll then every 3 seconds
pollBirdEye();
setInterval(pollBirdEye, 3000);

// Allow any origin (for frontend requests)
app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// API endpoints
app.get("/api/marketcap", (_, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(cache);
});

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
