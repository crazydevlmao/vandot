// server.js
import express from "express";
const app = express();

const PORT = process.env.PORT || 3001;

// === CONFIG ===
const TOKEN_MINT = "0x11f6a5fbbd2cc1726ae048e95f37b294b3e34444";
const SUPPLY = 1_000_000_000;
const BIRDEYE_API_KEY = "c9d5e2f71899433fa32469947e2ac7ab";

// === EVM ENDPOINT ===
const makePriceUrl = (addr) =>
  `https://public-api.birdeye.so/defi/price?address=${addr}&include_liquidity=true&_t=${Date.now()}`;

let cache = {
  ok: false,
  price: null,
  marketCap: null,
  liquidity: null,
  fetchedAt: 0,
  error: null,
  _lastStatus: null,
  _lastBody: null,
  _lastRemote: null,
};

// === POLLING LOOP ===
async function pollBirdeyeOnce() {
  const url = makePriceUrl(TOKEN_MINT);

  try {
    const res = await fetch(url, {
      headers: {
        "X-API-KEY": BIRDEYE_API_KEY,
        "X-CHAIN": "bsc",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
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

    // detect if Birdeye returned stale data
    if (cache._lastRemote === data.updateUnixTime) {
      console.log(`[SKIP] same remote timestamp ${data.updateHumanTime}`);
      return;
    }
    cache._lastRemote = data.updateUnixTime;

    cache = {
      ok: true,
      price: priceNum,
      marketCap,
      liquidity,
      fetchedAt: Date.now(),
      error: null,
      _lastStatus: res.status,
      _lastBody: text,
      _lastRemote: data.updateUnixTime,
    };

    console.log(
      `[OK] ${new Date().toISOString()} | price=${priceNum.toFixed(10)} | mcap=${marketCap.toFixed(
        2
      )} | liq=${liquidity.toFixed(2)} | updated=${data.updateHumanTime}`
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

// === START POLLING EVERY 5 SECONDS ===
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
    lastRemoteUpdate: cache._lastRemote,
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
