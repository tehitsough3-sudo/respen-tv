import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable JSON request parsing if needed
  app.use(express.json());

  // Disable TLS certificate validation to support raw regional IPTV feeds with expired/self-signed certs
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  // Curated high-quality public IPTV Playlists on GitHub for instant reliable fallbacks
  const CURATED_FALLBACKS = [
    {
      title: "Daftar Saluran TV Indonesia (Lengkap & Nasional)",
      description: "Kumpulan saluran TV nasional Indonesia, berita lokal, hiburan, olahraga, dan regional terlengkap dari repository populer.",
      url: "https://raw.githubusercontent.com/AkbarAnung/m3u-indo/master/indonesia.m3u",
      source: "AkbarAnung/m3u-indo",
      category: "Indonesia"
    },
    {
      title: "IPTV-org Indonesia (Official Streams)",
      description: "Daftar saluran TV Indonesia terpercaya berskala nasional dari koleksi database global crowdsourced.",
      url: "https://iptv-org.github.io/iptv/countries/id.m3u",
      source: "iptv-org/iptv",
      category: "Indonesia"
    },
    {
      title: "Daftar Saluran Berita Internasional (Global News)",
      description: "Daftar live streaming berita dunia populer 24 jam nonstop (BBC, Sky News, CNN, Al Jazeera, DW, Bloomberg, dll).",
      url: "https://iptv-org.github.io/iptv/categories/news.m3u",
      source: "iptv-org/iptv",
      category: "News"
    },
    {
      title: "Saluran Olahraga Dunia Terbaik (Sports & Esports)",
      description: "Kumpulan saluran siaran olahraga terkemuka, balapan sirkuit resmi, sepak bola, dan platform turnamen esports.",
      url: "https://iptv-org.github.io/iptv/categories/sports.m3u",
      source: "iptv-org/iptv",
      category: "Sports"
    },
    {
      title: "Sinema & Film Terpopuler (Movies & Cinema)",
      description: "Playlist khusus siaran kartun animasi, film Hollywood pendek, film dokumenter, aksi, dan film bioskop multi-bahasa.",
      url: "https://iptv-org.github.io/iptv/categories/movies.m3u",
      source: "iptv-org/iptv",
      category: "Movies"
    },
    {
      title: "Saluran TV K-Pop, Drama Asia & Musik Global",
      description: "Nikmati saluran hiburan menarik dari Korea Selatan, klip musik K-Pop populer, drama Asia mendalam, dan program musik nonstop.",
      url: "https://iptv-org.github.io/iptv/categories/music.m3u",
      source: "iptv-org/iptv",
      category: "K-Pop & Music"
    },
    {
      title: "Kids & Educational (Saluran Anak & Edukasi)",
      description: "Playlist aman ramah anak berisikan kartun klasik, animasi edukatif sekolah, kerajinan seni, dan dongeng pengantar tidur.",
      url: "https://iptv-org.github.io/iptv/categories/kids.m3u",
      source: "iptv-org/iptv",
      category: "Kids"
    },
    {
      title: "IPTV-org Global Master List (Index Semua Negara)",
      description: "Daftar index pusat terlengkap yang mengumpulkan ribuan stasiun penyiaran dari ratusan negara di seluruh dunia.",
      url: "https://iptv-org.github.io/iptv/index.m3u",
      source: "iptv-org/iptv",
      category: "Global"
    }
  ];

  // Helper to dynamically filter & rank fallbacks based on search query
  function getCuratedFallbacks(searchQuery: string) {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return CURATED_FALLBACKS;

    const scored = CURATED_FALLBACKS.map(item => {
      let score = 0;
      const titleMatch = item.title.toLowerCase().includes(q);
      const descMatch = item.description.toLowerCase().includes(q);
      const catMatch = item.category.toLowerCase().includes(q);
      const sourceMatch = item.source.toLowerCase().includes(q);

      if (titleMatch) score += 10;
      if (catMatch) score += 8;
      if (descMatch) score += 3;
      if (sourceMatch) score += 1;

      return { ...item, score };
    });

    const hasMatches = scored.some(item => item.score > 0);
    if (hasMatches) {
      return scored
        .sort((a, b) => b.score - a.score)
        .map(({ score, ...item }) => item);
    }

    return CURATED_FALLBACKS;
  }

  // Helper to dynamically sanitize and heal broken or stale iptv-org URLs
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

  interface AlternativeAISearchResult {
    results: any[];
    provider: string;
  }

  // Alternative AI Provider using completely free keyless text endpoints (Pollinations.ai GET, DuckDuckGo, Pollinations.ai POST, Airforce)
  async function runAlternativeAISearch(query: string): Promise<AlternativeAISearchResult> {
    console.log(`[AI Search Alternative] Querying alternative AI providers (Robust Priority Setup) for: ${query}`);
    
    const systemPrompt = `Anda adalah asisten IPTV ahli. Cari repositori GitHub yang menyediakan playlist M3U/M3U8 publik yang valid (terutama koleksi populer seperti iptv-org/iptv atau list M3U Indonesia/Global).
Anda HARUS menghasilkan tautan langsung (RAW URL) untuk berkas playlist M3U tersebut. Jika tautan berbentuk tautan web biasa seperti https://github.com/user/repo/blob/main/playlist.m3u, ubah menjadi URL mentah (raw): https://raw.githubusercontent.com/user/repo/main/playlist.m3u agar dapat di-fetch langsung.

Harus kembali dalam format JSON Array murni yang valid seperti ini:
[
  {
    "title": "Judul Playlist",
    "description": "Deskripsi singkat playlist",
    "url": "https://raw.githubusercontent.com/... atau https://iptv-org.github.io/iptv/...",
    "source": "iptv-org/iptv",
    "category": "Kategori"
  }
]
Kembalikan daftar playlist IPTV yang AKTIF berkaitan dengan kata kunci pencarian: "${query}". Kembalikan setidaknya 4-6 item. Jangan menambahkan teks penjelasan, pengantar atau penulisan kode markdown (seperti \`\`\`json), berikan teks JSON mentah saja.`;

    const extractJsonArray = (textStr: string): any[] => {
      let cleaned = textStr.trim();
      const firstBracket = cleaned.indexOf('[');
      const lastBracket = cleaned.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        cleaned = cleaned.substring(firstBracket, lastBracket + 1);
      }
      cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) {
        throw new Error("Parsed result is not an array");
      }
      return parsed;
    };

    const models = ["openai", "mistral", "qwen-coder", "llama"];
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0"
    ];

    let lastError: any = null;

    // Layer 1: Pollinations GET method (Extremely robust, fast, keyless, practically zero rate limits)
    console.log(`[AI Search Alternative] Trying primary layer: Pollinations.ai GET...`);
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const userAgent = userAgents[i % userAgents.length];
      try {
        console.log(`[AI Search Alternative - Pollinations GET] Attempting with model: ${model}`);
        const fullPrompt = `${systemPrompt}\n\nIMPORTANT: You must output ONLY a valid raw JSON array starting with "[" and ending with "]". Avoid preambles.`;
        const url = `https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}?model=${model}&jsonMode=true&seed=${Math.floor(Math.random() * 99999)}&t=${Date.now()}`;
        
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent": userAgent,
            "Accept": "text/plain, application/json",
            "Referer": "https://pollinations.ai/"
          }
        });

        if (response.ok) {
          const text = await response.text();
          const parsed = extractJsonArray(text);
          if (parsed && parsed.length > 0) {
            console.log(`[AI Search Alternative - Pollinations GET] Success with model: ${model}`);
            return { results: parsed, provider: `Pollinations.ai (GET - ${model})` };
          }
        } else {
          console.warn(`[AI Search Alternative - Pollinations GET] Failed with status: ${response.status}`);
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[AI Search Alternative - Pollinations GET] Model ${model} threw error: ${err.message || err}`);
      }
    }

    // Layer 2: DuckDuckGo Keyless AI Chat Client
    console.log(`[AI Search Alternative] Trying secondary layer: DuckDuckGo...`);
    const ddgModels = ["gpt-4o-mini", "meta-llama/Llama-3-70b-Instruct", "mistralai/Mixtral-8x7B-Instruct-v0.1"];
    for (const model of ddgModels) {
      try {
        console.log(`[AI Search Alternative - DuckDuckGo] Fetching token for model: ${model}`);
        const statusRes = await fetch("https://duckduckgo.com/duckchat/v1/status", {
          headers: {
            "x-vqd-4": "1",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });

        if (!statusRes.ok) {
          console.warn(`[AI Search Alternative - DuckDuckGo] Token fetch failed: ${statusRes.status}`);
          continue;
        }

        const vqd = statusRes.headers.get("x-vqd-4");
        if (!vqd) {
          console.warn(`[AI Search Alternative - DuckDuckGo] Header x-vqd-4 not found`);
          continue;
        }

        console.log(`[AI Search Alternative - DuckDuckGo] Got token. Fetching chat Completion...`);
        const chatRes = await fetch("https://duckduckgo.com/duckchat/v1/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-vqd-4": vqd,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/event-stream"
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "user", content: systemPrompt }
            ]
          })
        });

        if (chatRes.ok) {
          const rawText = await chatRes.text();
          const lines = rawText.split('\n');
          let textAccumulator = "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const content = line.substring(6).trim();
              if (content === "[DONE]") break;
              try {
                const parsedChunk = JSON.parse(content);
                if (parsedChunk.message) {
                  textAccumulator += parsedChunk.message;
                }
              } catch (_) {}
            }
          }

          if (textAccumulator) {
            const parsed = extractJsonArray(textAccumulator);
            if (parsed && parsed.length > 0) {
              console.log(`[AI Search Alternative - DuckDuckGo] Success with model: ${model}`);
              return { results: parsed, provider: `DuckDuckGo (${model})` };
            }
          }
        } else {
          console.warn(`[AI Search Alternative - DuckDuckGo] Chat request failed: ${chatRes.status}`);
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[AI Search Alternative - DuckDuckGo] Model ${model} threw error: ${err.message || err}`);
      }
    }

    // Layer 3: Pollinations AI POST (Often rate limited but solid backup)
    console.log(`[AI Search Alternative] Trying tertiary layer: Pollinations POST...`);
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const userAgent = userAgents[i % userAgents.length];
      try {
        console.log(`[AI Search Alternative - Pollinations POST] Attempting with model: ${model}`);
        const response = await fetch("https://text.pollinations.ai/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": userAgent,
            "Accept": "application/json",
            "Referer": "https://pollinations.ai/"
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: "You are a custom REST API that serves IPTV playlists in raw JSON format matching the schema." },
              { role: "user", content: systemPrompt }
            ],
            model: model,
            jsonMode: true
          })
        });

        if (response.ok) {
          const text = await response.text();
          const parsed = extractJsonArray(text);
          if (parsed && parsed.length > 0) {
            console.log(`[AI Search Alternative - Pollinations POST] Success with model: ${model}`);
            return { results: parsed, provider: "Pollinations.ai (POST)" };
          }
        } else {
          console.warn(`[AI Search Alternative - Pollinations POST] Failed with status: ${response.status}`);
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[AI Search Alternative - Pollinations POST] Model ${model} threw error: ${err.message || err}`);
      }
    }

    // Layer 4: API Airforce (Quietly, try without Bearer Token of 'free' to see if unauth is accepted)
    console.log(`[AI Search Alternative] Trying quaternary layer: API Airforce...`);
    const airforceModels = ["llama-3-70b-instruct", "gpt-4o", "mistral-7b-instruct"];
    for (const model of airforceModels) {
      try {
        console.log(`[AI Search Alternative - Airforce] Attempting with model: ${model}`);
        const response = await fetch("https://api.airforce/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: "You are an IPTV expert assistant serving RAW M3U links." },
              { role: "user", content: systemPrompt }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const text = data?.choices?.[0]?.message?.content || "";
          if (text) {
            const parsed = extractJsonArray(text);
            if (parsed && parsed.length > 0) {
              console.log(`[AI Search Alternative - Airforce] Success with model: ${model}`);
              return { results: parsed, provider: `Airforce (${model})` };
            }
          }
        } else {
          console.warn(`[AI Search Alternative - Airforce] Failed with status: ${response.status}`);
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[AI Search Alternative - Airforce] Model ${model} threw error: ${err.message || err}`);
      }
    }

    throw lastError || new Error("All alternative AI providers were rate-limited or failed.");
  }

  // API route for AI search with Google Search grounding and JSON Schema output
  app.post("/api/ai-search-playlists", async (req, res) => {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query pencarian harus diisi." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[AI Search] GEMINI_API_KEY missing - switching proactively to alternative AI provider.");
      try {
        const { results: altResults, provider } = await runAlternativeAISearch(query);
        const finalized = altResults.map((item: any) => {
          let rawUrl = item.url || "";
          if (rawUrl.includes("iptv-org/iptv") || rawUrl.includes("iptv-org.github.io")) {
            rawUrl = sanitizeIptvOrgUrl(rawUrl);
          } else if (rawUrl.includes("github.com/") && !rawUrl.includes("raw.githubusercontent.com")) {
            rawUrl = rawUrl
              .replace("github.com", "raw.githubusercontent.com")
              .replace("/blob/", "/");
          }
          return {
            ...item,
            url: rawUrl
          };
        });

        return res.json({
          results: finalized,
          isFallback: true,
          reason: `Kunci API Gemini (GEMINI_API_KEY) belum dikonfigurasi. Berhasil beralih ke Provider AI Cadangan (${provider}) secara real-time.`
        });
      } catch (altError: any) {
        console.error("[AI Search] Alternative provider also failed:", altError);
        return res.json({ 
          results: getCuratedFallbacks(query),
          isFallback: true,
          reason: "Kunci API Gemini belum dikonfigurasi dan Provider AI Cadangan sibuk, mengaktifkan Pencarian Cerdas Lokal Offline."
        });
      }
    }

    try {
      console.log(`[AI Search] Running search grounding query: ${query}`);
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // System instruction tells the model what to search for and how to format it
      const prompt = `Lakukan pencarian web untuk mencari playlist atau berkas daftar saluran IPTV berformat .m3u atau .m3u8 yang dapat diakses publik di GitHub dan gists, yang berkaitan dengan kata kunci pencarian: "${query}".

Cari repository populer (seperti iptv-org/iptv atau list M3U per wilayah/negara) yang memiliki tautan berkas M3U yang aktif.
Anda HARUS menghasilkan tautan langsung (RAW URL) untuk berkas playlist M3U tersebut. Jika tautan berbentuk tautan web biasa seperti https://github.com/user/repo/blob/main/playlist.m3u, ubah menjadi URL mentah (raw): https://raw.githubusercontent.com/user/repo/main/playlist.m3u agar dapat di-fetch langsung oleh pemutar.
Sediakan setidaknya 4-6 hasil pencarian yang relevan, akurat, dan terbaru.`;

      let response = null;
      let lastError: any = null;
      const modelsToTry = ["gemini-3.5-flash", "gemini-flash-latest"];

      for (const modelCandidate of modelsToTry) {
        try {
          console.log(`[AI Search] Attempting search grounding query using model: ${modelCandidate}`);
          response = await ai.models.generateContent({
            model: modelCandidate,
            contents: prompt,
            config: {
              systemInstruction: "Anda adalah asisten IPTV ahli. Cari repositori GitHub yang menyediakan playlist M3U/M3U8 publik yang valid dan ubah tautan GitHub reguler menjadi raw githubusercontent URL agar dapat diputar langsung.",
              tools: [{ googleSearch: {} }],
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { 
                      type: Type.STRING, 
                      description: "Judul playlist yang informatif (misal: 'Daftar Saluran TV Indonesia by Owner')" 
                    },
                    description: { 
                      type: Type.STRING, 
                      description: "Deskripsi singkat mengenai jenis saluran yang tersedia (misal: berita, hiburan, olahraga)." 
                    },
                    url: { 
                      type: Type.STRING, 
                      description: "Tautan URL mentah langsung (raw) ke berkas .m3u atau .m3u8, gunakan https://raw.githubusercontent.com/... untuk file di GitHub" 
                    },
                    source: { 
                      type: Type.STRING, 
                      description: "Nama pembuat, repository, atau gist asal (misal: 'iptv-org/iptv')" 
                    },
                    category: { 
                      type: Type.STRING, 
                      description: "Kategori wilayah atau tipe daftar (misal: 'Indonesia', 'Global', 'Sports', 'K-Pop')" 
                    }
                  },
                  required: ["title", "description", "url"]
                }
              }
            }
          });
          
          if (response) {
            console.log(`[AI Search] Successfully received response from model: ${modelCandidate}`);
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`[AI Search] Model ${modelCandidate} failed (code: ${err?.status || err?.code || 'unknown'}). Error info: ${err.message || err}`);
        }
      }

      if (!response) {
        throw lastError || new Error("All candidate models failed generation");
      }

      const responseText = response.text || "[]";
      console.log(`[AI Search] Completed search grounding, received responses`);
      
      let parsedResults = [];
      try {
        parsedResults = JSON.parse(responseText.trim());
      } catch (e) {
        console.error("Failed to parse Gemini JSON response, attempting cleanup:", responseText);
        const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        parsedResults = JSON.parse(cleanedText);
      }

      // Convert standard Github links or apply robust iptv-org healing
      const finalized = parsedResults.map((item: any) => {
        let rawUrl = item.url || "";
        if (rawUrl.includes("iptv-org/iptv") || rawUrl.includes("iptv-org.github.io")) {
          rawUrl = sanitizeIptvOrgUrl(rawUrl);
        } else if (rawUrl.includes("github.com/") && !rawUrl.includes("raw.githubusercontent.com")) {
          rawUrl = rawUrl
            .replace("github.com", "raw.githubusercontent.com")
            .replace("/blob/", "/");
        }
        return {
          ...item,
          url: rawUrl
        };
      });

      return res.json({ results: finalized, isFallback: false });
    } catch (error: any) {
      // Safely convert the error to a string for robust keyword matching
      let errorStr = "";
      if (error) {
        if (typeof error === "string") {
          errorStr = error;
        } else if (error.message && typeof error.message === "string") {
          errorStr = error.message;
        } else {
          try {
            errorStr = JSON.stringify(error);
          } catch (_) {
            errorStr = String(error);
          }
        }
      }

      console.warn(`[AI Search] Gemini failed: ${errorStr.slice(0, 150)}. Initiating swap to alternative AI provider...`);

      try {
        const { results: altResults, provider } = await runAlternativeAISearch(query);
        const finalizedAlt = altResults.map((item: any) => {
          let rawUrl = item.url || "";
          if (rawUrl.includes("iptv-org/iptv") || rawUrl.includes("iptv-org.github.io")) {
            rawUrl = sanitizeIptvOrgUrl(rawUrl);
          } else if (rawUrl.includes("github.com/") && !rawUrl.includes("raw.githubusercontent.com")) {
            rawUrl = rawUrl
              .replace("github.com", "raw.githubusercontent.com")
              .replace("/blob/", "/");
          }
          return {
            ...item,
            url: rawUrl
          };
        });

        const isQuotaErr = errorStr.toLowerCase().includes("quota") || errorStr.toLowerCase().includes("429") || errorStr.toLowerCase().includes("exhausted");
        const altReason = isQuotaErr
          ? `Kuota API Gemini terlampaui (RESOURCE_EXHAUSTED). Berhasil beralih ke Provider AI Cadangan (${provider}) secara real-time.`
          : `Terjadi galat koneksi pada Gemini API. Berhasil beralih ke Provider AI Cadangan (${provider}) secara real-time.`;

        return res.json({
          results: finalizedAlt,
          isFallback: true,
          reason: altReason
        });
      } catch (altErr: any) {
        console.error(`[AI Search] Alternative provider also failed:`, altErr);
        
        let reason = "Mengaktifkan Rekomendasi Pintar dikarenakan lalu-lintas jaringan terlampau padat.";
        if (errorStr.toLowerCase().includes("quota") || errorStr.toLowerCase().includes("429") || errorStr.toLowerCase().includes("exhausted")) {
          reason = "Kuota API Gemini pada Workspace terlampaui (RESOURCE_EXHAUSTED) dan Provider AI Cadangan sibuk. Mengaktifkan Saluran Cadangan Klasik secara otomatis.";
        }

        return res.json({ 
          results: getCuratedFallbacks(query),
          isFallback: true,
          reason: reason
        });
      }
    }
  });

  // API route for proxying M3U playlist fetches to avoid standard CORS issues in-browser
  app.get("/api/fetch-playlist", async (req, res) => {
    const playlistUrl = req.query.url as string;
    if (!playlistUrl) {
      return res.status(400).json({ error: "URL parameter is required." });
    }

    try {
      let currentUrl = playlistUrl;
      // Auto-heal and rewrite any stale iptv-org URLs to use functional CDN links
      if (currentUrl.includes("iptv-org/iptv") || currentUrl.includes("iptv-org.github.io")) {
        currentUrl = sanitizeIptvOrgUrl(currentUrl);
      }
      console.log(`[Proxy] Fetching playlist from: ${currentUrl} (original requested: ${playlistUrl})`);
      let response: any = null;
      let redirectCount = 0;
      const maxRedirects = 10;
      const visitedUrls = new Set<string>();

      while (redirectCount < maxRedirects) {
        if (visitedUrls.has(currentUrl)) {
          return res.status(400).json({
            error: "Deteksi perulangan pengalihan (redirect loop). URL ini kemungkinan adalah halaman situs web interaktif (seperti TVRI Klik) yang membutuhkan cookie browser, bukan berkas playlist M3U/M3U8 langsung."
          });
        }
        visitedUrls.add(currentUrl);

        response = await fetch(currentUrl, {
          redirect: "manual",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "*/*"
          }
        });

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("location");
          if (location) {
            currentUrl = new URL(location, currentUrl).toString();
            redirectCount++;
            console.log(`[Proxy] Redirecting to: ${currentUrl} (Redirect count: ${redirectCount})`);
            continue;
          }
        }
        break;
      }

      if (!response) {
        return res.status(400).json({ error: "Gagal menerima respon valid dari server playlist." });
      }

      if (!response.ok) {
        return res.status(response.status).json({ 
          error: `Gagal mengunduh daftar berkas M3U dari provider (Status: ${response.status})` 
        });
      }

      const contentType = response.headers.get("content-type") || "";
      const text = await response.text();

      // Detect if returned content is HTML page instead of plain playlist text
      if (contentType.includes("text/html") || text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
        return res.status(400).json({
          error: "Tautan yang dimasukkan merujuk ke halaman situs web (HTML), bukan file playlist M3U/M3U8 yang valid. Silakan gunakan URL berkas .m3u, .m3u8, atau saluran resmi."
        });
      }

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.send(text);
    } catch (error: any) {
      console.log(`[Proxy] Error fetching playlist (offline/invalid):`, error.message || error);
      return res.status(500).json({ 
        error: `Gagal menghubungkan ke link: ${error.message || error}` 
      });
    }
  });

  // API route for HLS Stream manifest deep analyzer
  app.get("/api/analyze-hls", async (req, res) => {
    const streamUrl = req.query.url as string;
    if (!streamUrl) {
      return res.status(400).json({ error: "URL stream HLS (*.m3u8) harus diisi." });
    }

    const startTime = Date.now();
    try {
      console.log(`[HLS Analyzer] Analyzing stream: ${streamUrl}`);
      
      // Auto-heal / sanitize URL if it belongs to iptv-org
      let targetUrl = streamUrl;
      if (targetUrl.includes("iptv-org/iptv") || targetUrl.includes("iptv-org.github.io")) {
        targetUrl = sanitizeIptvOrgUrl(targetUrl);
      }

      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "*/*",
          "Connection": "close",
          "Accept-Encoding": "identity"
        },
        signal: AbortSignal.timeout(6000) // 6 seconds connection timeout
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return res.json({
          status: "offline",
          error: `HTTP Code: ${response.status}`,
          responseTime
        });
      }

      const contentType = response.headers.get("content-type") || "unknown";
      const server = response.headers.get("server") || "unknown";
      const corsHeader = response.headers.get("access-control-allow-origin") || "none";
      const text = await response.text();

      if (!text.includes("#EXTM3U")) {
        return res.json({
          status: "invalid",
          error: "Bukan file manifest HLS (M3U8) yang valid. String '#EXTM3U' tidak ditemukan.",
          contentType,
          server,
          responseTime
        });
      }

      // Parse manifest
      const lines = text.split("\n");
      const isMaster = text.includes("#EXT-X-STREAM-INF");
      
      const variants: any[] = [];
      const mediaInfo: any = {
        targetDuration: null,
        playlistType: "LIVE", // default to LIVE if not mentioned and segments exist
        segmentCount: 0,
        avgDuration: 0,
        isEncrypted: false,
        hasDiscontinuity: false,
        programDateTime: null,
        hasEndlist: false
      };

      let currentStreamInf: any = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith("#EXT-X-STREAM-INF:")) {
          const paramsString = line.substring(18);
          const infAttr: any = {};
          
          // Regex to parse key=value or key="value" taking care of quotes and commas
          const regex = /([A-Z0-9\-]+)=(?:\"([^\"]*)\"|([^,]*))/gi;
          let match;
          while ((match = regex.exec(paramsString)) !== null) {
            const key = match[1].toUpperCase();
            const val = match[2] || match[3];
            infAttr[key] = val;
          }

          currentStreamInf = {
            bandwidth: infAttr.BANDWIDTH ? parseInt(infAttr.BANDWIDTH, 10) : null,
            resolution: infAttr.RESOLUTION || null,
            codecs: infAttr.CODECS || null,
            frameRate: infAttr["FRAME-RATE"] ? parseFloat(infAttr["FRAME-RATE"]) : null,
            audio: infAttr.AUDIO || null
          };
          
          // Look at the next non-empty line as the segment/stream URL
          let nextLineIndex = i + 1;
          while (nextLineIndex < lines.length && !lines[nextLineIndex].trim()) {
            nextLineIndex++;
          }
          if (nextLineIndex < lines.length) {
            const streamPath = lines[nextLineIndex].trim();
            if (!streamPath.startsWith("#")) {
              currentStreamInf.url = streamPath.startsWith("http") 
                ? streamPath 
                : new URL(streamPath, targetUrl).toString();
            }
          }
          variants.push(currentStreamInf);
        }

        if (line.startsWith("#EXT-X-TARGETDURATION:")) {
          mediaInfo.targetDuration = parseInt(line.substring(22), 10);
        }

        if (line.startsWith("#EXT-X-PLAYLIST-TYPE:")) {
          mediaInfo.playlistType = line.substring(21).toUpperCase();
        }

        if (line.startsWith("#EXT-X-KEY:")) {
          mediaInfo.isEncrypted = true;
        }

        if (line.startsWith("#EXT-X-DISCONTINUITY")) {
          mediaInfo.hasDiscontinuity = true;
        }

        if (line.startsWith("#EXT-X-PROGRAM-DATE-TIME:")) {
          mediaInfo.programDateTime = line.substring(25);
        }

        if (line.startsWith("#EXTINF:")) {
          mediaInfo.segmentCount++;
          const durationPart = line.substring(8).split(",")[0];
          const dur = parseFloat(durationPart);
          if (!isNaN(dur)) {
            mediaInfo.avgDuration += dur;
          }
        }

        if (line.startsWith("#EXT-X-ENDLIST")) {
          mediaInfo.hasEndlist = true;
          mediaInfo.playlistType = mediaInfo.playlistType === "LIVE" ? "VOD" : mediaInfo.playlistType;
        }
      }

      if (mediaInfo.segmentCount > 0) {
        mediaInfo.avgDuration = parseFloat((mediaInfo.avgDuration / mediaInfo.segmentCount).toFixed(2));
      }

      // If we don't have explicit VOD/EVENT and it has #EXT-X-ENDLIST, then it's VOD
      if (mediaInfo.hasEndlist) {
        mediaInfo.playlistType = "VOD";
      }

      // Probe variant URLs in parallel with Range: bytes=0-100 to check if active/online, preserving original order
      let verifiedVariants = variants;
      if (variants && variants.length > 0) {
        verifiedVariants = await Promise.all(
          variants.map(async (v) => {
            if (!v.url) {
              return { ...v, active: true };
            }
            try {
              const probeRes = await fetch(v.url, {
                method: "GET",
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                  "Accept": "*/*",
                  "Range": "bytes=0-100"
                },
                signal: AbortSignal.timeout(2000) // 2s timeout is enough and fast on high-speed servers
              });
              return { ...v, active: probeRes.ok };
            } catch (err) {
              return { ...v, active: false };
            }
          })
        );
      }

      return res.json({
        status: "online",
        type: isMaster ? "Master Manifest (Multi-Quality)" : "Media Manifest (Single Stream)",
        server,
        contentType,
        corsHeader,
        responseTime,
        variants: verifiedVariants,
        mediaInfo,
        rawLength: text.length
      });
    } catch (error: any) {
      const isTimeout = error.name === 'TimeoutError' || error.message?.includes('timeout') || error.message?.includes('aborted');
      if (isTimeout) {
        console.log(`[HLS Analyzer] Stream connection timed out (offline): ${streamUrl}`);
        return res.json({
          status: "offline",
          error: "Batas waktu koneksi habis (Timeout)",
          responseTime: Date.now() - startTime
        });
      }
      
      console.log(`[HLS Analyzer] Stream connection failed (offline) for ${streamUrl}:`, error.message || error);
      return res.json({
        status: "offline",
        error: error.message || String(error),
        responseTime: Date.now() - startTime
      });
    }
  });

  // New batch HLS analyzer route to check stream liveness for many channels concurrently
  app.post("/api/analyze-hls-batch", async (req, res) => {
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: "Daftar URL harus disertakan sebagai array." });
    }

    const startTime = Date.now();
    try {
      console.log(`[HLS Analyzer Batch] Pre-checking ${urls.length} stream URLs concurrently...`);
      
      // Limit to max 100 for batch checks to avoid resource starvation
      const limitedUrls = urls.slice(0, 100);

      const results = await Promise.all(
        limitedUrls.map(async (url: string) => {
          let targetUrl = url;
          if (targetUrl.includes("iptv-org/iptv") || targetUrl.includes("iptv-org.github.io")) {
            targetUrl = sanitizeIptvOrgUrl(targetUrl);
          }

          try {
            const probeRes = await fetch(targetUrl, {
              method: "GET",
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "*/*"
              },
              signal: AbortSignal.timeout(2000) // 2 seconds fast-timeout
            });

            return {
              url,
              status: probeRes.ok ? "online" : "offline"
            };
          } catch (err: any) {
            return {
              url,
              status: "offline"
            };
          }
        })
      );

      return res.json({
        results,
        responseTime: Date.now() - startTime
      });
    } catch (globalErr: any) {
      console.error("[HLS Analyzer Batch] Global error:", globalErr.message || globalErr);
      return res.status(500).json({ error: globalErr.message || String(globalErr) });
    }
  });

  // Health check API
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
