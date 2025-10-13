// server.js
// Node 18+ required (global fetch)
const express = require("express");
const app = express();

const PORT = process.env.PORT || 3001;

// ==== EDIT THESE TWO LINES ====
const TOKEN_MINT = "0x60445b34c6834e1b775c4bd8789d7cbf5adf4444"; // <-- paste BEP-20 contract (0x + 40 hex)
const SUPPLY = 1_000_000_000;                   // <-- total token supply (raw, not adjusted)
// ==============================

// ✅ Your Birdeye API key (kept inline per your request)
const BIRDEYE_API_KEY = "c9d5e2f71899433fa32469947e2ac7ab";

// ✅ Use EVM endpoint + BSC chain (not the Solana one)
const CHAIN = "bsc"; // Birdeye uses "bsc" for BNB Smart Chain
const PRICE_URL = (address) =>
  `https://public-api.birdeye.so/defi/evm/price?address=${address}&chain=${CHAIN}&include_liquidity=true`;

let cache = {
  ok: false,
  price: null,        // USD
  marketCap: null,    // USD
  fetchedAt: 0,
  error: null,
};

function isValidEvmAddress(addr) {
  return typeof addr === "string" && /^0x[a-fA-F0-9]{40}$/.test(addr.trim());
}

async function pollBirdeye() {
  try {
    if (!isValidEvmAddress(TOKEN_MINT)) {
      throw new Error("TOKEN_MINT is not a valid 0x EVM address");
    }

    const url = PRICE_URL(TOKEN_MINT);
    const res = await fetch(url, {
      headers: {
        "X-API-KEY": BIRDEYE_API_KEY,
        accept: "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`[price:${CHAIN}] HTTP ${res.status} | ${text}`);
    }

    const json = await res.json();
    // Birdeye EVM price response: json?.data?.value is USD price
    const tokenPriceUsd = Number(json?.data?.value);

    if (!Number.isFinite(tokenPriceUsd)) {
      throw new Error("Missing/invalid data.value in Birdeye response");
    }

    const marketCap = tokenPriceUsd * SUPPLY;

    cache = {
      ok: true,
      price: tokenPriceUsd,
      marketCap,
      fetchedAt: Date.now(),
      error: null,
    };
  } catch (err) {
    cache = { ...cache, ok: false, error: String(err), fetchedAt: Date.now() };
    console.error(`[ERR] ${new Date().toISOString()} Birdeye poll: ${err.message}`);
  }
}

// Initial poll, then every 5s
pollBirdeye();
setInterval(pollBirdeye, 5000);

// CORS for your frontend
app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

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
    token: TOKEN_MINT,
    chain: CHAIN,
  });
});

app.listen(PORT, () => {
  console.log(`✅ Cache server listening on http://localhost:${PORT}`);
});
