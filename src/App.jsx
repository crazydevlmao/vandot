import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import '@fontsource-variable/inter';
import { ExternalLink, Twitter } from 'lucide-react';

export default function VanSol() {
  const [price, setPrice] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [refreshCountdown, setRefreshCountdown] = useState(30);
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 50, damping: 30 });
  const springY = useSpring(y, { stiffness: 50, damping: 30 });
  const rotateX = useTransform(springY, [-100, 100], [6, -6]);
  const rotateY = useTransform(springX, [-100, 100], [-6, 6]);

  useEffect(() => {
    const tokenMint = '5bQwUc6htzWgjUMtyxp98S2mjRzEY4BqJ1dC7zDWbonk';

    async function fetchMarketCap() {
      try {
        const res = await fetch(`https://public-api.birdeye.so/defi/price?address=${tokenMint}&include_liquidity=true`, {

          headers: {
            'X-API-KEY': 'e06ad6d03b004fe4ad711cbb01d1a41c',
            'accept': 'application/json'
          }
        });
        const data = await res.json();
        const tokenPrice = data?.data?.value;
        if (!tokenPrice || isNaN(tokenPrice)) {
          console.warn('Invalid price returned from BirdEye:', data);
          setPrice('Unavailable');
          return;
        }

        const marketCap = tokenPrice * 1_000_000_000;
        setPrice(`$${marketCap.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
        setLastUpdated(Date.now());
      } catch (err) {
        console.error('Error fetching price from BirdEye:', err);
        setPrice('Error');
      }
    }

    fetchMarketCap();
    const interval = setInterval(() => {
      fetchMarketCap();
      setRefreshCountdown(30);
    }, 30000);

    const countdown = setInterval(() => {
      setRefreshCountdown(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countdown);
    };
  }, []);
  return (
    <div className={`min-h-screen flex flex-col justify-between items-center transition-colors duration-500 font-[Inter Variable] px-4 sm:px-10 md:px-24 ${darkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`futuristic-toggle ${darkMode ? 'dark' : 'light'}`}
        >
          <div className="toggle-thumb">{darkMode ? '☀️' : '🌙'}</div>
        </button>
      </div>

      <main className="flex flex-col items-center justify-center flex-grow text-center w-full">
        <motion.div
          className="relative w-full max-w-5xl backdrop-blur-lg bg-white/10 dark:bg-black/10 border border-zinc-500 rounded-3xl px-16 py-20 shadow-xl transition-transform duration-300"
          style={{ rotateX, rotateY, transformPerspective: 1000 }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left - rect.width / 2;
            const mouseY = e.clientY - rect.top - rect.height / 2;
            x.set(mouseX);
            y.set(mouseY);
          }}
          onMouseLeave={() => {
            x.set(0);
            y.set(0);
          }}
        >
          <a
            href="https://www.tensor.trade/item/CNz2fez8dJ35kK6yeDHEy3eraqw3B34Yw59VTBrALznd"
            target="_blank"
            rel="noopener noreferrer"
            className={`absolute top-4 right-4 p-2 rounded-full transition hover:scale-110 ${darkMode ? 'bg-white text-black' : 'bg-black text-white'}`}
          >
            <ExternalLink size={20} />
          </a>

          <a
            href="https://x.com/i/communities/1937277402545066265"
            target="_blank"
            rel="noopener noreferrer"
            className={`absolute top-4 left-4 p-2 rounded-full transition hover:scale-110 ${darkMode ? 'bg-white text-black' : 'bg-black text-white'}`}
          >
            <Twitter size={20} />
          </a>

          <h1 className="text-4xl font-extrabold mb-10 tracking-tight">
            XYZ<span className="dot-fade ml-1">.</span>
          </h1>
          <img src="/vandot.png" alt="vandot" className="w-96 h-96 mx-auto object-contain border-4 border-zinc-600 mb-10 rounded-[18%] shadow-inner backdrop-blur-sm bg-white/20 dark:bg-white/10" />
          <motion.p
            key={price}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className={`text-3xl font-medium ${darkMode ? 'text-lime-400' : 'text-green-700'}`}
          >
            Price: <span className="font-bold">{price ?? 'Loading...'} USD</span>
          </motion.p>
          <p className={`text-sm mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            price refreshing in <span className={refreshCountdown < 10 ? 'text-red-500 font-semibold' : ''}>{refreshCountdown}</span> seconds
          </p>
        </motion.div>
      </main>

      <footer className="w-full text-center py-6 text-sm">
        <span>...</span><span className="neon-pump font-bold">pump</span>
      </footer>
    </div>
  );
}

const style = document.createElement('style');
style.innerHTML = `
@keyframes neonPulse {
  0% { text-shadow: 0 0 6px #00ff00, 0 0 12px #00ff00, 0 0 24px #00ff00; }
  50% { text-shadow: 0 0 16px #00ff00, 0 0 28px #00ff00, 0 0 60px #00ff00; }
  100% { text-shadow: 0 0 6px #00ff00, 0 0 12px #00ff00, 0 0 24px #00ff00; }
}

@keyframes fadeDot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.neon-pump {
  color: #00ff00;
  animation: neonPulse 1.6s infinite ease-in-out;
  letter-spacing: 1px;
}

.dot-fade {
  animation: fadeDot 2s infinite;
}

.futuristic-toggle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0fffc1 0%, #7e0fff 100%);
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.5), 0 0 20px rgba(126, 15, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.4s ease;
}

.futuristic-toggle:hover {
  box-shadow: 0 0 12px rgba(0, 255, 255, 0.7), 0 0 28px rgba(126, 15, 255, 0.5);
  transform: scale(1.1);
}

.toggle-thumb {
  font-size: 20px;
  z-index: 2;
}`;
document.head.appendChild(style);
