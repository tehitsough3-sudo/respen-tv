import { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  Heart, 
  Compass, 
  Grid, 
  List, 
  X,
  History,
  Trash2,
  FolderOpen,
  Sparkles
} from 'lucide-react';
import { IPTVChannel } from '../types';

interface ChannelListProps {
  channels: IPTVChannel[];
  activeChannel: IPTVChannel | null;
  onSelectChannel: (channel: IPTVChannel) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  isPlaylistLoading: boolean;
  playlistError: string | null;
  recentlyWatched: IPTVChannel[];
  onClearRecentlyWatched: () => void;
  offlineUrls?: string[];
  onMarkOffline?: (url: string) => void;
  onClearOffline?: () => void;
}

export default function ChannelList({
  channels,
  activeChannel,
  onSelectChannel,
  favorites,
  onToggleFavorite,
  isPlaylistLoading,
  playlistError,
  recentlyWatched = [],
  onClearRecentlyWatched,
  offlineUrls = [],
  onMarkOffline,
  onClearOffline
}: ChannelListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [limit, setLimit] = useState(80); // Pagination/Limit rendering for ultimate performance
  
  // Offline filter & scanning states
  const [hideOffline, setHideOffline] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanTotal, setScanTotal] = useState(0);
  const [scanOfflineCount, setScanOfflineCount] = useState(0);

  const abortRef = useRef<boolean>(false);

  // Background scanner function with parallel batch check (size 6)
  const startChannelScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress(0);
    setScanOfflineCount(0);
    abortRef.current = false;

    // Scan up to 120 channels from the current list for practical feedback
    const channelsToScan = filteredBaseChannels.slice(0, 120);
    setScanTotal(channelsToScan.length);

    const batchSize = 6;
    let index = 0;

    while (index < channelsToScan.length && !abortRef.current) {
      const batch = channelsToScan.slice(index, index + batchSize);
      const promises = batch.map(async (ch) => {
        try {
          const response = await fetch(`/api/analyze-hls?url=${encodeURIComponent(ch.url)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.status === 'offline' || data.status === 'error') {
              onMarkOffline?.(ch.url);
              setScanOfflineCount(prev => prev + 1);
            }
          } else {
            onMarkOffline?.(ch.url);
            setScanOfflineCount(prev => prev + 1);
          }
        } catch (err) {
          onMarkOffline?.(ch.url);
          setScanOfflineCount(prev => prev + 1);
        } finally {
          if (!abortRef.current) {
            setScanProgress(p => Math.min(p + 1, channelsToScan.length));
          }
        }
      });

      await Promise.all(promises);
      index += batchSize;
      
      // Yield thread momentarily
      await new Promise(r => setTimeout(r, 100));
    }

    setIsScanning(false);
  };

  const stopChannelScan = () => {
    abortRef.current = true;
    setIsScanning(false);
  };

  // Auto trigger scan on initial load/reload when channels are fetched
  useEffect(() => {
    let active = true;
    if (channels && channels.length > 0) {
      const timer = setTimeout(() => {
        if (active) {
          startChannelScan();
        }
      }, 1000); // 1s buffer for smooth rendering transition
      
      return () => {
        active = false;
        clearTimeout(timer);
        abortRef.current = true;
      };
    }
  }, [channels]);

  // Dynamically extract distinct categories from the loaded channels
  const dynamicCategories = useMemo(() => {
    const cats = new Set<string>();
    const activeChannels = channels.filter(ch => !offlineUrls.includes(ch.url));
    activeChannels.forEach(ch => {
      if (ch.category && ch.category.trim()) {
        cats.add(ch.category.trim());
      }
    });
    return Array.from(cats).sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const target = "piala dunia";
      const isTargetA = aLower.includes(target);
      const isTargetB = bLower.includes(target);
      if (isTargetA && !isTargetB) return -1;
      if (!isTargetA && isTargetB) return 1;
      return a.localeCompare(b);
    });
  }, [channels, offlineUrls]);

  // Base list of channels ignoring search query, used specifically for scanning bounds
  const filteredBaseChannels = useMemo(() => {
    let baseList = channels;

    if (hideOffline && offlineUrls.length > 0) {
      baseList = baseList.filter(ch => !offlineUrls.includes(ch.url));
    }

    if (selectedCategory === 'Favorit') {
      baseList = baseList.filter(ch => favorites.includes(ch.id));
    } else if (selectedCategory === 'Riwayat') {
      baseList = recentlyWatched.filter(ch => !hideOffline || !offlineUrls.includes(ch.url));
    } else if (selectedCategory !== 'Semua') {
      baseList = baseList.filter(ch => ch.category === selectedCategory);
    }
    return baseList;
  }, [channels, recentlyWatched, selectedCategory, favorites, hideOffline, offlineUrls]);

  // Handle comprehensive filtering & searching logic
  const filteredChannels = useMemo(() => {
    return filteredBaseChannels.filter(ch => {
      // Search text matches (lower case)
      const matchesSearch = 
        ch.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (ch.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ch.country || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }, [filteredBaseChannels, searchQuery]);

  // Display limited subset + load-more for high performance
  const displayedChannels = useMemo(() => {
    return filteredChannels.slice(0, limit);
  }, [filteredChannels, limit]);

  const loadMore = () => {
    setLimit(prev => prev + 80);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div id="channel-explorer-section" className="bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col h-[720px] overflow-hidden">
      
      {/* Search and Quick Filters Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Cari nama saluran TV..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setLimit(80); // Reset render limit on search
            }}
            className="w-full bg-slate-950 text-slate-100 placeholder-slate-500 pl-11 pr-10 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-medium text-sm"
          />
          {searchQuery && (
            <button 
              onClick={clearSearch}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Dynamic Horizontal Categories Scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {/* Item: Semua */}
          <button
            onClick={() => {
              setSelectedCategory('Semua');
              setLimit(80);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-all duration-200 border flex items-center gap-1.5 ${
              selectedCategory === 'Semua'
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Semua ({channels.filter(ch => !offlineUrls.includes(ch.url)).length})</span>
          </button>

          {/* Item: Favorit */}
          <button
            onClick={() => {
              setSelectedCategory('Favorit');
              setLimit(80);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-all duration-200 border flex items-center gap-1.5 ${
              selectedCategory === 'Favorit'
                ? 'bg-rose-600 border-rose-500 text-white shadow-sm'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-900/35 hover:bg-slate-900/40'
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${selectedCategory === 'Favorit' ? 'fill-white' : ''}`} />
            <span>Favorit ({channels.filter(ch => favorites.includes(ch.id) && !offlineUrls.includes(ch.url)).length})</span>
          </button>

          {/* Item: Riwayat */}
          <button
            onClick={() => {
              setSelectedCategory('Riwayat');
              setLimit(80);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-all duration-200 border flex items-center gap-1.5 ${
              selectedCategory === 'Riwayat'
                ? 'bg-violet-600 border-violet-500 text-white shadow-sm'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-violet-400 hover:border-violet-900/35 hover:bg-slate-900/40'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Riwayat ({recentlyWatched.filter(ch => !offlineUrls.includes(ch.url)).length})</span>
          </button>

          {/* Map dynamic categories */}
          {dynamicCategories.map(cat => {
            const count = channels.filter(ch => ch.category === cat && !offlineUrls.includes(ch.url)).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setLimit(80);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-all duration-200 border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <FolderOpen className="h-3.5 w-3.5 text-indigo-400/80" />
                <span>{cat} ({count})</span>
              </button>
            );
          })}
        </div>

        {/* View / Clear History Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs pt-1 border-t border-slate-800/40">
          <div className="text-slate-400 font-medium flex items-center gap-1.5 flex-wrap">
            <span>Kategori:</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-950 text-indigo-300 font-bold font-mono">
              {selectedCategory}
            </span>
            
            {/* Saring Saluran Mati Toggle */}
            <button
              onClick={() => setHideOffline(!hideOffline)}
              className={`px-2 py-0.5 rounded-md border text-[10px] font-bold transition duration-200 cursor-pointer ${
                hideOffline 
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title={hideOffline ? "Daftar otomatis menyaring saluran yang tidak aktif. Klik untuk melihat seluruh saluran." : "Aktifkan penyaringan saluran mati."}
            >
              {hideOffline ? '● Saring Mati: Aktif' : '○ Saring Mati: Mati'}
            </button>

            {offlineUrls.length > 0 && (
              <button
                onClick={onClearOffline}
                className="px-2 py-0.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 rounded-md text-[10px] font-mono font-bold transition cursor-pointer"
                title="Pulihkan semua saluran yang sebelumnya terdeteksi mati."
              >
                Reset ({offlineUrls.length} CH)
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Scan button */}
            <button
              onClick={startChannelScan}
              disabled={isScanning || channels.length === 0}
              className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all ${
                isScanning
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 animate-pulse cursor-wait'
                  : 'bg-indigo-600/15 border-indigo-500/25 text-indigo-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-500'
              }`}
              title="Pindai dan uji status keaktifan saluran-saluran di bawah ini via HLS.js"
            >
              <Sparkles className={`h-3 w-3 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Memindai...' : `Pindai HLS (${Math.min(filteredBaseChannels.length, 120)})`}</span>
            </button>

            {selectedCategory === 'Riwayat' && recentlyWatched.length > 0 && (
              <button
                onClick={onClearRecentlyWatched}
                className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                title="Hapus semua riwayat tontonan"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Hapus Riwayat</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 bg-slate-950 p-1 border border-slate-800 rounded-xl">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1 flex items-center justify-center rounded-lg transition cursor-pointer ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Daftar Vertikal"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 flex items-center justify-center rounded-lg transition cursor-pointer ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Grid Visual"
              >
                <Grid className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Filter categories tab and channel list */}
      <div className="flex-1 flex overflow-hidden bg-slate-950/10">
        
        {/* Channel Cards List - wide space filling */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 relative bg-slate-950/10">
          
          {isPlaylistLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-xs z-10">
              <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
              <p className="mt-3 text-slate-400 text-xs font-medium">Memproses daftar putar...</p>
            </div>
          )}

          {playlistError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs leading-relaxed">
              <span className="font-bold block mb-1">Gagal Sinkronisasi Playlist:</span>
              {playlistError}
            </div>
          )}

          {/* Scanning Progress Bar Container */}
          {isScanning && (
            <div className="bg-indigo-950/30 border border-indigo-800/40 p-3 rounded-xl flex flex-col gap-2 shadow-inner">
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="text-indigo-300 font-bold flex items-center gap-1.5 animate-pulse">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-spin" />
                  Memindai Saluran ({scanProgress}/{scanTotal})
                </span>
                <button 
                  onClick={stopChannelScan}
                  className="px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500 hover:text-white border border-rose-500/20 text-rose-300 rounded text-[10px] font-bold cursor-pointer transition"
                >
                  Batal
                </button>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-900">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full transition-all duration-300"
                  style={{ width: `${(scanProgress / scanTotal) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-indigo-400/90 font-mono">
                Menemukan <strong className="text-rose-400 font-bold">{scanOfflineCount}</strong> saluran mati. Saluran tersebut disembunyikan secara otomatis.
              </p>
            </div>
          )}

          {/* Empty filtered channels state */}
          {!isPlaylistLoading && filteredChannels.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <Compass className="h-8 w-8 text-slate-600 mb-2 animate-bounce" />
              <p className="text-sm font-semibold text-slate-300">Tidak ada saluran ditemukan</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Coba sesuaikan kata kunci pencarian Anda atau kembalikan filter kategori ke &quot;Semua&quot;.
              </p>
            </div>
          )}

          {/* Active channels container depending on View Mode */}
          {!isPlaylistLoading && filteredChannels.length > 0 && (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5' 
              : 'flex flex-col gap-1.5'
            }>
              {displayedChannels.map((ch, idx) => {
                const isActive = activeChannel?.url === ch.url;
                const isChFavorite = favorites.includes(ch.id);

                return (
                  <div
                    key={`${ch.id}-${idx}-${ch.url}`}
                    onClick={() => onSelectChannel(ch)}
                    className={`relative rounded-xl border p-2.5 transition group cursor-pointer flex ${
                      viewMode === 'grid' 
                        ? 'flex-col justify-between items-center text-center gap-2 h-36' 
                        : 'align-center justify-between gap-3 h-16'
                    } ${
                      isActive 
                        ? 'bg-indigo-600/15 border-indigo-500/60 shadow-md shadow-indigo-600/5' 
                        : 'bg-slate-900/30 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
                    }`}
                  >
                    
                    {/* Main item details layout */}
                    <div className={`flex flex-1 ${viewMode === 'grid' ? 'flex-col items-center justify-center' : 'items-center gap-3'} min-w-0`}>
                      
                      {/* Logo Frame */}
                      <div className={`shrink-0 flex items-center justify-center rounded-lg bg-slate-950 font-bold border ${
                        isActive ? 'border-indigo-500/40' : 'border-slate-800'
                      } ${viewMode === 'grid' ? 'h-14 w-14 p-1.5' : 'h-11 w-11 p-1'}`}>
                        {ch.logo ? (
                          <img 
                            src={ch.logo} 
                            alt={ch.name} 
                            className="h-full w-full object-contain"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              // If image fails, replace with textual fallback
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                        {(!ch.logo) && (
                          <span className={`text-[10px] uppercase font-mono tracking-wider ${isActive ? 'text-indigo-400' : 'text-slate-400'}`}>
                            {ch.name.substring(0, 3)}
                          </span>
                        )}
                      </div>

                      {/* Info Text */}
                      <div className={`min-w-0 text-left ${viewMode === 'grid' ? 'text-center mt-1' : ''}`}>
                        <p className={`text-xs font-bold truncate ${isActive ? 'text-indigo-300' : 'text-slate-200 group-hover:text-indigo-400 transition'}`}>
                          {ch.name}
                        </p>
        {viewMode !== 'grid' && (ch.category || ch.country) && (
          <p className="text-[10px] text-slate-500 truncate mt-0.5 flex items-center gap-1">
            {ch.category && <span className="text-indigo-400 font-semibold">{ch.category}</span>}
            {ch.category && ch.country && <span className="text-slate-600">•</span>}
            {ch.country && <span className="truncate">{ch.country}</span>}
          </p>
        )}
                      </div>
                    </div>

                    {/* Action buttons (favorite, live status indicator) */}
                    <div className={`flex items-center gap-1.5 ${viewMode === 'grid' ? 'absolute top-1.5 right-1.5' : ''}`}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(ch.id);
                        }}
                        className={`p-1.5 rounded-lg border transition duration-200 cursor-pointer ${
                          isChFavorite 
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' 
                            : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-rose-500 hover:bg-slate-900'
                        }`}
                        title={isChFavorite ? "Hapus dari Favorit" : "Simpan Favorit"}
                      >
                        <Heart className={`h-3 w-3 ${isChFavorite ? 'fill-rose-500' : ''}`} />
                      </button>
                      
                      {isActive && viewMode !== 'grid' && (
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Render more channels pagination button */}
          {filteredChannels.length > limit && (
            <button
              onClick={loadMore}
              className="mt-3 px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-indigo-500/35 hover:text-indigo-400 text-slate-400 text-xs font-bold rounded-xl transition text-center cursor-pointer"
            >
              Tampilkan Lebih Banyak Saluran (+80 CH)
            </button>
          )}

          {/* Results count text indicator */}
          <div className="text-[10px] text-slate-500 font-mono text-center mt-2 p-1 bg-slate-950/35 rounded-lg">
            Menampilkan <span className="text-slate-400 font-bold">{Math.min(filteredChannels.length, limit)}</span> dari <span className="text-slate-400 font-bold">{filteredChannels.length}</span> saluran.
          </div>
        </div>
      </div>
    </div>
  );
}
