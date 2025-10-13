// server.js
// Node 18+ required (built-in fetch)
const express = require("express");
const app = express();

const PORT = process.env.PORT || 3001;

// ==== SET THESE TWO LINES ====
const TOKEN_MINT_RAW = "0x60445b34c6834e1b775c4bd8789d7cbf5adf4444"; // <-- paste BEP-20 contract
const SUPPLY = 1_000_000_000;                        // <-- total token supply (whole tokens)
// ============================

// Birdeye API key (inline per your request)
const BIRDEYE_API_KEY = "c9d5e2f71899433fa32469947e2ac7ab";

// Poll every 5s to match the frontend
const POLL_MS = 5000;

// --- Address normalization & validation ---
function normalizeAddress(addr) {
  if (typeof addr !== "string") throw new Error("TOKEN_MINT missing");
  const trimmed = addr.trim();
  // allow missing 0x but enforce hex length 40
  const with0x = trimmed.startsWith("0x") ? trimmed : "0x" + trimmed;
  const lower = with0x.toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(lower)) {
    throw new Error(
      `Invalid EVM address format: "${addr}". Expected 0x + 40 hex chars.`
    );
  }
  return lower;
}

const TOKEN_MINT = normalizeAddress(TOKEN_MINT_RAW);

let cache = {
  ok: false,
  price: null,
  marketCap: null,
  fetchedAt: 0,
  error: null,
  lastSource: null,
};

// Helper: fetch JSON with body/error capture
async function fetchJson(url, init = {}) {
  const res = await fetch(url, init);
  const ct = res.headers.get("content-type") || "";
  let body = null;
  try {
    body = ct.includes("application/json") ? await res.json() : await res.text();
  } catch {
    // ignore parse errors
  }
  return { ok: res.ok, status: res.status, body };
}

/**
 * Query Birdeye robustly.
 * - Tries chains: 'bsc', 'BNB'
 * - Endpoints: /defi/price (address=...) and /defi/multi_price (list_address=... or addresses=...)
 * Returns { price, source }
 */
async function queryBirdeyePrice(address) {
  const headers = {
    "X-API-KEY": BIRDEYE_API_KEY,
    accept: "application/json",
  };

  const chains = ["bsc", "BNB"];
  const errors = [];

  for (const chain of chains) {
    // 1) Single-price endpoint
    {
      const url = `https://public-api.birdeye.so/defi/price?address=${encodeURIComponent(
        address
      )}&chain=${chain}&include_liquidity=true`;
      const r = await fetchJson(url, { headers });
      if (r.ok) {
        const price = Number(r.body?.data?.value);
        if (price && !Number.isNaN(price)) {
          return { price, source: `price:${chain}` };
        }
        errors.push(`[price:${chain}] Invalid price ${JSON.stringify(r.body)}`);
      } else {
        errors.push(`[price:${chain}] HTTP ${r.status} | ${typeof r.body === "string" ? r.body : JSON.stringify(r.body)}`);
      }
    }

    // 2a) Batch endpoint with list_address
    {
      const url = `https://public-api.birdeye.so/defi/multi_price?chain=${chain}&list_address=${encodeURIComponent(
        address
      )}`;
      const r = await fetchJson(url, { headers });
      if (r.ok) {
        const data = r.body?.data || {};
        const firstKey = Object.keys(data)[0];
        const price = Number(firstKey ? data[firstKey]?.value : undefined);
        if (price && !Number.isNaN(price)) {
          return { price, source: `multi_price(list_address):${chain}` };
        }
        errors.push(
          `[multi_price(list_address):${chain}] Invalid price ${JSON.stringify(r.body)}`
        );
      } else {
        errors.push(
          `[multi_price(list_address):${chain}] HTTP ${r.status} | ${typeof r.body === "string" ? r.body : JSON.stringify(r.body)}`
        );
      }
    }

    // 2b) Batch endpoint with addresses (fallback for older docs)
    {
      const url = `https://public-api.birdeye.so/defi/multi_price?chain=${chain}&addresses=${encodeURIComponent(
        address
      )}`;
      const r = await fetchJson(url, { headers });
      if (r.ok) {
        const data = r.body?.data || {};
        const firstKey = Object.keys(data)[0];
        const price = Number(firstKey ? data[firstKey]?.value : undefined);
        if (price && !Number.isNaN(price)) {
          return { price, source: `multi_price(addresses):${chain}` };
        }
        errors.push(
          `[multi_price(addresses):${chain}] Invalid price ${JSON.stringify(r.body)}`
        );
      } else {
        errors.push(
          `[multi_price(addresses):${chain}] HTTP ${r.status} | ${typeof r.body === "string" ? r.body : JSON.stringify(r.body)}`
        );
      }
    }
  }

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

// Start and repeat every 5s
poll();
setInterval(poll, POLL_MS);

// CORS
app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// API
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
