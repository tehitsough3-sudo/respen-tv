import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Tv, 
  HelpCircle, 
  Settings, 
  Database, 
  ShieldCheck, 
  Wifi, 
  Flame, 
  Heart, 
  AlertTriangle 
} from 'lucide-react';

import Header from './components/Header';
import IPTVPlayer from './components/IPTVPlayer';
import ChannelList from './components/ChannelList';
import SplashScreen from './components/SplashScreen';
import { parseM3U } from './utils/m3uParser';
import { IPTVChannel } from './types';
import { isStaticDeployment } from './utils/staticCheck';

const DEFAULT_PLAYLIST = 'https://raw.githubusercontent.com/doms9/iptv/refs/heads/default/M3U8/TV.m3u8';

function sanitizeIptvOrgUrl(url: string): string {
  if (!url) return url;
  if (url.includes("iptv-org/iptv") || url.includes("iptv-org.github.io")) {
    let clean = url;
    // Remove all sorts of raw/github/blob prefixes to extract path
    clean = clean
      .replace(/https?:\/\/(raw\.githubusercontent\.com|github\.com)\/iptv-org\/iptv\/(master|main|blob\/master|blob\/main|raw\/master|raw\/main)\//gi, "https://iptv-org.github.io/iptv/")
      .replace(/https?:\/\/iptv-org\.github\.io\/iptv\/(master|main)\//gi, "https://iptv-org.github.io/iptv/");

    // Handle the old /streams/ to /countries/ rewrite
    if (clean.includes("/streams/")) {
      clean = clean.replace("/streams/", "/countries/");
    }
    return clean;
  }
  return url;
}

export default function App() {
  // States
  const [showSplash, setShowSplash] = useState(true);
  const [playlistUrl, setPlaylistUrl] = useState(() => {
    let saved = localStorage.getItem('iptv_playlist_url');
    // Auto-heal any stale 404 URLs from old iptv-org master branch
    if (saved && (saved.includes("iptv-org/iptv") || saved.includes("iptv-org.github.io"))) {
      saved = sanitizeIptvOrgUrl(saved);
      localStorage.setItem('iptv_playlist_url', saved);
    }
    return saved ? saved : DEFAULT_PLAYLIST;
  });

  const [channels, setChannels] = useState<IPTVChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<IPTVChannel | null>(null);
  const [isPlaylistLoading, setIsPlaylistLoading] = useState(true);
  const [playlistError, setPlaylistError] = useState<string | null>(null);

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('iptv_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  // Recently watched channels state
  const [recentlyWatched, setRecentlyWatched] = useState<IPTVChannel[]>(() => {
    const saved = localStorage.getItem('iptv_recent');
    return saved ? JSON.parse(saved) : [];
  });

  // Track offline or bad URLs (e.g., HTTP 403, 404, or unplayable HLS.js streams)
  const [offlineUrls, setOfflineUrls] = useState<string[]>(() => {
    const saved = localStorage.getItem('iptv_offline_urls');
    return saved ? JSON.parse(saved) : [];
  });

  // Sync offlineUrls with localStorage
  useEffect(() => {
    localStorage.setItem('iptv_offline_urls', JSON.stringify(offlineUrls));
  }, [offlineUrls]);

  const handleMarkChannelOffline = (url: string) => {
    setOfflineUrls(prev => {
      if (prev.includes(url)) return prev;
      return [...prev, url];
    });
  };

  const handleClearOfflineList = () => {
    setOfflineUrls([]);
  };

  // Fetch and Parse Playlist
  useEffect(() => {
    const fetchPlaylist = async () => {
      setIsPlaylistLoading(true);
      setPlaylistError(null);

      try {
        let content = '';
        let response;
        
        // Try fetching via backend proxy first to bypass standard CORS errors (skip if static like GitHub Pages)
        if (!isStaticDeployment()) {
          try {
            const proxyUrl = `/api/fetch-playlist?url=${encodeURIComponent(playlistUrl)}`;
            response = await fetch(proxyUrl);
            if (response.ok) {
              content = await response.text();
            } else {
              // If the proxy server returned a structured error payload, let's extract and propagate it
              try {
                const errBody = await response.json();
                if (errBody && errBody.error) {
                  throw new Error(errBody.error);
                }
              } catch (jsonErr: any) {
                if (jsonErr.message && !jsonErr.message.includes("Unexpected token")) {
                  throw jsonErr;
                }
              }
              console.warn('Backend proxy fetch failed, trying direct fetch as fallback...');
            }
          } catch (proxyErr: any) {
            // Propagate clear user-facing messages directly
            if (proxyErr.message && (
              proxyErr.message.includes("HTML") || 
              proxyErr.message.includes("pengalihan") || 
              proxyErr.message.includes("loop") || 
              proxyErr.message.includes("M3U")
            )) {
              throw proxyErr;
            }
            console.warn('Backend proxy unreachable, trying direct fetch as fallback:', proxyErr);
          }
        }

        // If proxy failed or didn't get content, try direct fetch
        if (!content) {
          response = await fetch(playlistUrl);
          if (!response.ok) {
            throw new Error(`Gagal mengunduh daftar berkas M3U (Status: ${response.status})`);
          }
          content = await response.text();
        }

        const parsed = parseM3U(content);
        setChannels(parsed);

        if (parsed.length > 0) {
          setActiveChannel(parsed[0]);
        } else {
          setActiveChannel(null);
        }
      } catch (err: any) {
        console.warn('IPTV Playlist Fetch Warning:', err);
        setPlaylistError(
          err.message && err.message.length > 5
            ? `${err.message}`
            : `Terjadi kesalahan saat memuat playlist. Hubungan diblokir CORS atau link offline.`
        );
        setChannels([]);
        setActiveChannel(null);
      } finally {
        setIsPlaylistLoading(false);
      }
    };

    fetchPlaylist();
  }, [playlistUrl]);

  // Sync favorites to localStorage
  useEffect(() => {
    localStorage.setItem('iptv_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const handleToggleFavorite = (id: string) => {
    setFavorites(prev => {
      if (prev.includes(id)) {
        return prev.filter(favId => favId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handlePlaylistUrlChange = (newUrl: string) => {
    const sanitizedUrl = sanitizeIptvOrgUrl(newUrl);
    setPlaylistUrl(sanitizedUrl);
    localStorage.setItem('iptv_playlist_url', sanitizedUrl);
    setShowSplash(true);
  };

  const handleResetPlaylist = () => {
    setPlaylistUrl(DEFAULT_PLAYLIST);
    localStorage.setItem('iptv_playlist_url', DEFAULT_PLAYLIST);
    setShowSplash(true);
  };

  const handleSelectChannel = (channel: IPTVChannel) => {
    setActiveChannel(channel);
    
    // Add to recently watched (max 10 items, no duplicates, insert at top)
    setRecentlyWatched(prev => {
      const filtered = prev.filter(c => c.url !== channel.url);
      const updated = [channel, ...filtered].slice(0, 10);
      localStorage.setItem('iptv_recent', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearRecentlyWatched = () => {
    setRecentlyWatched([]);
    localStorage.removeItem('iptv_recent');
  };

  const handleNextChannel = () => {
    if (channels.length === 0 || !activeChannel) return;
    const currentIndex = channels.findIndex(ch => ch.url === activeChannel.url);
    if (currentIndex !== -1) {
      const nextIndex = (currentIndex + 1) % channels.length;
      handleSelectChannel(channels[nextIndex]);
    }
  };

  const handlePrevChannel = () => {
    if (channels.length === 0 || !activeChannel) return;
    const currentIndex = channels.findIndex(ch => ch.url === activeChannel.url);
    if (currentIndex !== -1) {
      const prevIndex = (currentIndex - 1 + channels.length) % channels.length;
      handleSelectChannel(channels[prevIndex]);
    }
  };

  if (showSplash) {
    return (
      <SplashScreen 
        channels={channels}
        playlistUrl={playlistUrl}
        isPlaylistLoading={isPlaylistLoading}
        onComplete={(activeUrls, detectedOfflineUrls) => {
          if (detectedOfflineUrls.length > 0) {
            setOfflineUrls(prev => {
              const combined = [...prev];
              detectedOfflineUrls.forEach(url => {
                if (!combined.includes(url)) {
                  combined.push(url);
                }
              });
              return combined;
            });
          }
          
          const firstActive = channels.find(ch => !detectedOfflineUrls.includes(ch.url));
          if (firstActive) {
            setActiveChannel(firstActive);
          } else if (channels.length > 0) {
            setActiveChannel(channels[0]);
          }

          setShowSplash(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white pb-12">
      
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-900/10 to-transparent pointer-events-none -z-10" />
      <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Main Container Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 flex flex-col gap-6">
        
        {/* Animated Greeting & Navigation Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <Header 
            playlistUrl={playlistUrl}
            onPlaylistUrlChange={handlePlaylistUrlChange}
            onResetPlaylist={handleResetPlaylist}
            channelsCount={channels.filter(ch => !offlineUrls.includes(ch.url)).length}
            favoritesCount={favorites.length}
          />
        </motion.div>

        {/* Dynamic Dual-Layout Section: Left Player, Right Channel List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Cinema Player Section (lg:col-span-7) */}
          <motion.div 
            className="lg:col-span-7 flex flex-col gap-4"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <IPTVPlayer 
              channel={activeChannel}
              isFavorite={activeChannel ? favorites.includes(activeChannel.id) : false}
              onToggleFavorite={() => activeChannel && handleToggleFavorite(activeChannel.id)}
              onNextChannel={handleNextChannel}
              onPrevChannel={handlePrevChannel}
              onChannelOffline={handleMarkChannelOffline}
            />

            {/* Quick Informational Tips Card */}
            <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/60 text-xs text-slate-400 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-200 block mb-0.5">Aman &amp; Pribadi</span>
                Semua pemrosesan daftar putar M3U8 dilakukan 100% di browser Anda (sisi klien). Tidak ada data streaming, link kustom, atau riwayat saluran favorit/tontonan Anda yang dikirim ke server luar. Privasi Anda terlindungi penuh.
              </div>
            </div>
          </motion.div>

          {/* Interactive Channel List Section (lg:col-span-5) */}
          <motion.div 
            className="lg:col-span-5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <ChannelList 
              channels={channels}
              activeChannel={activeChannel}
              onSelectChannel={handleSelectChannel}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              isPlaylistLoading={isPlaylistLoading}
              playlistError={playlistError}
              recentlyWatched={recentlyWatched}
              onClearRecentlyWatched={handleClearRecentlyWatched}
              offlineUrls={offlineUrls}
              onMarkOffline={handleMarkChannelOffline}
              onClearOffline={handleClearOfflineList}
            />
          </motion.div>

        </div>

        {/* Footer Area */}
        <motion.footer 
          className="mt-8 border-t border-slate-900 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-center text-xs text-slate-500 font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div>
            Built with ❤️ using React 19 &amp; Hls.js
          </div>
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 inline-block animate-pulse"></span>
              CORS-Optimized Player
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-pink-500 inline-block"></span>
              Client Storage Enforcer
            </span>
          </div>
        </motion.footer>

      </div>
    </div>
  );
}
