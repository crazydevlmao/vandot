// server.js
// Node 18+ required (uses built-in fetch)
const express = require("express");
const app = express();

const PORT = process.env.PORT || 3001;

/**
 * EDIT THESE TWO CONSTANTS
 * TOKEN_MINT:  your BEP-20 (BSC) contract, 0x... (40 hex chars)
 * SUPPLY:      total supply in *raw* tokens (not decimals-adjusted)
 */
const TOKEN_MINT = "0x60445b34c6834e1b775c4bd8789d7cbf5adf4444";
const SUPPLY = 1_000_000_000;

// Your Birdeye API key (kept inline as requested)
const BIRDEYE_API_KEY = "c9d5e2f71899433fa32469947e2ac7ab";

// Birdeye EVM (BSC) price endpoint (v1)
const makePriceUrl = (addr) =>
  `https://public-api.birdeye.so/defi/price?address=${addr}&chain=bsc&include_liquidity=true`;

// Basic EVM address validator (checksum not required for API, but length/hex matters)
function isValidEvmAddress(addr) {
  return typeof addr === "string" && /^0x[0-9a-fA-F]{40}$/.test(addr);
}

let cache = {
  ok: false,
  price: null,
  marketCap: null,
  fetchedAt: 0,
  error: null,
  _lastStatus: null,
  _lastBody: null,
};

async function pollBirdeyeOnce() {
  if (!isValidEvmAddress(TOKEN_MINT)) {
    cache = {
      ...cache,
      ok: false,
      error: "Invalid EVM address format for TOKEN_MINT",
      fetchedAt: Date.now(),
    };
    console.error(
      `[ERR] ${new Date().toISOString()} Birdeye poll: invalid address format (${TOKEN_MINT})`
    );
    return;
  }

  const url = makePriceUrl(TOKEN_MINT);
  try {
    const res = await fetch(url, {
      headers: {
        "X-API-KEY": BIRDEYE_API_KEY,
        accept: "application/json",
      },
    });

    const text = await res.text(); // capture exact body for debugging
    cache._lastStatus = res.status;
    cache._lastBody = text;

    if (!res.ok) {
      // Common cases: 400 "address is invalid format" or 404 "Not found"
      throw new Error(`[price:bsc] HTTP ${res.status} | ${text}`);
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON response from Birdeye: ${text?.slice(0, 200)}`);
    }

    const tokenPrice = json?.data?.value;
    if (tokenPrice == null || isNaN(Number(tokenPrice))) {
      throw new Error(`Missing/invalid price in response: ${text?.slice(0, 200)}`);
    }

    const priceNum = Number(tokenPrice);
    const marketCap = priceNum * SUPPLY;

    cache = {
      ok: true,
      price: priceNum,
      marketCap,
      fetchedAt: Date.now(),
      error: null,
      _lastStatus: res.status,
      _lastBody: text,
    };

    // console.log(`[OK] ${new Date().toISOString()} price=${priceNum} mcap=${marketCap}`);
  } catch (err) {
    // Keep last good values but surface error state
    cache = {
      ...cache,
      ok: false,
      error: String(err?.message || err),
      fetchedAt: Date.now(),
    };
    console.error(`[ERR] ${new Date().toISOString()} Birdeye poll: ${cache.error}`);
  }
}

// Initial poll, then every 5s (matches your frontend countdown)
pollBirdeyeOnce();
setInterval(pollBirdeyeOnce, 5000);

// CORS (frontend polls us)
app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// Public endpoints
app.get("/api/marketcap", (_, res) => {
  res.setHeader("Cache-Control", "no-store");
  // Only expose the fields the frontend needs
  res.json({
    ok: cache.ok,
    price: cache.price,
    marketCap: cache.marketCap,
    fetchedAt: cache.fetchedAt,
    error: cache.error,
  });
});

app.get("/api/health", (_, res) => {
  res.json({
    running: true,
    fetchedAt: cache.fetchedAt,
    ok: cache.ok,
    lastError: cache.error,
    birdeyeStatus: cache._lastStatus,
    birdeyeBodyPreview: cache._lastBody?.slice(0, 200),
  });
});

app.listen(PORT, () => {
  console.log(`✅ Cache server listening on http://localhost:${PORT}`);
});
