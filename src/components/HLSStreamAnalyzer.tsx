import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Wifi, 
  Globe, 
  Cpu, 
  Layers, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Play, 
  Info, 
  Lock, 
  Unlock, 
  Terminal, 
  RefreshCw, 
  ArrowRight,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { IPTVChannel } from '../types';

interface HLSStreamAnalyzerProps {
  activeChannel: IPTVChannel | null;
  onPlayChannel?: (channel: IPTVChannel) => void;
}

interface AnalysisData {
  status: 'online' | 'offline' | 'invalid' | 'error';
  type?: string;
  server?: string;
  contentType?: string;
  corsHeader?: string;
  responseTime: number;
  variants: {
    bandwidth: number | null;
    resolution: string | null;
    codecs: string | null;
    frameRate: number | null;
    audio: string | null;
    url?: string;
  }[];
  mediaInfo?: {
    targetDuration: number | null;
    playlistType: string;
    segmentCount: number;
    avgDuration: number;
    isEncrypted: boolean;
    hasDiscontinuity: boolean;
    programDateTime: string | null;
  };
  rawLength?: number;
  error?: string;
}

export default function HLSStreamAnalyzer({ activeChannel, onPlayChannel }: HLSStreamAnalyzerProps) {
  const [streamUrl, setStreamUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisData | null>(null);
  const [clientCorsResult, setClientCorsResult] = useState<{
    success: boolean;
    latency: number | null;
    tested: boolean;
    errorMsg?: string;
  }>({ success: false, latency: null, tested: false });

  // Load active channel URL if changed
  useEffect(() => {
    if (activeChannel) {
      setStreamUrl(activeChannel.url);
    }
  }, [activeChannel]);

  const handleCopyFromPlayer = () => {
    if (activeChannel) {
      setStreamUrl(activeChannel.url);
    }
  };

  const runAnalysis = async () => {
    if (!streamUrl.trim()) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setClientCorsResult({ success: false, latency: null, tested: false });

    // Step 1: Run Client-side direct fetch test to probe for CORS blocking
    const probeStart = Date.now();
    try {
      // Use mode: 'no-cors' or simple fetch to test blockages without crashing
      const probeRes = await fetch(streamUrl, {
        method: 'GET',
        mode: 'cors',
        headers: { 'Accept': '*/*' },
        signal: AbortSignal.timeout(4000) // 4s timeout for client probe
      });
      const probeEnd = Date.now();
      setClientCorsResult({
        success: true,
        latency: probeEnd - probeStart,
        tested: true
      });
    } catch (err: any) {
      const probeEnd = Date.now();
      // If we got some response, or it's just CORS block
      console.warn('Client-side direct fetch probe failed:', err);
      
      const isTimeout = err.name === 'TimeoutError' || err.message?.toLowerCase().includes('timeout');
      setClientCorsResult({
        success: false,
        latency: isTimeout ? null : (probeEnd - probeStart),
        tested: true,
        errorMsg: isTimeout ? 'Koneksi Timeout (Batas waktu terlampaui)' : 'Diblokir oleh Kebijakan CORS Browser'
      });
    }

    // Step 2: Query Backend Analyzer route for deep manifest parsing
    try {
      const response = await fetch(`/api/analyze-hls?url=${encodeURIComponent(streamUrl)}`);
      if (response.ok) {
        const data = await response.json();
        setAnalysisResult(data);
      } else {
        setAnalysisResult({
          status: 'error',
          error: `HTTP Server Error: ${response.status}`,
          responseTime: 0,
          variants: []
        });
      }
    } catch (err: any) {
      setAnalysisResult({
        status: 'error',
        error: err.message || 'Gagal terhubung dengan server analisis.',
        responseTime: 0,
        variants: []
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper formats
  const formatBandwidth = (bps: number | null): string => {
    if (!bps) return 'Multi-bitrate';
    if (bps >= 1000000) {
      return `${(bps / 1000000).toFixed(2)} Mbps`;
    }
    return `${(bps / 1000).toFixed(0)} Kbps`;
  };

  const formatResolutionTag = (res: string | null): string => {
    if (!res) return 'Audio';
    const parts = res.split('x');
    if (parts.length === 2) {
      const height = parseInt(parts[1], 10);
      if (height >= 2160) return `${res} (4K)`;
      if (height >= 1080) return `${res} (Full HD 1080p)`;
      if (height >= 720) return `${res} (HD 720p)`;
      if (height >= 480) return `${res} (SD 480p)`;
      return `${res} (SD)`;
    }
    return res;
  };

  const getLatencyRating = (ms: number) => {
    if (ms < 150) return { label: 'Sangat Cepat (Sangat Ideal)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (ms < 400) return { label: 'Cepat (Ideal)', color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' };
    if (ms < 1000) return { label: 'Normal', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' };
    return { label: 'Lambat (Berisiko Buffer)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
  };

  const handlePlayResolvedUrl = (url: string, resName: string) => {
    if (onPlayChannel) {
      onPlayChannel({
        id: 'resolved-quality',
        name: `${activeChannel?.name || 'Saluran'} - [Analisis: ${resName}]`,
        url: url,
        logo: activeChannel?.logo || '',
        category: activeChannel?.category || 'Quality Resolved'
      });
    }
  };

  return (
    <div id="hls-stream-analyzer-root" className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl flex flex-col gap-6">
      
      {/* Header section with badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Activity className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg text-slate-100">HLS Stream Analyzer</h2>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">VIP TOOLS</span>
            </div>
            <p className="text-xs text-slate-400">Analisis dalam manifest HLS (.m3u8), performa CORS, latency ping, dan resolusi sub-stream.</p>
          </div>
        </div>
        
        {activeChannel && (
          <button
            onClick={handleCopyFromPlayer}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-300 hover:text-indigo-100 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/20 transition duration-200"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ambil Saluran Aktif
          </button>
        )}
      </div>

      {/* Input box and actions */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            placeholder="Masukkan URL stream HLS (.m3u8) untuk dianalisis..."
            className="w-full pl-10 pr-4 py-3 bg-slate-950/80 outline-none border border-slate-800 focus:border-indigo-500 text-sm rounded-xl text-slate-100 placeholder:text-slate-500 transition duration-200 font-mono"
          />
        </div>
        <button
          onClick={runAnalysis}
          disabled={isAnalyzing || !streamUrl.trim()}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-sm font-semibold rounded-xl text-white flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-indigo-500/10 cursor-pointer disabled:cursor-not-allowed transition duration-200"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Menganalisis...
            </>
          ) : (
            <>
              <Activity className="h-4 w-4" />
              Mulai Analisis
            </>
          )}
        </button>
      </div>

      {/* Analysis Results Display */}
      <AnimatePresence mode="wait">
        {analysisResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-12 gap-5"
          >
            {/* Left overview dashboard metrics */}
            <div className="col-span-1 md:col-span-4 flex flex-col gap-4">
              
              {/* Core Status Card */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 flex flex-col gap-3">
                <span className="text-[10px] text-slate-400 font-mono tracking-wider block uppercase">Status Pemutar</span>
                
                {analysisResult.status === 'online' && (
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    ONLINE &amp; RESPONSIVE
                  </div>
                )}
                {analysisResult.status === 'offline' && (
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                    <AlertTriangle className="h-4 w-4 animate-bounce" />
                    STREAM OFFLINE (Gagal Muat)
                  </div>
                )}
                {analysisResult.status === 'invalid' && (
                  <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm">
                    <AlertCircle className="h-4 w-4" />
                    BUKAN FORMAT HLS VALID
                  </div>
                )}
                {analysisResult.status === 'error' && (
                  <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    GALAT KONEKSI JARINGAN
                  </div>
                )}

                {analysisResult.error && (
                  <p className="text-xs text-red-300 font-mono bg-red-950/20 p-2 rounded border border-red-900/30 max-h-24 overflow-y-auto">
                    {analysisResult.error}
                  </p>
                )}

                {analysisResult.status === 'online' && (
                  <div className="text-xs text-slate-300 mt-1 space-y-1.5 border-t border-slate-800/50 pt-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tipe Manifest:</span>
                      <span className="text-slate-300 text-right">{analysisResult.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sistem Web Server:</span>
                      <span className="text-slate-200 text-right truncate max-w-[150px]">{analysisResult.server}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Content-Type:</span>
                      <span className="text-slate-300 text-right truncate max-w-[150px]">{analysisResult.contentType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ukuran Berkas:</span>
                      <span className="text-slate-200 text-right">
                        {analysisResult.rawLength ? `${(analysisResult.rawLength / 1024).toFixed(2)} KB` : 'Dinamis'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* CORS & Client Probe Card */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 flex flex-col gap-3">
                <span className="text-[10px] text-slate-400 font-mono tracking-wider block uppercase">Aksesibilitas Browser</span>
                
                {clientCorsResult.tested ? (
                  clientCorsResult.success ? (
                    <div className="flex items-start gap-2 text-emerald-400 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/20">
                      <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-bold block">CORS Terbuka (Aman)</span>
                        Browser dapat memutar saluran ini secara langsung tanpa perantara proxy.
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-amber-400 bg-amber-500/5 p-2 rounded-lg border border-amber-500/20">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-bold block">Terikat CORS (Akses Terbatas)</span>
                        {clientCorsResult.errorMsg || 'Browser memblokir permintaan langsung.'}
                        <span className="block text-slate-500 mt-1 leading-relaxed">
                          Catatan: Saluran ini mungkin tidak menampilkan visual melainkan loading terus-menerus jika diputar di web player standar.
                        </span>
                      </div>
                    </div>
                  )
                ) : (
                  <span className="text-xs text-slate-500">Hasil tes koneksi belum dimuat.</span>
                )}

                {/* Response Time gauge */}
                {analysisResult.status === 'online' && (
                  <div className="mt-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Response Latency:</span>
                      <span className="font-mono text-indigo-400 font-bold">{analysisResult.responseTime} ms</span>
                    </div>
                    <div className={`text-[10px] px-2 py-1 rounded border font-mono ${getLatencyRating(analysisResult.responseTime).color}`}>
                      {getLatencyRating(analysisResult.responseTime).label}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Right side for detailed parsed manifest content */}
            <div className="col-span-1 md:col-span-8 flex flex-col gap-4">
              
              {/* Media Manifest Engine Details (e.g. LIVE parameters or segment statistics) */}
              {analysisResult.status === 'online' && analysisResult.mediaInfo && (
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80">
                  <div className="flex items-center gap-2 mb-3">
                    <Terminal className="h-4 w-4 text-indigo-400" />
                    <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider">HLS Engine Media Manifest</h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-2.5 bg-slate-900/50 rounded-lg border border-slate-800/40">
                      <span className="text-[9px] text-slate-500 block uppercase font-mono mb-1">Tipe Siaran</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded font-mono ${
                        analysisResult.mediaInfo.playlistType === 'VOD' 
                          ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20' 
                          : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                      }`}>
                        {analysisResult.mediaInfo.playlistType || 'LIVE'}
                      </span>
                    </div>
                    
                    <div className="p-2.5 bg-slate-900/50 rounded-lg border border-slate-800/40">
                      <span className="text-[9px] text-slate-500 block uppercase font-mono mb-1">Target Segmen</span>
                      <span className="text-xs font-mono font-bold text-indigo-300">
                        {analysisResult.mediaInfo.targetDuration ? `${analysisResult.mediaInfo.targetDuration} Detik` : 'Dinamis / Tidak Ada'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-900/50 rounded-lg border border-slate-800/40">
                      <span className="text-[9px] text-slate-500 block uppercase font-mono mb-1">Total Segmen</span>
                      <span className="text-xs font-mono font-bold text-slate-200">
                        {analysisResult.mediaInfo.segmentCount} Partikel
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-900/50 rounded-lg border border-slate-800/40">
                      <span className="text-[9px] text-slate-500 block uppercase font-mono mb-1">Rata-rata Durasi</span>
                      <span className="text-xs font-mono font-bold text-slate-200">
                        {analysisResult.mediaInfo.avgDuration ? `${analysisResult.mediaInfo.avgDuration} Detik` : '0 Detik'}
                      </span>
                    </div>
                  </div>

                  {/* Engine warning Flags */}
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-mono">
                    <span className={`px-2 py-1 rounded flex items-center gap-1 border ${
                      analysisResult.mediaInfo.isEncrypted 
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                        : 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {analysisResult.mediaInfo.isEncrypted ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                      Key Encryption: {analysisResult.mediaInfo.isEncrypted ? 'DRM/AES-128 AKTIF' : 'TANPA ENKRIPSI (BEBAS)'}
                    </span>

                    <span className={`px-2 py-1 rounded flex items-center gap-1 border ${
                      analysisResult.mediaInfo.hasDiscontinuity 
                        ? 'bg-amber-500/25 text-amber-300 border-amber-500/30' 
                        : 'bg-slate-900/50 text-slate-400 border-slate-850'
                    }`}>
                      <Info className="h-3 w-3" />
                      Discontinuity: {analysisResult.mediaInfo.hasDiscontinuity ? 'TERDETEKSI (Ada jeda format)' : 'BEBAS JEDA'}
                    </span>

                    {analysisResult.mediaInfo.programDateTime && (
                      <span className="px-2 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded truncate max-w-xs">
                        🕰️ UTC Epoch: {new Date(analysisResult.mediaInfo.programDateTime).toLocaleString('id-ID')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Multi-Quality Stream Variant Tracks */}
              {analysisResult.status === 'online' && (
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 flex-1 flex flex-col gap-3 min-h-[160px]">
                  {(() => {
                    const activeVariants = (analysisResult.variants || []).filter((v: any) => v.active !== false);
                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-indigo-400" />
                            <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider">
                              Variant Quality Streams ({activeVariants.length} Aktif)
                            </h3>
                          </div>
                          {activeVariants.length > 0 && (
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold animate-pulse-slow">
                              ● Only Active Shown
                            </span>
                          )}
                        </div>

                        {activeVariants.length > 0 ? (
                          <div className="overflow-x-auto border border-slate-800/50 rounded-lg">
                            <table className="w-full text-xs font-mono text-left">
                              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[9px] tracking-wider border-b border-slate-800/50">
                                <tr>
                                  <th className="p-3">Resolusi</th>
                                  <th className="p-3">Bitrate Stream</th>
                                  <th className="p-3 font-sans">Codecs</th>
                                  <th className="p-3">Framerates</th>
                                  <th className="p-3 text-right">Opsi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/30">
                                {activeVariants.map((v, idx) => (
                                  <tr key={idx} className="hover:bg-slate-900/40 transition duration-150">
                                    <td className="p-3">
                                      <span className="font-bold text-indigo-300">
                                        {formatResolutionTag(v.resolution)}
                                      </span>
                                    </td>
                                    <td className="p-3 text-slate-300">
                                      {formatBandwidth(v.bandwidth)}
                                    </td>
                                    <td className="p-3 text-slate-400 text-[10px]">
                                      {v.codecs || 'Unknown (Automatic)'}
                                    </td>
                                    <td className="p-3 text-slate-400">
                                      {v.frameRate ? `${v.frameRate.toFixed(1)} FPS` : 'Standard'}
                                    </td>
                                    <td className="p-3 text-right">
                                      {v.url ? (
                                        <button
                                          onClick={() => handlePlayResolvedUrl(v.url!, v.resolution || 'Sub-stream')}
                                          className="px-2.5 py-1 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white rounded border border-indigo-500/20 transition duration-150 flex items-center gap-1 ml-auto text-[10px] cursor-pointer"
                                        >
                                          <Play className="h-2.5 w-2.5" /> Putar Link
                                        </button>
                                      ) : (
                                        <span className="text-[10px] text-slate-500">Auto-ABR</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-900/20 border border-dashed border-slate-800/60 rounded-xl gap-2">
                            <Globe className="h-7 w-7 text-slate-500" />
                            <p className="text-xs text-slate-300 font-bold">Single-Feed Stream (Media Manifest Tunggal)</p>
                            <p className="text-[10px] text-slate-500 max-w-sm">
                              File .m3u8 ini tidak menyediakan link bercabang atau tidak ada sub-stream berkualitas yang aktif. Siaran dimainkan pada satu feed utama.
                            </p>
                          </div>
                        )}
                        
                        {activeVariants.length > 0 && (
                          <div className="text-[10px] text-slate-500 leading-relaxed font-sans mt-1 p-2 bg-slate-900/20 rounded border border-slate-800/50 flex gap-2">
                            <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                            <p>
                              <strong>Tips Analisis:</strong> HLS Master Manifest di atas mendeteksi bahwa stream mendukung adaptasi otomatis. Klik tombol <strong>&ldquo;Putar Link&rdquo;</strong> di samping baris resolusi untuk mengunci pemutar secara paksa ke kualitas sub-manifest spesifik tersebut jika Anda mengalami lagging pada ABR otomatis.
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Initial load message */}
      {!analysisResult && !isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-10 bg-slate-950/20 border border-dashed border-slate-800/50 rounded-2xl text-center gap-3">
          <Activity className="h-10 w-10 text-slate-700 animate-pulse" />
          <div className="max-w-md">
            <h3 className="font-bold text-sm text-slate-300 mb-1">Siap Menganalisis Aliran HLS</h3>
            <p className="text-xs text-slate-500">
              Salin URL saluran apa pun, atau pilih saluran aktif untuk memindai keabsahan server, enkripsi payload, dukungan CORS browser Anda, dan daftar resolusi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
