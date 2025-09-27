import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import "@fontsource-variable/inter";
import { ExternalLink, Twitter } from "lucide-react";

const API_BASE =
  (import.meta.env.VITE_API_BASE ?? "").trim() ||
  (import.meta.env.PROD ? "https://vandot-m6em.onrender.com" : "");


export default function VanSol() {
  const [marketCapText, setMarketCapText] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [refreshCountdown, setRefreshCountdown] = useState(5);

  // Card tilt
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 50, damping: 30 });
  const springY = useSpring(y, { stiffness: 50, damping: 30 });
  const rotateX = useTransform(springY, [-100, 100], [6, -6]);
  const rotateY = useTransform(springX, [-100, 100], [-6, 6]);

  // Cursor-following glow
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const smoothX = useSpring(cursorX, { stiffness: 120, damping: 20, mass: 0.3 });
  const smoothY = useSpring(cursorY, { stiffness: 120, damping: 20, mass: 0.3 });

  useEffect(() => {
    const onMove = (e) => { cursorX.set(e.clientX); cursorY.set(e.clientY); };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

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
      } catch (e) {
        console.error(e);
        setMarketCapText("Error");
      }
    }

    fetchCached();
    const poller = setInterval(() => { fetchCached(); setRefreshCountdown(5); }, REFRESH_MS);
    const countdown = setInterval(() => { setRefreshCountdown((p) => (p > 0 ? p - 1 : 0)); }, 1000);
    return () => { clearInterval(poller); clearInterval(countdown); };
  }, []);

  return (
    <div className={`min-h-screen relative overflow-hidden flex flex-col justify-between items-center transition-colors duration-500 font-[Inter Variable] px-4 sm:px-10 md:px-24 ${darkMode ? "bg-black text-white" : "bg-white text-black"}`}>
      {/* cursor-following glow */}
      <motion.div
        className="pointer-events-none fixed z-[1] rounded-full blur-3xl opacity-60"
        style={{
          width: 260, height: 260,
          left: smoothX, top: smoothY, x: -130, y: -130,
          background: darkMode
            ? "radial-gradient(120px 120px at center, rgba(0,255,180,0.25), rgba(0,0,0,0))"
            : "radial-gradient(120px 120px at center, rgba(0,200,120,0.2), rgba(255,255,255,0))"
        }}
      />

      <div className="absolute top-4 right-4 z-10">
        <button onClick={() => setDarkMode(!darkMode)} className={`futuristic-toggle ${darkMode ? "dark" : "light"}`}>
          <div className="toggle-thumb">{darkMode ? "☀️" : "🌙"}</div>
        </button>
      </div>

      <main className="flex flex-col items-center justify-center flex-grow text-center w-full z-[2]">
        <motion.div
          className="relative w-full max-w-5xl backdrop-blur-lg bg-white/10 dark:bg-black/10 border border-zinc-500 rounded-3xl px-16 py-20 shadow-xl transition-transform duration-300"
          style={{ rotateX, rotateY, transformPerspective: 1000 }}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            x.set(e.clientX - r.left - r.width / 2);
            y.set(e.clientY - r.top - r.height / 2);
          }}
          onMouseLeave={() => { x.set(0); y.set(0); }}
        >
          <a href="https://pump.fun/" target="_blank" rel="noopener noreferrer"
             className={`absolute top-4 right-4 p-2 rounded-full transition hover:scale-110 ${darkMode ? "bg-white text-black" : "bg-black text-white"}`}>
            <ExternalLink size={20} />
          </a>
          <a href="https://x.com/i/communities/1972004814910316702" target="_blank" rel="noopener noreferrer"
             className={`absolute top-4 left-4 p-2 rounded-full transition hover:scale-110 ${darkMode ? "bg-white text-black" : "bg-black text-white"}`}>
            <Twitter size={20} />
          </a>

          <h1 className="text-4xl font-extrabold mb-10 tracking-tight">ART<span className="dot-fade ml-1"> by anonymous</span></h1>

          <img src="/vandot.png" alt="vandot"
               className="w-96 h-96 mx-auto object-contain border-4 border-zinc-600 mb-10 rounded-[18%] shadow-inner backdrop-blur-sm bg-white/20 dark:bg-white/10" />

          <motion.p
            key={marketCapText}
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className={`text-3xl font-medium ${darkMode ? "text-lime-400" : "text-green-700"}`}>
            value: <span className="font-bold">{marketCapText ?? "Loading..."}</span>
          </motion.p>

          <p className={`text-sm mt-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            Revalorization in <span className={refreshCountdown < 3 ? "text-red-500 font-semibold" : ""}>{refreshCountdown}</span> seconds
          </p>
        </motion.div>
      </main>

      <footer className="w-full text-center py-6 text-sm z-[2]">
        <span></span><span className="neon-pump font-bold">pump</span>
      </footer>
    </div>
  );
}

// keep your existing style injection (unchanged)
const style = document.createElement("style");
style.innerHTML = `
@keyframes neonPulse { 0%{text-shadow:0 0 6px #00ff00,0 0 12px #00ff00,0 0 24px #00ff00;} 50%{text-shadow:0 0 16px #00ff00,0 0 28px #00ff00,0 0 60px #00ff00;} 100%{text-shadow:0 0 6px #00ff00,0 0 12px #00ff00,0 0 24px #00ff00;} }
@keyframes fadeDot { 0%,100%{opacity:1;} 50%{opacity:0;} }
.neon-pump { color:#09ff00; animation:neonPulse 1.6s infinite ease-in-out; letter-spacing:1px; }
.dot-fade { animation: fadeDot 2s infinite; }
.futuristic-toggle { width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg,#0fffc1 0%,#7e0fff 100%); box-shadow:0 0 8px rgba(0,255,255,.5),0 0 20px rgba(126,15,255,.4); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .4s ease; }
.futuristic-toggle:hover { box-shadow:0 0 12px rgba(0,255,255,.7),0 0 28px rgba(126,15,255,.5); transform:scale(1.1); }
.toggle-thumb { font-size:20px; z-index:2; }
`;
document.head.appendChild(style);
