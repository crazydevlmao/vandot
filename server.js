// server.js
import express from "express";
const app = express();

const PORT = process.env.PORT || 3001;

// === CONFIG ===
const TOKEN_MINT = "0x60445b34c6834e1b775c4bd8789d7cbf5adf4444";
const SUPPLY = 1_000_000_000;
const BIRDEYE_API_KEY = "c9d5e2f71899433fa32469947e2ac7ab";

// === WORKING EVM ENDPOINT ===
const makePriceUrl = (addr) =>
  `https://public-api.birdeye.so/defi/price?address=${addr}&include_liquidity=true`;

let cache = {
  ok: false,
  price: null,
  marketCap: null,
  liquidity: null,
  fetchedAt: 0,
  error: null,
  _lastStatus: null,
  _lastBody: null,
};

async function pollBirdeyeOnce() {
  const url = makePriceUrl(TOKEN_MINT);
  try {
    const res = await fetch(url, {
      headers: {
        "X-API-KEY": BIRDEYE_API_KEY,
        "X-CHAIN": "bsc",
        accept: "application/json",
      },
    });

    const text = await res.text();
    cache._lastStatus = res.status;
    cache._lastBody = text;

    if (!res.ok) throw new Error(`[price:bsc] HTTP ${res.status} | ${text}`);

    const json = JSON.parse(text);
    const data = json?.data;

    if (!data?.value) throw new Error("Missing price data");

    const priceNum = Number(data.value);
    const liquidity = Number(data.liquidity ?? 0);
    const marketCap = priceNum * SUPPLY;

    cache = {
      ok: true,
      price: priceNum,
      marketCap,
      liquidity,
      fetchedAt: Date.now(),
      error: null,
      _lastStatus: res.status,
      _lastBody: text,
    };

    console.log(
      `[OK] ${new Date().toISOString()} price=${priceNum} mcap=${marketCap} liq=${liquidity}`
    );
  } catch (err) {
    cache = {
      ...cache,
      ok: false,
      error: String(err?.message || err),
      fetchedAt: Date.now(),
    };
    console.error(`[ERR] ${new Date().toISOString()} Birdeye poll: ${cache.error}`);
  }
}

pollBirdeyeOnce();
setInterval(pollBirdeyeOnce, 5000);

// === EXPRESS API ===
app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/api/marketcap", (_, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({
    ok: cache.ok,
    price: cache.price,
    marketCap: cache.marketCap,
    liquidity: cache.liquidity,
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
  console.log(`✅ MarketCap cache server running at http://localhost:${PORT}`);
});
