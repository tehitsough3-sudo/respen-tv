import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { isStaticDeployment } from '../utils/staticCheck';
import { 
  Sparkles, 
  Search, 
  Copy, 
  Check, 
  Loader2, 
  Github, 
  ExternalLink, 
  Tv, 
  Info, 
  X,
  RefreshCw,
  TrendingUp,
  ArrowRight
} from 'lucide-react';

interface AISearchResult {
  title: string;
  description: string;
  url: string;
  source?: string;
  category?: string;
}

interface AIPlaylistFinderProps {
  onSelectPlaylist: (url: string) => void;
  currentPlaylistUrl: string;
}

const TEMPLATE_QUERIES = [
  { label: '🇮🇩 Indonesia TV', query: 'IPTV Indonesia lokal nasional' },
  { label: '⚽ Sports Channels', query: 'Sports IPTV channels beIN ESPN Sky football' },
  { label: '🎭 Asian Drama & K-Pop', query: 'Korean Japanese Asian IPTV drama music channels' },
  { label: '🌍 Global News', query: 'Global international English news channels BBC CNN Al Jazeera' },
  { label: '🎬 Movies & Entertainment', query: 'Free IPTV movie channels documenter cinema' },
];

export default function AIPlaylistFinder({ onSelectPlaylist, currentPlaylistUrl }: AIPlaylistFinderProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AISearchResult[]>([]);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);

  // Run the AI search grounding endpoint
  const handleAISearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setIsFallback(false);
    setFallbackReason(null);
    setSearched(true);

    if (isStaticDeployment()) {
      // Return high-quality pre-vetted public playlists immediately for static hosting
      setTimeout(() => {
        const queryLower = searchQuery.toLowerCase();
        
        const allStatic = [
          {
            title: "Piala Dunia & Sports TV (TV.m3u8)",
            description: "Daftar saluran khusus bertema olahraga sepakbola dan saluran lokal pilihan terpopuler.",
            url: "https://raw.githubusercontent.com/doms9/iptv/refs/heads/default/M3U8/TV.m3u8",
            category: "Sports & Local",
            source: "GitHub doms9"
          },
          {
            title: "IPTV Indonesia (id.m3u8)",
            description: "Daftar playlist resmi iptv-org berisi siaran lokal Indonesia paling lengkap, terstruktur, dan bersih.",
            url: "https://iptv-org.github.io/iptv/countries/id.m3u8",
            category: "Indonesia",
            source: "GitHub iptv-org"
          },
          {
            title: "IPTV Global Sports (sports.m3u8)",
            description: "Rangkuman siaran televisi berbasis olahraga global terlengkap dari komunitas open source.",
            url: "https://iptv-org.github.io/iptv/categories/sports.m3u8",
            category: "Global Sports",
            source: "GitHub iptv-org"
          },
          {
            title: "IPTV Global News (news.m3u8)",
            description: "Kumpulan siaran televisi berita dunia terkemuka sperti BBC, CNN, DW, Al Jazeera secara real-time.",
            url: "https://iptv-org.github.io/iptv/categories/news.m3u8",
            category: "Global News",
            source: "GitHub iptv-org"
          },
          {
            title: "IPTV Entertainment & Movies (movies.m3u8)",
            description: "Stasiun tv hiburan komedi petualangan, kartun, sinema, dan drama dari repositori global.",
            url: "https://iptv-org.github.io/iptv/categories/movies.m3u8",
            category: "Entertainment",
            source: "GitHub iptv-org"
          }
        ];
        
        let matches = [];
        if (queryLower.includes("indonesia") || queryLower.includes("lokal") || queryLower.includes("nasional") || queryLower.includes("id")) {
          matches = [allStatic[1], allStatic[0]];
        } else if (queryLower.includes("sport") || queryLower.includes("olahraga") || queryLower.includes("bola") || queryLower.includes("piala") || queryLower.includes("dunia")) {
          matches = [allStatic[0], allStatic[2]];
        } else if (queryLower.includes("news") || queryLower.includes("berita")) {
          matches = [allStatic[3]];
        } else if (queryLower.includes("movie") || queryLower.includes("film") || queryLower.includes("drama") || queryLower.includes("entertainment") || queryLower.includes("hiburan")) {
          matches = [allStatic[4]];
        } else {
          matches = allStatic;
        }
        
        setResults(matches);
        setIsFallback(true);
        setFallbackReason("Pencarian AI real-time dinonaktifkan di media statis (GitHub Pages). Berikut adalah tautan database playlist open-source paling relevan.");
        setLoading(false);
      }, 500);
      return;
    }
    
    try {
      const res = await fetch('/api/ai-search-playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!res.ok) {
        let errBody;
        try {
          errBody = await res.json();
        } catch {
          // ignore
        }
        throw new Error(errBody?.error || `Gagal menjalankan pencarian AI (Status: ${res.status})`);
      }

      const data = await res.json();
      setResults(data.results || []);
      setIsFallback(!!data.isFallback);
      setFallbackReason(data.reason || null);
    } catch (err: any) {
      console.error('[AI search frontend error]:', err);
      setError(err.message || 'Terjadi gangguan saat menghubungi AI Gemini di backend. Pastikan API Key diatur.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <div className="bg-slate-900/45 border border-slate-800/80 rounded-2xl p-5 md:p-6 backdrop-blur-md shadow-2xl relative overflow-hidden">
      
      {/* Decorative gradient overlay */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header title */}
      <div className="flex items-center gap-3.5 mb-5">
        <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
          <Sparkles className="h-5 w-5 animate-pulse" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
            AI GitHub IPTV Finder
            <span className="text-[10px] bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider scale-90">
              Gemini 3.5 Grounding
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Cari &amp; temukan file playlist M3U/M3U8 aktif yang dibagikan publik di repositori GitHub secara real-time.
          </p>
        </div>
      </div>

      {/* Control Search Bar */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleAISearch(query);
        }}
        className="flex gap-2 max-w-full"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
            placeholder="Ketik topik, negara atau kategori saluran (contoh: 'TV Indonesia', 'sports', 'UK news')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/15"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span>Cari</span>
        </button>
      </form>

      {/* Template Suggestions Chips */}
      <div className="mt-4">
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-2 flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-indigo-400/80" /> Topik Populer:
        </span>
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_QUERIES.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                setQuery(item.query);
                handleAISearch(item.query);
              }}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-slate-950/60 hover:bg-indigo-500/10 text-xs text-slate-400 hover:text-indigo-300 border border-slate-800/60 hover:border-indigo-500/30 transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Display Results */}
      <div className="mt-6 border-t border-slate-800/40 pt-5">
        
        {/* Loading State */}
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-10 text-center gap-3 bg-slate-950/30 rounded-xl border border-slate-900"
          >
            <div className="relative">
              <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
              <Sparkles className="h-4 w-4 text-fuchsia-400 absolute top-1 right-1 animate-ping" />
            </div>
            <div>
              <p className="text-sm font-bold text-indigo-300">Gemini sedang menelusuri GitHub...</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1 px-4">
                mencari daftar berkas M3U yang aktif, mengekstrak URL raw dari repository publik dan memformatnya sistematis.
              </p>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {error && !loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-400 text-xs flex items-start gap-2.5"
          >
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">Metode Pencarian Gagal</span>
              {error}
            </div>
          </motion.div>
        )}

        {/* Empty State before search */}
        {!searched && !loading && (
          <div className="text-center py-8 bg-slate-950/20 rounded-xl border border-slate-900 border-dashed text-slate-500">
            <Tv className="h-8 w-8 text-slate-600 mx-auto mb-2 opacity-50" />
            <p className="text-xs">
              Mulai pencarian di atas untuk memanggil AI Gemini menelusuri repositori IPTV di GitHub.
            </p>
          </div>
        )}

        {/* Empty State no results */}
        {searched && !loading && !error && results.length === 0 && (
          <div className="text-center py-8 bg-slate-950/20 rounded-xl border border-slate-900 text-slate-400">
            <Info className="h-6 w-6 text-indigo-400 mx-auto mb-1.5" />
            <p className="text-sm font-bold">Hasil tidak ditemukan</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              AI tidak menemukan tautan m3u/m3u8 langsung untuk "${query}". Cobalah query lain yang lebih umum atau pilih topik di atas.
            </p>
          </div>
        )}

        {/* Render Grid Cards */}
        {searched && !loading && !error && results.length > 0 && (
          <div className="space-y-3.5">
            {isFallback && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-start gap-3 shadow-inner mb-4"
              >
                <div className="p-1.5 rounded-lg bg-indigo-500/25 text-indigo-400 mt-0.5 shrink-0">
                  <Sparkles className="h-4 w-4 animate-pulse text-indigo-300" />
                </div>
                <div>
                  <span className="font-bold block text-indigo-200 mb-1 flex items-center gap-1.5">
                    Mode Cadangan Cerdas Aktif
                    <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-black uppercase">
                      Offline Matcher
                    </span>
                  </span>
                  <p className="text-slate-400 leading-relaxed">
                    {fallbackReason || "Pencarian AI dialihkan ke daftar M3U publik lokal yang populer dan stabil dari repositori GitHub utama lantaran batas kuota server."}
                  </p>
                </div>
              </motion.div>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Hasil Pencarian Pintar ({results.length})</span>
              <span className="text-emerald-400 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                ● Live Links Found
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((item, index) => {
                const isActive = currentPlaylistUrl === item.url;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`p-4 rounded-xl border flex flex-col justify-between transition-all duration-200 relative ${
                      isActive 
                        ? 'bg-indigo-600/15 border-indigo-500/80 shadow-md shadow-indigo-600/5' 
                        : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700/80'
                    }`}
                  >
                    <div>
                      {/* Top Row Tags */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-bold font-mono">
                          {item.category || 'M3U Playlist'}
                        </span>
                        {item.source && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 max-w-[150px] truncate leading-none">
                            <Github className="h-3 w-3 inline shrink-0" />
                            {item.source}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-bold text-slate-100 mb-1 leading-snug line-clamp-1">
                        {item.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-slate-400 line-clamp-2 mb-4 h-8 overflow-hidden">
                        {item.description || "Tidak ada deskripsi yang disediakan oleh repositori."}
                      </p>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-2 items-center pt-2 border-t border-slate-900">
                      <button
                        onClick={() => onSelectPlaylist(item.url)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold select-none transition cursor-pointer ${
                          isActive 
                            ? 'bg-emerald-600 text-white hover:bg-emerald-500' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-500'
                        }`}
                      >
                        <Tv className="h-3.5 w-3.5" />
                        <span>{isActive ? 'Sedang Digunakan' : 'Muat ke Pemutar'}</span>
                        {!isActive && <ArrowRight className="h-3 w-3 ml-0.5" />}
                      </button>

                      <button
                        onClick={() => handleCopy(item.url)}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:text-white text-slate-400 transition cursor-pointer"
                        title="Salin Tautan M3U"
                      >
                        {copiedUrl === item.url ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-900 text-[11px] text-slate-500 flex items-start gap-2">
              <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
              <p>
                <strong>Catatan Tautan:</strong> Kadang-kadang playlist GitHub publik diperbarui berkala oleh komunitasnya. Jika saluran gagal dimuat, silakan lakukan pencarian ulang untuk mendapatkan rilis playlist alternatif. Tautan web GitHub standar otomatis dikonversi menjadi tautan mentah (Raw) demi keandalan pemutaran.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
