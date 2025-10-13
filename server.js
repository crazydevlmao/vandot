// server.js
// Node 18+ required (built-in fetch)
const express = require("express");
const app = express();

const PORT = process.env.PORT || 3001;

// ==== SET THESE TWO LINES ====
const TOKEN_MINT = "0x60445b34c6834e1b775c4bd8789d7cbf5adf4444"; // <-- BEP-20 contract (lowercase or checksum OK)
const SUPPLY = 1_000_000_000;                   // <-- total token supply (raw, whole tokens)
// ============================

// ✅ Your Birdeye API key (kept inline per your preference)
const BIRDEYE_API_KEY = "c9d5e2f71899433fa32469947e2ac7ab";

// Poll interval to match the frontend countdown
const POLL_MS = 5000;

let cache = {
  ok: false,
  price: null,
  marketCap: null,
  fetchedAt: 0,
  error: null,
  lastSource: null, // which endpoint/chain worked
};

// Helper: fetch JSON (and return { ok, status, json, text })
async function fetchJson(url, init = {}) {
  const res = await fetch(url, init);
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const json = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, json, text: null };
  } else {
    const text = await res.text().catch(() => null);
    return { ok: res.ok, status: res.status, json: null, text };
  }
}

/**
 * Try Birdeye in a resilient way:
 * - Endpoints tried in order: /defi/price, /defi/multi_price
 * - Chains tried: 'bsc', 'BNB'
 * Returns { price, source } or throws with full error details.
 */
async function queryBirdeyePrice(address) {
  const headers = {
    "X-API-KEY": BIRDEYE_API_KEY,
    accept: "application/json",
  };

  const chains = ["bsc", "BNB"];
  const tries = [];

  for (const chain of chains) {
    // 1) /defi/price (single)
    tries.push({
      url: `https://public-api.birdeye.so/defi/price?address=${encodeURIComponent(
        address
      )}&chain=${chain}&include_liquidity=true`,
      parse: (payload) => payload?.data?.value,
      source: `price:${chain}`,
    });

    // 2) /defi/multi_price (batch)
    tries.push({
      url: `https://public-api.birdeye.so/defi/multi_price?chain=${chain}&addresses=${encodeURIComponent(
        address
      )}`,
      parse: (payload) => {
        // multi_price returns { data: { [address]: { value } } }
        const key = Object.keys(payload?.data || {})[0];
        return key ? payload.data[key]?.value : undefined;
      },
      source: `multi_price:${chain}`,
    });
  }

  const errors = [];

  for (const t of tries) {
    const r = await fetchJson(t.url, { headers });
    if (!r.ok) {
      errors.push(
        `[${t.source}] HTTP ${r.status} ${r.text ? `| ${r.text}` : ""} ${
          r.json ? `| ${JSON.stringify(r.json)}` : ""
        }`
      );
      continue;
    }
    try {
      const price = Number(t.parse(r.json));
      if (!price || Number.isNaN(price)) {
        errors.push(
          `[${t.source}] Invalid price in response ${JSON.stringify(r.json)}`
        );
        continue;
      }
      return { price, source: t.source };
    } catch (e) {
      errors.push(`[${t.source}] Parse error: ${String(e)}`);
    }
  }

  // If we got here, all tries failed
  throw new Error(errors.join("\n"));
}

async function poll() {
  try {
    const { price, source } = await queryBirdeyePrice(TOKEN_MINT);
    const marketCap = price * SUPPLY;

    cache = {
      ok: true,
      price,
      marketCap,
      fetchedAt: Date.now(),
      error: null,
      lastSource: source,
    };
    // console.log(`[OK] ${new Date().toISOString()} ${source} price=${price} mcap=${marketCap}`);
  } catch (err) {
    cache = { ...cache, ok: false, error: String(err) };
    console.error(`[ERR] ${new Date().toISOString()} Birdeye poll:`, err.message);
  }
}

// Kick off and poll every 5s
poll();
setInterval(poll, POLL_MS);

// CORS for the frontend
app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// Endpoints
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
    lastSource: cache.lastSource,
  });
});

app.listen(PORT, () => {
  console.log(`✅ Cache server listening on http://localhost:${PORT}`);
});
