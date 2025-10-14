import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import "@fontsource-variable/inter";
import { FaXTwitter } from "react-icons/fa6";

function computeApiBase(env) {
  try {
    const primary = (env?.VITE_API_BASE ?? "https://vandot-v281.onrender.com").trim();
    if (primary) return primary;
    return env?.PROD ? "https://vandot-v281.onrender.com" : "";
  } catch {
    return "https://vandot-v281.onrender.com";
  }
}

const apiEnv =
  typeof import.meta !== "undefined" && import.meta && import.meta.env ? import.meta.env : undefined;
const API_BASE = computeApiBase(apiEnv);

function mdInlineBold(s) {
  try {
    return s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  } catch {
    return s;
  }
}

const STRINGS = {
  CN: {
    title_cn: "被盗的卷轴",
    title_en: "The Stolen Scroll",
    value: "价值",
    lastUpdated: "最后更新",
    buy: "购买",
    copy: "复制",
    lore: "传说",
    langToggle: "中文/EN",
    loreHeading: "被盗的卷轴 · 传说",
    loreBody: `
九尺长的《毛泽东手迹》从香港著名收藏家傅振肖家中失窃，被转手时竟被误剪为两半——据报道，买家以“它太长了、而且可能是赝品”为由动刀。警方其后寻回，但这件作品再也无法复原。市场估值曾被媒体报道为数亿美元，无论数字如何，真正的价值在它承载的历史：革命年代的笔墨、流转于民间的记忆，以及一场荒诞的艺术悲剧。

我们将这份遗憾**铸刻到链上**。既然原作遭受破坏、结局未能挽回，就让艺术的**叙事与价值**在 **BNB 链**上以全新形态延续——可验证、可共享、不可篡改。滚滚长卷虽被剪断，**链上长卷**将继续展开。
`,
    sourcesLabel: "相关报道：",
    sources: [
      {
        label: "Smithsonian Magazine – Stolen Mao Zedong Scroll Found Cut in Half",
        url: "https://www.smithsonianmag.com/smart-news/mao-zedong-scroll-was-cut-half-180976033/",
      },
      {
        label: "Reuters – Valuable stolen Mao Zedong scroll found cut in half",
        url: "https://www.reuters.com/idUSKBN26T1TU/",
      },
      {
        label: "The Art Newspaper – Stolen Mao Zedong scroll found cut in half",
        url: "https://www.theartnewspaper.com/2020/10/07/stolen-mao-zedong-scroll-worth-dollar300m-found-cut-in-half",
      },
      {
        label: "The Guardian – Stolen Mao scroll cut in two",
        url: "https://www.theguardian.com/world/2020/oct/07/stolen-mao-scroll-worth-230m-was-cut-in-two-by-50-buyer-police-say",
      },
      {
        label: "Artnet News – Recovered in a $645M Hong Kong heist",
        url: "https://news.artnet.com/art-world-archives/three-men-arrested-connection-645-million-art-heist-hong-kong-1914181",
      },
    ],
  },
  EN: {
    title_cn: "被盗的卷轴",
    title_en: "The Stolen Scroll",
    value: "Value",
    lastUpdated: "Last updated",
    buy: "BUY",
    copy: "Copy",
    lore: "Lore",
    langToggle: "CN/EN",
    loreHeading: "The Stolen Scroll · Lore",
    loreBody: `
A nine-foot Mao Zedong calligraphy was stolen from Hong Kong collector Fu Chunxiao’s home. In a tragic twist, an unwitting buyer **cut the scroll in half**, reportedly thinking it was a fake and “too long to hang.” Police later recovered the work—but the damage was irreversible. Media reports placed its value in the hundreds of millions; regardless of the number, its true worth is historical: a brush with revolution, a relic of memory, and a cautionary tale in the art market.

Here, we **preserve the narrative on-chain**. Because the original was never restored, we reimagine its cultural value on the **BNB chain**—verifiable, shareable, and tamper-proof. Though the paper was severed, the **on-chain scroll** continues.
`,
    sourcesLabel: "Further reading:",
    sources: [
      {
        label: "Smithsonian Magazine – Stolen Mao Zedong Scroll Found Cut in Half",
        url: "https://www.smithsonianmag.com/smart-news/mao-zedong-scroll-was-cut-half-180976033/",
      },
      {
        label: "Reuters – Valuable stolen Mao Zedong scroll found cut in half",
        url: "https://www.reuters.com/idUSKBN26T1TU/",
      },
      {
        label: "The Art Newspaper – Stolen Mao Zedong scroll found cut in half",
        url: "https://www.theartnewspaper.com/2020/10/07/stolen-mao-zedong-scroll-worth-dollar300m-found-cut-in-half",
      },
      {
        label: "The Guardian – Stolen Mao scroll cut in two",
        url: "https://www.theguardian.com/world/2020/oct/07/stolen-mao-scroll-worth-230m-was-cut-in-two-by-50-buyer-police-say",
      },
      {
        label: "Artnet News – Recovered in a $645M Hong Kong heist",
        url: "https://news.artnet.com/art-world-archives/three-men-arrested-connection-645-million-art-heist-hong-kong-1914181",
      },
    ],
  },
};

export default function TheStolenScroll() {
  const [showLore, setShowLore] = useState(false);
  const [marketCapText, setMarketCapText] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [lang, setLang] = useState("CN");
  const [copyState, setCopyState] = useState("idle");

  useEffect(() => {
    const REFRESH_MS = 5000;
    async function fetchCached() {
      try {
        const res = await fetch(`${API_BASE}/api/marketcap`, { cache: "no-store" });
        const data = await res.json();
        if (!data?.marketCap || isNaN(data.marketCap)) {
          setMarketCapText("Unavailable");
          return;
        }
        const mc = Number(data.marketCap);
        setMarketCapText(`$${mc.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
        if (data?.fetchedAt) {
          setLastUpdated(new Date(data.fetchedAt).toLocaleTimeString());
        }
      } catch {
        setMarketCapText("Error");
      }
    }
    fetchCached();
    const poller = setInterval(fetchCached, REFRESH_MS);
    return () => clearInterval(poller);
  }, []);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 50, damping: 30 });
  const springY = useSpring(y, { stiffness: 50, damping: 30 });
  const rotateX = useTransform(springY, [-100, 100], [6, -6]);
  const rotateY = useTransform(springX, [-100, 100], [-6, 6]);

  const COIN_ADDRESS = "0x4f19454d509b86f5d888cca2a6930e05c3554444";
  const t = STRINGS[lang];

  const handleCopy = async () => {
    const text = COIN_ADDRESS;
    let success = false;
    if (!text || /YourBnbTokenAddressHere/i.test(text)) {
      success = false;
    } else {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          success = true;
        } else {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          try {
            success = document.execCommand("copy");
          } catch {
            success = false;
          }
          document.body.removeChild(ta);
        }
      } catch {
        success = false;
      }
    }
    setCopyState(success ? "ok" : "err");
    setTimeout(() => setCopyState("idle"), 2300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0a09] via-[#14110f] to-[#1a120b] text-yellow-400 font-[Inter Variable] relative flex flex-col items-center justify-between overflow-hidden px-6 sm:px-10 md:px-24">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.25 }}
        transition={{ duration: 2 }}
        className="absolute inset-0 bg-[url('/scroll-pattern.png')] bg-repeat opacity-20 mix-blend-overlay"
      />

      <main className="flex flex-col items-center justify-center flex-grow text-center z-10 w-full">
        <motion.div
          className="relative w-full max-w-5xl bg-gradient-to-b from-[#1a120b]/80 to-[#0c0907]/70 border border-yellow-700/60 rounded-3xl px-10 py-16 shadow-[0_0_30px_rgba(255,215,0,0.15)] backdrop-blur-md"
          style={{ rotateX, rotateY, transformPerspective: 1000 }}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            x.set(e.clientX - r.left - r.width / 2);
            y.set(e.clientY - r.top - r.height / 2);
          }}
          onMouseLeave={() => {
            x.set(0);
            y.set(0);
          }}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <a
              href="https://x.com/i/communities/1977757594916618389"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-yellow-500/20 border border-yellow-400/40 hover:bg-yellow-500/30 text-yellow-300 transition backdrop-blur-md shadow-lg"
              aria-label="X Community"
            >
              <FaXTwitter size={18} />
            </a>
            <a
              href="https://dexscreener.com/bsc/0x4f19454d509b86f5d888cca2a6930e05c3554444"
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-4 flex items-center justify-center rounded-full bg-yellow-500/20 border border-yellow-400/40 hover:bg-yellow-500/30 text-yellow-100 text-xs font-semibold tracking-wide transition backdrop-blur-md shadow-lg"
            >
              {t.buy}
            </a>
          </div>

          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="relative inline-block">
              <button
                onClick={() => setLang((prev) => (prev === "CN" ? "EN" : "CN"))}
                className="h-9 px-4 flex items-center justify-center rounded-full bg-yellow-500/20 border border-yellow-400/40 hover:bg-yellow-500/30 text-yellow-100 text-xs font-semibold tracking-wide transition backdrop-blur-md shadow-lg"
                aria-label="Toggle Language"
              >
                {t.langToggle}
              </button>
              <span className="pulse-ring absolute inset-0 -z-10" />
              <div className="swap-tip absolute top-11 left-1/2 pointer-events-none whitespace-nowrap flex items-center gap-1 px-2 py-1 rounded-full bg-[#1a120b]/90 border border-yellow-500/40 text-yellow-100 text-[10px] shadow">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="w-3 h-3">
                  <path d="M12 7l-7 7h14z"></path>
                </svg>
                <span>swap language</span>
              </div>
            </div>
            <button
              onClick={() => setShowLore(true)}
              className="h-9 px-4 flex items-center justify-center rounded-full bg-yellow-500/20 border border-yellow-400/40 hover:bg-yellow-500/30 text-yellow-100 text-xs font-semibold tracking-wide transition backdrop-blur-md shadow-lg"
            >
              {t.lore}
            </button>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="text-5xl sm:text-6xl font-extrabold mb-6 tracking-tight font-serif"
          >
            {lang === "CN" ? <span className="title-cn">{t.title_cn}</span> : <span className="title-en">{t.title_en}</span>}
          </motion.h1>
          <p className="text-sm text-yellow-500 mb-10 italic">{lang === "CN" ? t.title_en : t.title_cn}</p>

          <motion.img
            src="/scroll-dragon.png"
            alt={t.title_en}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 1.2 }}
            className="w-80 h-80 sm:w-96 sm:h-96 mx-auto object-contain border-4 border-yellow-700/60 rounded-[20%] shadow-inner bg-gradient-to-b from-[#222] to-[#000]/80 p-4"
          />

          <motion.p
            key={marketCapText}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl font-semibold text-[#f0b90b] mt-10"
          >
            {t.value}: <span className="font-bold">{marketCapText ?? (lang === "CN" ? "加载中..." : "Loading...")}</span>
          </motion.p>

          {/* ✅ replaced countdown with last updated */}
          <p className="text-sm mt-2 text-yellow-500/80">
            {t.lastUpdated}: <span className="text-yellow-300 font-semibold">{lastUpdated ?? "—"}</span>
          </p>
        </motion.div>
      </main>

      <footer className="w-full text-center py-8 text-sm z-10">
        <div className="inline-flex items-center gap-3 bg-[#1a120b]/80 border border-yellow-700/60 rounded-full px-5 py-3 shadow-md backdrop-blur-sm">
          <code className="text-yellow-200 font-mono text-xs sm:text-sm">{COIN_ADDRESS}</code>
          <button
            onClick={handleCopy}
            className={`px-3 py-1 rounded-full text-xs transition border ${
              copyState === "ok"
                ? "bg-green-500/30 hover:bg-green-600/40 border-green-400/60 text-green-100 copied-pulse"
                : copyState === "err"
                ? "bg-red-500/30 hover:bg-red-600/40 border-red-400/60 text-red-100 copied-pulse"
                : "bg-yellow-500/20 hover:bg-yellow-600/30 border-yellow-500/40"
            }`}
          >
            {copyState === "ok"
              ? lang === "CN"
                ? "已复制"
                : "Copied"
              : copyState === "err"
              ? lang === "CN"
                ? "复制失败"
                : "Copy failed"
              : t.copy}
          </button>
        </div>
      </footer>

      {/* === LORE MODAL (with sources) === */}
      {showLore && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLore(false);
          }}
        >
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* card */}
          <div className="relative z-10 max-w-3xl w-[92vw] sm:w-[85vw] md:w-[70vw] max-h-[80vh] overflow-hidden rounded-3xl border border-yellow-700/60 bg-gradient-to-b from-[#1a120b]/95 to-[#0c0907]/95 shadow-[0_0_40px_rgba(255,215,0,0.15)]">
            <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-b border-yellow-700/40">
              <h2 className="text-xl sm:text-2xl font-bold">{t.loreHeading}</h2>
              <button
                onClick={() => setShowLore(false)}
                className="h-9 px-4 rounded-full bg-yellow-500/20 border border-yellow-500/40 hover:bg-yellow-500/30 text-yellow-100 text-xs font-semibold tracking-wide transition"
                aria-label="Close"
              >
                {lang === "CN" ? "关闭" : "Close"}
              </button>
            </div>

            <div className="px-6 sm:px-8 py-5 overflow-y-auto max-h-[70vh] text-left leading-relaxed text-yellow-100/90">
              <div
                className="prose prose-invert prose-sm sm:prose-base max-w-none"
                dangerouslySetInnerHTML={{ __html: mdInlineBold(t.loreBody) }}
              />

              {/* sources list */}
              {t.sources && t.sources.length > 0 && (
                <div className="mt-6 pt-4 border-t border-yellow-700/40">
                  <p className="text-yellow-300 font-semibold mb-2">{t.sourcesLabel}</p>
                  <ul className="list-disc pl-5 space-y-1 text-yellow-100/90">
                    {t.sources.map((s, idx) => (
                      <li key={idx}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:opacity-80"
                        >
                          {s.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

if (typeof document !== "undefined" && !document.getElementById("stolen-scroll-styles")) {
  const style = document.createElement("style");
  style.id = "stolen-scroll-styles";
  style.innerHTML = `
@keyframes paperRoll {
  0% { transform: scaleY(0); opacity: 0; }
  100% { transform: scaleY(1); opacity: 1; }
}
@keyframes shimmer {
  0% { background-position: 0% 0; }
  100% { background-position: 200% 0; }
}
@keyframes inkFlow {
  0% { filter: drop-shadow(0 0 0 rgba(240,185,11,0.2)); }
  50% { filter: drop-shadow(0 0 10px rgba(240,185,11,0.35)); }
  100% { filter: drop-shadow(0 0 0 rgba(240,185,11,0.2)); }
}
@keyframes pulseRing {
  0% { transform: scale(0.9); opacity: 0.6; }
  70% { transform: scale(1.2); opacity: 0; }
  100% { opacity: 0; }
}
@keyframes tipFloat {
  0%, 100% { transform: translate(-50%, 0); }
  50% { transform: translate(-50%, -2px); }
}
body { background-color: #0b0a09; color: #f0b90b; }
h1, p { font-family: "Noto Serif SC", "Songti SC", serif; }
.scroll-border { border-image: linear-gradient(45deg, #f0b90b, #ffdf6e) 1; }
.title-cn {
  display: inline-block;
  background-image: linear-gradient(90deg, rgba(240,185,11,0.95), #ffe18d, rgba(240,185,11,0.95));
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow:
    0 0 0 #000,
    1px 0 #000,
    -1px 0 #000,
    0 1px #000,
    0 -1px #000,
    1px 1px #000,
    -1px 1px #000,
    1px -1px #000,
    -1px -1px #000,
    0 0 12px rgba(240,185,11,0.25);
  animation: shimmer 4.5s linear infinite, inkFlow 3.5s ease-in-out infinite;
}
title-en {
  text-shadow:
    0 0 0 #000,
    1px 0 #000,
    -1px 0 #000,
    0 1px #000,
    0 -1px #000,
    0 0 10px rgba(240,185,11,0.25);
}
.pulse-ring { position: absolute; inset: -4px; border: 1px solid rgba(240,185,11,0.45); border-radius: 9999px; animation: pulseRing 1.8s ease-out infinite; pointer-events: none; }
.swap-tip { animation: tipFloat 2.4s ease-in-out infinite; white-space: nowrap; }
@keyframes copiedPulse { 0% { transform: scale(1); } 50% { transform: scale(1.06); } 100% { transform: scale(1); } }
.copied-pulse { animation: copiedPulse .8s ease-in-out 2; }
`;
  document.head.appendChild(style);
}
