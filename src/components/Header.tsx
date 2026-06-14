import { useState, FormEvent } from 'react';
import { 
  Link2, 
  RefreshCw, 
  Info, 
  ChevronRight, 
  Sparkles,
  HelpCircle,
  Video,
  ListPlus
} from 'lucide-react';
import logoUrl from '../assets/images/respen_tv_logo_1781392805397.jpg';

const LogoIcon = () => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full scale-[1.05]">
    <defs>
      <linearGradient id="logo-indigo-pink" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1" />
        <stop offset="50%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#ec4899" />
      </linearGradient>
      <linearGradient id="logo-dark-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0f172a" />
        <stop offset="100%" stopColor="#020617" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#logo-dark-bg)" stroke="#1e293b" strokeWidth="1.5" />
    <circle cx="50" cy="50" r="38" stroke="#312e81" strokeWidth="0.8" strokeDasharray="3 3" />
    <rect x="23" y="29" width="54" height="42" rx="9" fill="#020617" stroke="url(#logo-indigo-pink)" strokeWidth="2.5" />
    <path d="M42 29 L32 15" stroke="url(#logo-indigo-pink)" strokeWidth="2" strokeLinecap="round" />
    <path d="M58 29 L68 15" stroke="url(#logo-indigo-pink)" strokeWidth="2" strokeLinecap="round" />
    <circle cx="32" cy="15" r="3" fill="#ec4899" />
    <circle cx="68" cy="15" r="3" fill="#6366f1" />
    <text x="50" y="58" textAnchor="middle" fill="url(#logo-indigo-pink)" fontSize="26" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="-1">R</text>
    <text x="50" y="66" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="bold" fontFamily="monospace" letterSpacing="1">TV</text>
  </svg>
);

interface HeaderProps {
  playlistUrl: string;
  onPlaylistUrlChange: (url: string) => void;
  onResetPlaylist: () => void;
  channelsCount: number;
  favoritesCount: number;
}

export default function Header({
  playlistUrl,
  onPlaylistUrlChange,
  onResetPlaylist,
  channelsCount,
  favoritesCount
}: HeaderProps) {
  const [editingUrl, setEditingUrl] = useState(playlistUrl);
  const [showInput, setShowInput] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (editingUrl.trim()) {
      onPlaylistUrlChange(editingUrl.trim());
      setShowInput(false);
    }
  };

  return (
    <header className="flex flex-col gap-4 border-b border-slate-800 bg-slate-900/40 p-4 sm:p-6 rounded-2xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Logo and App Title */}
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-full overflow-hidden bg-slate-950 border border-slate-800/80 shadow-lg shadow-indigo-600/15 flex-shrink-0 flex items-center justify-center">
            {!imgError ? (
              <img 
                src={logoUrl} 
                alt="Logo Respen TV" 
                className="w-full h-full object-cover animate-fade-in"
                onError={() => setImgError(true)}
                referrerPolicy="no-referrer"
              />
            ) : (
              <LogoIcon />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 id="brand-title" className="text-xl sm:text-2xl font-black bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent tracking-tight">
                Respen TV
              </h1>
              <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Live Stream
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed max-w-xl">
              Saluran TV langsung gratis &amp; pemutar playlist M3U global.
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-3 self-stretch sm:self-auto">
          <div className="flex-1 sm:flex-initial px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-center">
            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Saluran</span>
            <span className="text-sm font-extrabold text-indigo-400 font-mono">{channelsCount}</span>
          </div>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
            title="Tentang / Bantuan"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Playlist URL Editor & Controller Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            URL Aktif: <span className="font-mono text-slate-500 truncate max-w-xs md:max-w-md select-all ml-1 bg-slate-950/40 px-2 py-0.5 rounded border border-slate-800/80">{playlistUrl}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingUrl(playlistUrl);
                setShowInput(!showInput);
              }}
              className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 hover:border-indigo-500/30 text-xs font-semibold rounded-lg text-slate-300 hover:text-indigo-400 transition cursor-pointer flex items-center gap-1.5"
            >
              <ListPlus className="h-3.5 w-3.5" />
              Ganti Link Playlist M3U
            </button>
            
            {playlistUrl !== "https://raw.githubusercontent.com/doms9/iptv/refs/heads/default/M3U8/TV.m3u8" && (
              <button
                onClick={onResetPlaylist}
                className="px-3.5 py-1.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-xs font-semibold rounded-lg text-rose-300 transition cursor-pointer flex items-center gap-1.5"
                title="Kembalikan ke playlist bawaan"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset ke Default
              </button>
            )}
          </div>
        </div>

        {/* Custom Playlist URL Form Dialog */}
        {showInput && (
          <form onSubmit={handleSubmit} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row gap-3 items-stretch sm:items-center animate-fade-in mt-1">
            <div className="flex-1 flex items-center gap-2 relative">
              <Link2 className="absolute left-3.5 text-slate-500 h-4 w-4" />
              <input
                type="url"
                placeholder="Masukkan link M3U8 IPTV baru Anda di sini..."
                value={editingUrl}
                onChange={(e) => setEditingUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs rounded-lg pl-10 pr-4 py-2 font-mono focus:outline-none focus:border-indigo-500 transition"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition cursor-pointer whitespace-nowrap"
              >
                Simpan &amp; Muat
              </button>
              <button
                type="button"
                onClick={() => setShowInput(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg transition cursor-pointer"
              >
                Batal
              </button>
            </div>
          </form>
        )}

        {/* Explanatory Help Card */}
        {showHelp && (
          <div className="p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-xl text-xs leading-relaxed animate-fade-in">
            <h4 className="font-bold text-slate-200 mb-1 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              Panduan Streaming IPTV di Browser:
            </h4>
            <p className="text-slate-400">
              Aplikasi ini memproses &amp; memutar tautan siaran TV langsung yang terstruktur di dalam berkas playlist M3U. 
              Beberapa hal penting untuk diketahui:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-slate-400">
              <li>
                <strong className="text-slate-200">Kebijakan Keamanan CORS:</strong> Kadang web browser memblokir pemutaran HLS karena masalah perizinan dari provider TV (<code className="bg-slate-950 px-1 py-0.5 rounded text-rose-400">Access-Control-Allow-Origin</code>). Anda bisa menginstal ekstensi browser bernama <span className="font-mono text-indigo-300">&quot;Allow CORS: Access-Control-Allow-Origin&quot;</span> di Google Chrome untuk pengalaman pemutaran tanpa hambatan.
              </li>
              <li>
                <strong className="text-slate-200">Kategori Demo HLS:</strong> Kami menyertakan saluran demo stabil di sidebar untuk menguji fungsi pemutaran langsung di browser tanpa butuh konfigurasi apa pun.
              </li>
              <li>
                <strong className="text-slate-200">Simpan Playlist Anda:</strong> Anda bisa mengganti URL playlist dengan mencantumkan link M3U8 Anda sendiri menggunakan tombol &quot;Ganti Link Playlist M3U&quot;.
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}
