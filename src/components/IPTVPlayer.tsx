import { useEffect, useRef, useState, ChangeEvent } from 'react';
import Hls from 'hls.js';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Tv, 
  AlertTriangle, 
  RefreshCw, 
  Flame, 
  Heart,
  ChevronRight,
  Info,
  SkipForward,
  SkipBack,
  Sparkles
} from 'lucide-react';
import { IPTVChannel } from '../types';
import { isStaticDeployment } from '../utils/staticCheck';

interface IPTVPlayerProps {
  channel: IPTVChannel | null;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onNextChannel?: () => void;
  onPrevChannel?: () => void;
  onChannelOffline?: (url: string) => void;
}

function getPlayableErrorMessage(url: string = ''): string {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
    return 'Gagal memuat: Mixed Content. Halaman web dimuat dengan HTTPS aman, tetapi saluran ini menggunakan alamat HTTP biasa (tidak aman) yang diblokir oleh kebijakan keamanan browser Anda. Silakan pilih saluran lain yang menggunakan tautan HTTPS.';
  }
  if (isStaticDeployment()) {
    return 'Gagal memuat saluran di GitHub Pages. Ini disebabkan oleh pemblokiran kebijakan CORS (Cross-Origin Resource Sharing) browser pada server tayangan, atau tautan sedang offline. Di hosting statis, putar saluran yang mendukung akses CORS atau pasang ekstensi bypass seperti "CORS Unblock" di Chrome/Firefox Anda.';
  }
  return 'Saluran tidak dapat diakses. Ini bisa disebabkan oleh pemblokiran CORS browser, stream mati, atau butuh VPN.';
}

export default function IPTVPlayer({ 
  channel, 
  isFavorite, 
  onToggleFavorite,
  onNextChannel,
  onPrevChannel,
  onChannelOffline
}: IPTVPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('player_volume');
    return saved ? parseFloat(saved) : 0.8;
  });
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [qualityLevels, setQualityLevels] = useState<{ id: number; name: string }[]>([]);
  const [currentQualityIndex, setCurrentQualityIndex] = useState<number>(-1);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [playerLogoError, setPlayerLogoError] = useState(false);
  const [showTips, setShowTips] = useState(false);

  // Controls auto-hide timeout
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load stream
  useEffect(() => {
    if (!channel) return;

    let active = true;
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setErrorMsg(null);
    setPlaying(false);
    setQualityLevels([]);
    setCurrentQualityIndex(-1);
    setAnalysisData(null);
    setIsAnalyzing(true);
    setPlayerLogoError(false);

    // Destroy existing Hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const runValidationAndLoad = async () => {
      let currentAnalysis: any = null;
      try {
        if (isStaticDeployment()) {
          throw new Error("Skipping API call on static host");
        }
        const response = await fetch(`/api/analyze-hls?url=${encodeURIComponent(channel.url)}`);
        if (!active) return;
        if (response.ok) {
          const data = await response.json();
          currentAnalysis = data;
          setAnalysisData(data);
          
          if (data.status === 'offline' || data.status === 'error') {
            setIsLoading(false);
            setIsAnalyzing(false);
            setErrorMsg(`Saluran offline atau gagal dimuat: ${data.error || 'Server tidak menjawab'}`);
            if (channel) {
              onChannelOffline?.(channel.url);
            }
            return;
          }
        }
      } catch (err: any) {
        console.warn('Pre-analysis check skipped or error, trying playback directly:', err);
      }

      if (!active) return;
      setIsAnalyzing(false);

      // Try playing Native HLS (iOS, macOS Safari)
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = channel.url;
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('error', handleNativeError);
      } 
      // Otherwise use Hls.js
      else if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60,
        });

        hlsRef.current = hls;
        hls.loadSource(channel.url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          video.play()
            .then(() => setPlaying(true))
            .catch(() => {
              // Auto play might have been blocked
              setPlaying(false);
            });

          if (hls.levels && hls.levels.length > 0) {
            const levels = hls.levels.map((level, index) => {
              const height = level.height ? `${level.height}p` : '';
              const bitrateStr = level.bitrate ? `${(level.bitrate / 1000000).toFixed(1)}M` : '';
              const name = height || bitrateStr || `Track ${index + 1}`;
              
              // Filter active sub-playlist check from server analysis
              let isTrackActive = true;
              if (currentAnalysis && currentAnalysis.variants && currentAnalysis.variants.length > 0) {
                const matchedVariant = currentAnalysis.variants.find((v: any) => {
                  if (v.resolution && level.width && level.height) {
                    return v.resolution === `${level.width}x${level.height}` || v.resolution.endsWith(`x${level.height}`);
                  }
                  return false;
                });
                if (matchedVariant) {
                  isTrackActive = matchedVariant.active !== false;
                } else if (currentAnalysis.variants.length === hls.levels.length) {
                  isTrackActive = currentAnalysis.variants[index].active !== false;
                }
              }

              return {
                id: index,
                name: name,
                active: isTrackActive
              };
            });

            // Filter out inactive streams before displaying
            const activeOnlyLevels = levels.filter(l => l.active);
            setQualityLevels(activeOnlyLevels);
            setCurrentQualityIndex(hls.currentLevel);
          } else {
            setQualityLevels([]);
          }
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          setCurrentQualityIndex(data.level);
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn('Network error, attempting recovery...', data);
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn('Media stability error, attempting recovery...', data);
                hls.recoverMediaError();
                break;
              default:
                setIsLoading(false);
                setErrorMsg(getPlayableErrorMessage(channel?.url));
                if (channel) {
                  onChannelOffline?.(channel.url);
                }
                hls.destroy();
                hlsRef.current = null;
                break;
            }
          }
        });
      } else {
        setIsLoading(false);
        setErrorMsg('Browser Anda tidak mendukung pemutaran HLS (.m3u8).');
      }
    };

    runValidationAndLoad();

    return () => {
      active = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (video) {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleNativeError);
      }
    };
  }, [channel]);

  // Handle video events
  const handleLoadedMetadata = () => {
    setIsLoading(false);
    videoRef.current?.play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  };

  const handleNativeError = () => {
    setIsLoading(false);
    setErrorMsg(getPlayableErrorMessage(channel?.url));
    if (channel) {
      onChannelOffline?.(channel.url);
    }
  };

  // Sync volume state to video element
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume;
      video.muted = muted;
    }
    localStorage.setItem('player_volume', volume.toString());
  }, [volume, muted]);

  // Toggle Play
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || !channel) return;

    if (playing) {
      video.pause();
      setPlaying(false);
    } else {
      video.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    setMuted(!muted);
  };

  // Handle Volume Slider
  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (newVol > 0) {
      setMuted(false);
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen()
        .then(() => setFullscreen(true))
        .catch(err => console.error(err));
    } else {
      document.exitFullscreen()
        .then(() => setFullscreen(false));
    }
  };

  // Track fullscreen changes (e.g. Escape key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in search input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyN':
          e.preventDefault();
          if (onNextChannel) onNextChannel();
          break;
        case 'KeyP':
          e.preventDefault();
          if (onPrevChannel) onPrevChannel();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(prev => Math.min(1, prev + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(prev => Math.max(0, prev - 0.1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [playing, muted, channel, onNextChannel, onPrevChannel]);

  // Controls auto hide
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (playing && !isLoading) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [playing, isLoading]);

  const retryStream = () => {
    if (channel) {
      setIsLoading(true);
      setErrorMsg(null);
      // Trigger load reload by re-assigning video source
      const video = videoRef.current;
      if (video) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        
        if (Hls.isSupported()) {
          const hls = new Hls();
          hlsRef.current = hls;
          hls.loadSource(channel.url);
          hls.attachMedia(video);
        } else {
          video.src = channel.url;
        }
      }
    }
  };

  const changeQuality = (index: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
      setCurrentQualityIndex(index);
    }
  };

  return (
    <div id="media-player-section" className="flex flex-col gap-4">
      {/* Dynamic Player Screen Wrapper */}
      <div 
        ref={containerRef}
        id="video-player-container"
        className="relative aspect-video w-full rounded-2xl bg-black overflow-hidden shadow-2xl border border-slate-800 group focus:outline-none"
        onMouseMove={resetControlsTimeout}
        onMouseLeave={() => playing && !isLoading && setShowControls(false)}
      >
        <video 
          ref={videoRef}
          id="iptv-video-element"
          className="w-full h-full object-contain cursor-pointer"
          onClick={() => {
            // Pada perangkat layar sentuh, ketukan pertama menampilkan bilah kontrol jika sedang disembunyikan
            if (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
              if (!showControls) {
                setShowControls(true);
                resetControlsTimeout();
                return;
              }
            }
            togglePlay();
          }}
          playsInline
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-20 animate-fade-in">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-t-2 border-r-2 border-indigo-500 animate-spin"></div>
              <Tv className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-indigo-400 animate-pulse" />
            </div>
            <p className="mt-4 text-emerald-400 text-sm font-medium tracking-wide">
              {isAnalyzing ? 'Menganalisis keaktifan saluran & kualitas...' : 'Menghubungkan ke siaran...'}
            </p>
            {channel && (
              <p className="mt-1 text-slate-400 text-xs truncate max-w-md">
                {channel.name}
              </p>
            )}
          </div>
        )}

        {/* Empty State / Select Playlist */}
        {!channel && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 gap-4 text-center p-6 border-2 border-dashed border-slate-800 rounded-2xl">
            <div className="p-4 rounded-full bg-slate-900 border border-slate-800 text-slate-500">
              <Tv className="h-12 w-12 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-200">Silakan Pilih Saluran</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-sm">
                Klik saluran di daftar sebelah kanan atau kiri untuk memulai streaming live TV secara instan.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs text-indigo-300 flex items-center gap-1.5">
                <Flame className="h-3 w-3 text-indigo-400" />
                M3U Auto-parsed
              </div>
              <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-300 flex items-center gap-1.5">
                <Heart className="h-3 w-3 text-emerald-400" />
                Fitur Favorit
              </div>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {errorMsg && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 z-20 p-6 text-center animate-fade-in overflow-y-auto">
            {!showTips ? (
              <>
                <AlertTriangle className="h-10 w-10 text-rose-500 mb-2 animate-bounce" />
                <h4 className="text-base font-bold text-slate-200">Koneksi Stream Gagal</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">
                  {errorMsg}
                </p>
                <div className="mt-4 flex gap-3">
                  <button 
                    onClick={retryStream}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-2 cursor-pointer border border-slate-700"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Coba Lagi
                  </button>
                  <button 
                    onClick={() => setShowTips(true)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Info className="h-3.5 w-3.5" />
                    Tips Pemutaran
                  </button>
                </div>
              </>
            ) : (
              <div className="w-full max-w-md p-4 bg-slate-900 border border-slate-800 rounded-xl text-left animate-fade-in">
                <div className="font-bold text-white text-xs mb-2 flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5 text-indigo-400">
                    <Info className="h-4 w-4" />
                    Penyebab &amp; Solusi Pemutaran
                  </span>
                  <button 
                    onClick={() => setShowTips(false)}
                    className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-950 text-[10px]"
                  >
                    Kembali
                  </button>
                </div>
                <ul className="list-disc pl-4 space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                  <li><strong>CORS Block (Utama):</strong> Browser membatasi akses regional link TV. Pasang ekstensi <strong>&quot;Allow CORS&quot;</strong> di Chrome/Firefox Anda untuk kelancaran.</li>
                  <li><strong>Tautan Offline:</strong> Saluran ini mungkin sedang dalam perbaikan (offline) sementara dari penyedianya.</li>
                  <li><strong>Mixed Content:</strong> Beberapa saluran menggunakan tautan http non-aman yang diblokir otomatis oleh protokol https kami.</li>
                  <li><strong>Blokir Wilayah:</strong> Gunakan VPN (lokasi Indonesia/sesuai) jika saluran dilindungi hak siar wilayah.</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Player Controls Overlay */}
        {channel && !errorMsg && (
          <div 
            id="player-ui-controls"
            className={`absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/40 z-10 flex flex-col justify-between p-4 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Top Bar (Channel Info in Stream) */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {channel.logo && !playerLogoError ? (
                  <img 
                    src={channel.logo} 
                    alt={channel.name} 
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 object-contain rounded-lg bg-slate-900/65 p-1 border border-slate-800 shrink-0"
                    onError={() => {
                      setPlayerLogoError(true);
                    }}
                  />
                ) : (
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold shrink-0">
                    <Tv className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-white font-bold truncate max-w-xs sm:max-w-md group-hover:text-amber-400 transition">
                    {channel.name}
                  </h4>
                  <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block">
                    {channel.category}
                  </span>
                </div>
              </div>

              {/* Top Controls: Favorite, Stream Status */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold animate-pulse-slow">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block"></span>
                  LIVE STREAM
                </div>
                <button
                  onClick={onToggleFavorite}
                  className={`p-2 rounded-lg backdrop-blur bg-slate-900/60 hover:bg-slate-900/90 text-white transition cursor-pointer border ${
                    isFavorite 
                      ? 'border-rose-500/40 text-rose-500 hover:text-rose-400' 
                      : 'border-slate-800 text-slate-300 hover:text-rose-500'
                  }`}
                  title={isFavorite ? "Hapus dari Favorit" : "Tambah ke Favorit"}
                >
                  <Heart className={`h-4.5 w-4.5 ${isFavorite ? 'fill-rose-500' : ''}`} />
                </button>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="flex flex-col gap-3">
              {/* Media Controls Row */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* Playback Controls Group */}
                  <div className="flex items-center gap-2">
                    {/* Skip Back / Prev Channel */}
                    <button
                      onClick={onPrevChannel}
                      className="p-2 rounded-full bg-slate-900/40 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800/60 transition active:scale-95 cursor-pointer"
                      title="Saluran Sebelumnya (P)"
                    >
                      <SkipBack className="h-4 w-4 fill-current" />
                    </button>

                    <button 
                      onClick={togglePlay}
                      className="p-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition hover:scale-105 active:scale-95 shadow-md shadow-indigo-600/30 cursor-pointer"
                    >
                      {playing ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white ml-0.5" />}
                    </button>

                    {/* Skip Forward / Next Channel */}
                    <button
                      onClick={onNextChannel}
                      className="p-2 rounded-full bg-slate-900/40 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800/60 transition active:scale-95 cursor-pointer"
                      title="Saluran Selanjutnya (N)"
                    >
                      <SkipForward className="h-4 w-4 fill-current" />
                    </button>
                  </div>

                  {/* Volume Control */}
                  <div className="flex items-center gap-2 group/volume ml-1">
                    <button 
                      onClick={toggleMute}
                      className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900/60 transition cursor-pointer"
                    >
                      {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </button>
                    <input 
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={muted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="hidden sm:block w-16 sm:w-24 accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer transition-all focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Quality Dropdown Selector */}
                  {qualityLevels.length > 0 && (
                    <div className="relative">
                      <select
                        id="hls-quality-selector"
                        value={currentQualityIndex}
                        onChange={(e) => changeQuality(parseInt(e.target.value, 10))}
                        className="bg-slate-950 border border-slate-800/80 text-indigo-400 focus:text-indigo-300 font-bold text-[10px] sm:text-xs rounded-lg px-2 py-1.5 outline-none transition cursor-pointer font-mono shadow-md"
                        title="Pilih Resolusi Siaran"
                      >
                        <option value={-1}>Auto</option>
                        {qualityLevels.map((lvl) => (
                          <option key={lvl.id} value={lvl.id}>
                            {lvl.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="text-xs px-2 py-1 bg-slate-900/60 border border-slate-800 rounded font-mono text-slate-400">
                    Live Video
                  </div>

                  {/* Maximize Button */}
                  <button 
                    onClick={toggleFullscreen}
                    className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900/60 transition cursor-pointer"
                    title={fullscreen ? "Keluar Layar Penuh" : "Layar Penuh (F)"}
                  >
                    {fullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Under Player Meta Metadata Card */}
      {channel && (
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block"></span>
                Online
              </span>
              <span className="text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">
                IPTV Player Premium
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-100 mt-1">{channel.name}</h2>
            <p className="text-xs text-slate-400 truncate max-w-sm sm:max-w-xl">
              Source URL: <span className="font-mono text-[10px] text-slate-500 select-all">{channel.url}</span>
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
               onClick={retryStream}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-2 border border-slate-700 transition"
              title="Muat ulang saluran saat ini"
            >
              <RefreshCw className="h-3 w-3" />
              Reset Koneksi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
