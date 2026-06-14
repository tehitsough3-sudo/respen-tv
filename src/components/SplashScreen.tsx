import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tv, Sparkles, AlertTriangle, ShieldCheck, Play, ArrowRight, Activity, Terminal } from 'lucide-react';
import { IPTVChannel } from '../types';

interface SplashScreenProps {
  channels: IPTVChannel[];
  onComplete: (activeUrls: string[], offlineUrls: string[]) => void;
  playlistUrl: string;
  isPlaylistLoading?: boolean;
}

export default function SplashScreen({
  channels,
  onComplete,
  playlistUrl,
  isPlaylistLoading = false
}: SplashScreenProps) {
  const [scannedCount, setScannedCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [offlineCount, setOfflineCount] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const [logFeed, setLogFeed] = useState<{ id: string; type: 'success' | 'fail' | 'info'; text: string }[]>([]);
  
  const hasStarted = useRef(false);
  const abortRef = useRef(false);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  // Set scanning target to the total channels in the playlist
  const scanLimit = channels.length;
  const channelsToScan = channels;

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logFeed]);

  const addLog = (text: string, type: 'success' | 'fail' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(4);
    setLogFeed(prev => [...prev.slice(-30), { id, type, text }]);
  };

  // Add periodic logs while waiting for playlist file download
  useEffect(() => {
    if (!isPlaylistLoading) return;
    addLog("Menghubungkan ke server playlist...", "info");
    const interval = setInterval(() => {
      const msgs = [
        "Membaca metadata M3U payload...",
        "Mengurai grup dan kategori siaran...",
        "Memverifikasi struktur link streaming...",
        "Mempersiapkan engine integrasi HLS.js realtime..."
      ];
      const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
      addLog(randomMsg, "info");
    }, 2000);
    return () => clearInterval(interval);
  }, [isPlaylistLoading]);

  useEffect(() => {
    if (channels.length === 0 || isPlaylistLoading) return;
    
    let isCurrentRunActive = true;

    // Reset counts and log board on new scan start (or React 18 double-mount simulation)
    setScannedCount(0);
    setActiveCount(0);
    setOfflineCount(0);
    setLogFeed([]);

    addLog(`Daftar putar berhasil diurai: ${channels.length} saluran ditemukan.`, 'info');
    addLog(`Memulai pemindaian keaktifan otomatis untuk seluruh ${scanLimit} saluran...`, 'info');

    const runScan = async () => {
      const activeUrls: string[] = [];
      const offlineUrlsLocal: string[] = [];
      
      const batchSize = 50;
      let currentIndex = 0;

      while (currentIndex < channelsToScan.length && isCurrentRunActive) {
        const batch = channelsToScan.slice(currentIndex, currentIndex + batchSize);
        const batchUrls = batch.map(ch => ch.url);

        try {
          const response = await fetch('/api/analyze-hls-batch', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ urls: batchUrls })
          });

          if (!isCurrentRunActive) return;

          if (response.ok) {
            const data = await response.json();
            if (!isCurrentRunActive) return;

            const resultsMap = new Map<string, string>();
            if (data.results && Array.isArray(data.results)) {
              data.results.forEach((resItem: { url: string; status: string }) => {
                resultsMap.set(resItem.url, resItem.status);
              });
            }

            let batchActive = 0;
            let batchOffline = 0;
            const newLogs: { id: string; type: 'success' | 'fail' | 'info'; text: string }[] = [];

            batch.forEach(ch => {
              const status = resultsMap.get(ch.url) || 'offline';
              const logId = Math.random().toString(36).substring(4);
              if (status === 'offline') {
                offlineUrlsLocal.push(ch.url);
                batchOffline++;
                newLogs.push({ id: logId, type: 'fail', text: `[OFFLINE] ${ch.name} - Gagal memuat` });
              } else {
                activeUrls.push(ch.url);
                batchActive++;
                newLogs.push({ id: logId, type: 'success', text: `[AKTIF] ${ch.name} - Terkoneksi` });
              }
            });

            if (batchActive > 0) setActiveCount(prev => prev + batchActive);
            if (batchOffline > 0) setOfflineCount(prev => prev + batchOffline);

            // Limit logs rendering to keep terminal readable and exceptionally snappy
            const logsToPush = newLogs.slice(-4);
            if (newLogs.length > 4) {
              const summaryId = Math.random().toString(36).substring(4);
              logsToPush.push({
                id: summaryId,
                type: 'info',
                text: `[INFO] Mengolah ${batch.length} saluran (+${batchActive} Aktif, +${batchOffline} Offline)`
              });
            }
            setLogFeed(prev => [...prev.slice(-30), ...logsToPush]);

          } else {
            let batchOffline = 0;
            batch.forEach(ch => {
              offlineUrlsLocal.push(ch.url);
              batchOffline++;
            });
            setOfflineCount(prev => prev + batchOffline);
            addLog(`[BENTROK] Gagal menghubungi server batch untuk ${batch.length} saluran`, 'fail');
          }
        } catch (err) {
          if (!isCurrentRunActive) return;
          let batchOffline = 0;
          batch.forEach(ch => {
            offlineUrlsLocal.push(ch.url);
            batchOffline++;
          });
          setOfflineCount(prev => prev + batchOffline);
          addLog(`[OFFLINE] Gangguan jaringan pada ${batch.length} saluran`, 'fail');
        } finally {
          if (isCurrentRunActive) {
            setScannedCount(prev => prev + batch.length);
          }
        }

        currentIndex += batch.length;
        // Super minimal breath time
        await new Promise(r => setTimeout(r, 60));
      }

      if (isCurrentRunActive) {
        addLog(`Pemindaian selesai berkala! Menyiapkan antarmuka menonton...`, 'info');
        setIsFinishing(true);
        setTimeout(() => {
          if (isCurrentRunActive) {
            // Send back the detected lists
            onComplete(activeUrls, offlineUrlsLocal);
          }
        }, 1200);
      }
    };

    runScan();

    return () => {
      isCurrentRunActive = false;
    };
  }, [channels, isPlaylistLoading]);

  const handleSkip = () => {
    abortRef.current = true;
    // Mark as complete immediately
    onComplete([], []);
  };

  const progressPercent = scanLimit > 0 ? Math.round((scannedCount / scanLimit) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* Background visual overlays */}
      <div className="absolute inset-x-0 top-0 h-[600px] bg-gradient-to-b from-indigo-900/15 via-indigo-950/5 to-transparent pointer-events-none" />
      <div className="absolute top-[30%] left-[10%] w-[350px] h-[350px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main card panel */}
      <motion.div 
        className="w-full max-w-2xl px-6 relative z-10 flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        
        {/* Animated Main Tech Logo */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full animate-pulse" />
          <div className="relative w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center shadow-lg">
            <Tv className="h-8 w-8 text-indigo-400" />
            <motion.div 
              className="absolute -top-1 -right-1"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Sparkles className="h-4 w-4 text-emerald-400" />
            </motion.div>
          </div>
        </div>

        {/* Brand & Heading titles */}
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white text-center flex items-center gap-2">
          <span>Respen TV</span>
          <span className="text-xs bg-indigo-500/15 border border-indigo-400/20 text-indigo-300 font-mono tracking-widest px-2 py-0.5 rounded-full">
            SMART HLS
          </span>
        </h1>
        
        <p className="mt-2 text-slate-400 text-xs md:text-sm text-center max-w-md">
          Mengoptimalkan kualitas putar & memindai jalur siaran aktif realtime.
        </p>

        {/* Realtime Stats Matrix */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
          
          <div className="bg-slate-900/40 border border-slate-800/60 p-3.5 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block">Playlist M3U</span>
            <span className="text-xl font-extrabold text-indigo-400 mt-1 block font-mono">
              {channels.length} <span className="text-[10px] text-slate-500 font-normal">CH</span>
            </span>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/60 p-3.5 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block">Target Scan</span>
            <span className="text-xl font-extrabold text-[#7c3aed] mt-1 block font-mono">
              {scanLimit} <span className="text-[10px] text-slate-500 font-normal">CH</span>
            </span>
          </div>

          <div className="bg-slate-900/40 border border-emerald-900/40 p-3.5 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono tracking-wider block">Saluran Aktif</span>
            <span className="text-xl font-extrabold text-emerald-400 mt-1 block font-mono">
              {activeCount}
            </span>
          </div>

          <div className="bg-slate-900/40 border border-rose-950/40 p-3.5 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-rose-400 font-mono tracking-wider block">Saluran Mati</span>
            <span className="text-xl font-extrabold text-rose-400 mt-1 block font-mono">
              {offlineCount}
            </span>
          </div>

        </div>

        {/* Interactive Progress Tracking */}
        <div className="w-full mt-6">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-2 font-mono">
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3 text-indigo-400 animate-pulse" />
              <span>
                {isPlaylistLoading 
                  ? "Mengunduh file playlist..." 
                  : `Memproses saluran ${scannedCount}/${scanLimit}`}
              </span>
            </span>
            <span className="text-indigo-400 font-bold">
              {isPlaylistLoading ? "Memuat..." : `${progressPercent}%`}
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 shadow-inner relative">
            {isPlaylistLoading ? (
              <div className="h-full bg-gradient-to-r from-indigo-500 via-emerald-400 to-indigo-500 rounded-full animate-pulse w-full" />
            ) : (
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            )}
          </div>
        </div>

        {/* Live log Terminal feedback */}
        <div className="w-full mt-5">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pb-2.5 border-b border-slate-900 mb-3.5">
              <span className="flex items-center gap-1.5 font-bold">
                <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                DOKUMENTASI PEMINDAIAN REALTIME
              </span>
              <span className="text-[10px] text-indigo-400 px-2 py-0.5 rounded bg-indigo-950/50">HLS.JS DRIVER</span>
            </div>
            
            <div 
              ref={logContainerRef}
              className="h-36 overflow-y-auto font-mono text-[10px] leading-relaxed space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950 pr-2"
            >
              <AnimatePresence initial={false}>
                {logFeed.map((log) => (
                  <motion.div 
                    key={log.id}
                    className="flex items-start gap-1.5"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <span className="text-slate-600 select-none">&gt;</span>
                    <span className={
                      log.type === 'success' ? 'text-emerald-400' :
                      log.type === 'fail' ? 'text-rose-400 font-medium' : 'text-slate-300'
                    }>
                      {log.text}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {logFeed.length === 0 && (
                <div className="text-slate-600 italic">Mempersiapkan umpan log...</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer controls & Skip action */}
        <div className="mt-8 flex items-center justify-center gap-4 w-full">
          <button
            onClick={handleSkip}
            className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-900 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <span>{isFinishing ? 'Mempersiapkan...' : 'Lewati Pemindaian'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 opacity-50 select-none">
          <div className="text-[10px] text-slate-500 font-mono text-center max-w-[340px]">
            * Hanya menyaring saluran mati di atas untuk mempercepat loading. Saluran lain dapat Anda coba putar kapan saja.
          </div>
        </div>

      </motion.div>
    </div>
  );
}
