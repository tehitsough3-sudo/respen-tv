import { IPTVChannel } from '../types';

export function detectGenre(name: string, m3uGroup: string, url: string = ''): string {
  const cleanName = name.toLowerCase();
  const cleanGroup = m3uGroup.toLowerCase();
  const cleanUrl = url.toLowerCase();

  // 1. Piala Dunia 2026 (Priority)
  if (
    cleanName.includes('piala dunia') ||
    cleanName.includes('world cup') ||
    cleanName.includes('worldcup') ||
    cleanName.includes('copa mundial') ||
    cleanName.includes('fifa') ||
    cleanName.includes('wm 2026') ||
    cleanGroup.includes('piala dunia') ||
    cleanGroup.includes('world cup') ||
    cleanGroup.includes('worldcup') ||
    cleanGroup.includes('copa mundial') ||
    cleanGroup.includes('fifa') ||
    cleanUrl.includes('pialadunia') ||
    cleanUrl.includes('worldcup') ||
    cleanUrl.includes('fifa')
  ) {
    return 'Piala Dunia 2026';
  }

  // 2. Olahraga (Sports)
  if (
    cleanName.includes('sport') ||
    cleanName.includes('sports') ||
    cleanName.includes('racing') ||
    cleanName.includes('football') ||
    cleanName.includes('soccer') ||
    cleanName.includes('idman') ||
    cleanName.includes('depor') ||
    cleanName.includes('arena') ||
    cleanName.includes('bola') ||
    cleanName.includes('golf') ||
    cleanName.includes('tennis') ||
    cleanName.includes('esport') ||
    cleanName.includes('f1') ||
    cleanName.includes('motogp') ||
    cleanName.includes('atlet') ||
    cleanGroup.includes('sport') ||
    cleanGroup.includes('sports') ||
    cleanUrl.includes('/sport') ||
    cleanUrl.includes('/football') ||
    cleanUrl.includes('/soccer') ||
    cleanUrl.includes('/bola') ||
    cleanUrl.includes('/esport')
  ) {
    return 'Olahraga';
  }

  // 3. Berita (News)
  if (
    cleanName.includes('news') ||
    cleanName.includes('noticia') ||
    cleanName.includes('noticias') ||
    cleanName.includes('cnn') ||
    cleanName.includes('al jazeera') ||
    cleanName.includes('euronews') ||
    cleanName.includes('dw') ||
    cleanName.includes('bbc') ||
    cleanName.includes('cna') ||
    cleanName.includes('cnbc') ||
    cleanName.includes('msnbc') ||
    cleanName.includes('bloomberg') ||
    cleanName.includes('reuters') ||
    cleanName.includes('berita') ||
    cleanName.includes('metro') ||
    cleanName.includes('kompas') ||
    cleanName.includes('tempo') ||
    cleanName.includes('journal') ||
    cleanName.includes('report') ||
    cleanName.includes('noticiero') ||
    cleanGroup.includes('news') ||
    cleanGroup.includes('berita') ||
    cleanUrl.includes('/news') ||
    cleanUrl.includes('/berita')
  ) {
    return 'Berita';
  }

  // 4. Anak-anak (Kids)
  if (
    cleanName.includes('kids') ||
    cleanName.includes('kid') ||
    cleanName.includes('cartoon') ||
    cleanName.includes('disney') ||
    cleanName.includes('junior') ||
    cleanName.includes('pakapaka') ||
    cleanName.includes('baby') ||
    cleanName.includes('boing') ||
    cleanName.includes('nick') ||
    cleanName.includes('nickelodeon') ||
    cleanGroup.includes('kids') ||
    cleanGroup.includes('children') ||
    cleanGroup.includes('anak') ||
    cleanUrl.includes('/kids') ||
    cleanUrl.includes('/cartoon') ||
    cleanUrl.includes('/disney') ||
    cleanUrl.includes('/child')
  ) {
    return 'Anak-anak';
  }

  // 5. Film & Drama (Movies & Series)
  if (
    cleanName.includes('cinema') ||
    cleanName.includes('cine') ||
    cleanName.includes('movie') ||
    cleanName.includes('movies') ||
    cleanName.includes('hbo') ||
    cleanName.includes('action') ||
    cleanName.includes('film') ||
    cleanName.includes('box office') ||
    cleanName.includes('thriller') ||
    cleanName.includes('drama') ||
    cleanName.includes('series') ||
    cleanName.includes('teater') ||
    cleanGroup.includes('cinema') ||
    cleanGroup.includes('movie') ||
    cleanGroup.includes('movies') ||
    cleanGroup.includes('film') ||
    cleanUrl.includes('/cinema') ||
    cleanUrl.includes('/movie') ||
    cleanUrl.includes('/film') ||
    cleanUrl.includes('/hbo') ||
    cleanUrl.includes('/series')
  ) {
    return 'Film & Drama';
  }

  // 6. Musik (Music)
  if (
    cleanName.includes('music') ||
    cleanName.includes('musik') ||
    cleanName.includes('mus ') ||
    cleanName.includes('mus\'') ||
    cleanName.endsWith(' mus') ||
    cleanName.includes('mtv') ||
    cleanName.includes('viva') ||
    cleanName.includes('songs') ||
    cleanName.includes('hit ') ||
    cleanName.includes('hits') ||
    cleanName.includes('rock') ||
    cleanName.includes('fm') ||
    cleanName.includes('radio') ||
    cleanName.includes('melodi') ||
    cleanName.includes('sevdah') ||
    cleanGroup.includes('music') ||
    cleanGroup.includes('musik') ||
    cleanUrl.includes('/music') ||
    cleanUrl.includes('/musik') ||
    cleanUrl.includes('/radio')
  ) {
    return 'Musik';
  }

  // 7. Sains & Dok (Science, Education & Documentary)
  if (
    cleanName.includes('nasa') ||
    cleanName.includes('space') ||
    cleanName.includes('science') ||
    cleanName.includes('sains') ||
    cleanName.includes('edu') ||
    cleanName.includes('education') ||
    cleanName.includes('documentary') ||
    cleanName.includes('history') ||
    cleanName.includes('discovery') ||
    cleanName.includes('geographic') ||
    cleanName.includes('nature') ||
    cleanName.includes('nat geo') ||
    cleanName.includes('savoir') ||
    cleanName.includes('tec tv') ||
    cleanGroup.includes('science') ||
    cleanGroup.includes('edu') ||
    cleanGroup.includes('documentary') ||
    cleanUrl.includes('/nasa') ||
    cleanUrl.includes('/science') ||
    cleanUrl.includes('/documentary') ||
    cleanUrl.includes('/nature')
  ) {
    return 'Sains & Dok';
  }

  // 8. Religi (Religion)
  if (
    cleanName.includes('church') ||
    cleanName.includes('islam') ||
    cleanName.includes('mosque') ||
    cleanName.includes('quran') ||
    cleanName.includes('bible') ||
    cleanName.includes('gospel') ||
    cleanName.includes('christian') ||
    cleanName.includes('masjid') ||
    cleanName.includes('sharia') ||
    cleanName.includes('buddha') ||
    cleanName.includes('hindu') ||
    cleanName.includes('peace tv') ||
    cleanName.includes('al-risalah') ||
    cleanGroup.includes('religion') ||
    cleanGroup.includes('religi') ||
    cleanUrl.includes('/religion') ||
    cleanUrl.includes('/quran') ||
    cleanUrl.includes('/masjid') ||
    cleanUrl.includes('/religi')
  ) {
    return 'Religi';
  }

  return 'Umum';
}

export function detectCountry(name: string, m3uGroup: string, url: string = ''): string {
  const cleanName = name.toLowerCase();
  const cleanGroup = m3uGroup.toLowerCase();
  const cleanUrl = url.toLowerCase();

  // 1. Indonesia
  if (
    cleanGroup.includes('indonesia') ||
    cleanGroup.includes('indo') ||
    cleanGroup.includes('idn') ||
    cleanName.includes('indonesia') ||
    cleanName.includes('indo') ||
    cleanName.includes('rcti') ||
    cleanName.includes('sctv') ||
    cleanName.includes('tvri') ||
    cleanName.includes('trans7') ||
    cleanName.includes('trans tv') ||
    cleanName.includes('antv') ||
    cleanName.includes('gtv') ||
    cleanName.includes('mnc') ||
    cleanName.includes('metrotv') ||
    cleanName.includes('kompas') ||
    cleanName.includes('🇮🇩') ||
    cleanName.includes('[id]') ||
    cleanName.includes('(id)') ||
    cleanName.includes(' id ') ||
    cleanUrl.includes('.id') ||
    cleanUrl.includes('/id/') ||
    cleanUrl.includes('/indonesia/') ||
    cleanUrl.includes('/indo/')
  ) {
    return 'Indonesia';
  }

  // 2. United States
  if (
    cleanGroup.includes('united states') ||
    cleanGroup.includes('usa') ||
    cleanGroup.includes('us ') ||
    cleanName.includes('usa') ||
    cleanName.includes('fox sports 1') ||
    cleanName.includes('fox sports 2') ||
    cleanName.includes('peacock') ||
    cleanName.includes('telemundo') ||
    cleanName.includes('🇺🇸') ||
    cleanName.includes('[us]') ||
    cleanName.includes('(us)') ||
    cleanUrl.includes('.us') ||
    cleanUrl.includes('/us/') ||
    cleanUrl.includes('/usa/')
  ) {
    return 'United States';
  }

  // 3. United Kingdom
  if (
    cleanGroup.includes('united kingdom') ||
    cleanGroup.includes('uk') ||
    cleanGroup.includes('great britain') ||
    cleanGroup.includes('gbr') ||
    cleanName.includes(' bbc') ||
    cleanName.includes('itv') ||
    cleanName.includes('iplayer') ||
    cleanName.includes('🇬🇧') ||
    cleanName.includes('[uk]') ||
    cleanName.includes('(uk)') ||
    cleanUrl.includes('.uk') ||
    cleanUrl.includes('/uk/') ||
    cleanUrl.includes('/unitedkingdom/')
  ) {
    return 'United Kingdom';
  }

  // 4. Turkey
  if (
    cleanGroup.includes('turkey') ||
    cleanGroup.includes('tr') ||
    cleanGroup.includes('türk') ||
    cleanGroup.includes('türkiye') ||
    cleanName.includes('trt') ||
    cleanName.includes('türk') ||
    cleanName.includes('türkiye') ||
    cleanName.includes('🇹🇷') ||
    cleanName.includes('[tr]') ||
    cleanName.includes('(tr)') ||
    cleanUrl.includes('.tr') ||
    cleanUrl.includes('/tr/') ||
    cleanUrl.includes('/turkey/')
  ) {
    return 'Turkey';
  }

  // 5. Germany
  if (
    cleanGroup.includes('germany') ||
    cleanGroup.includes('de') ||
    cleanGroup.includes('deutschland') ||
    cleanName.includes('ard') ||
    cleanName.includes('zdf') ||
    cleanName.includes('magentatv') ||
    cleanName.includes('🇩🇪') ||
    cleanName.includes('[de]') ||
    cleanName.includes('(de)') ||
    cleanUrl.includes('.de') ||
    cleanUrl.includes('/de/') ||
    cleanUrl.includes('/germany/') ||
    cleanUrl.includes('/deutschland/')
  ) {
    return 'Germany';
  }

  // 6. France
  if (
    cleanGroup.includes('france') ||
    cleanGroup.includes('fr') ||
    cleanName.includes('tf1') ||
    cleanName.includes('bein sports france') ||
    cleanName.includes('🇫🇷') ||
    cleanName.includes('[fr]') ||
    cleanName.includes('(fr)') ||
    cleanUrl.includes('.fr') ||
    cleanUrl.includes('/fr/') ||
    cleanUrl.includes('/france/')
  ) {
    return 'France';
  }

  // 7. Brazil
  if (
    cleanGroup.includes('brazil') ||
    cleanGroup.includes('br') ||
    cleanGroup.includes('brasil') ||
    cleanName.includes('globo') ||
    cleanName.includes('sportv') ||
    cleanName.includes('globoplay') ||
    cleanName.includes('🇧🇷') ||
    cleanName.includes('[br]') ||
    cleanName.includes('(br)') ||
    cleanUrl.includes('.br') ||
    cleanUrl.includes('/br/') ||
    cleanUrl.includes('/brazil/') ||
    cleanUrl.includes('/brasil/')
  ) {
    return 'Brazil';
  }

  // 8. Canada
  if (
    cleanGroup.includes('canada') ||
    cleanGroup.includes('ca') ||
    cleanName.includes('ctv') ||
    cleanName.includes('tsn') ||
    cleanName.includes('dazn canada') ||
    cleanName.includes('🇨🇦') ||
    cleanName.includes('[ca]') ||
    cleanName.includes('(ca)') ||
    cleanUrl.includes('.ca') ||
    cleanUrl.includes('/ca/') ||
    cleanUrl.includes('/canada/')
  ) {
    return 'Canada';
  }

  // 9. Mexico
  if (
    cleanGroup.includes('mexico') ||
    cleanGroup.includes('mx') ||
    cleanName.includes('televisa') ||
    cleanName.includes('tv azteca') ||
    cleanName.includes('canal 5') ||
    cleanName.includes('🇲🇽') ||
    cleanName.includes('[mx]') ||
    cleanName.includes('(mx)') ||
    cleanUrl.includes('.mx') ||
    cleanUrl.includes('/mx/') ||
    cleanUrl.includes('/mexico/')
  ) {
    return 'Mexico';
  }

  // 10. India
  if (
    cleanGroup.includes('india') ||
    cleanGroup.includes('in') ||
    cleanName.includes('sports18') ||
    cleanName.includes('jiocinema') ||
    cleanName.includes('🇮🇳') ||
    cleanName.includes('[in]') ||
    cleanName.includes('(in)') ||
    cleanUrl.includes('.in') ||
    cleanUrl.includes('/in/') ||
    cleanUrl.includes('/india/')
  ) {
    return 'India';
  }

  // 11. Argentina
  if (
    cleanGroup.includes('argentina') ||
    cleanGroup.includes('ar') ||
    cleanName.includes('televisión pública') ||
    cleanName.includes('🇦🇷') ||
    cleanName.includes('[ar]') ||
    cleanName.includes('(ar)') ||
    cleanUrl.includes('.ar') ||
    cleanUrl.includes('/ar/') ||
    cleanUrl.includes('/argentina/')
  ) {
    return 'Argentina';
  }

  // 12. Spain
  if (
    cleanGroup.includes('spain') ||
    cleanGroup.includes('es') ||
    cleanGroup.includes('españa') ||
    cleanName.includes('rtve') ||
    cleanName.includes('🇪🇸') ||
    cleanName.includes('[es]') ||
    cleanName.includes('(es)') ||
    cleanUrl.includes('.es') ||
    cleanUrl.includes('/es/') ||
    cleanUrl.includes('/spain/') ||
    cleanUrl.includes('/espana/')
  ) {
    return 'Spain';
  }

  // 13. Japan
  if (
    cleanGroup.includes('japan') ||
    cleanGroup.includes('jp') ||
    cleanName.includes('nhk') ||
    cleanName.includes('tv asahi') ||
    cleanName.includes('🇯🇵') ||
    cleanName.includes('[jp]') ||
    cleanName.includes('(jp)') ||
    cleanUrl.includes('.jp') ||
    cleanUrl.includes('/jp/') ||
    cleanUrl.includes('/japan/')
  ) {
    return 'Japan';
  }

  // Parse custom groups or return Global
  if (m3uGroup && m3uGroup !== 'Global') {
    return m3uGroup;
  }

  return 'Global';
}

export function parseM3U(content: string): IPTVChannel[] {
  const lines = content.split('\n');
  const channels: IPTVChannel[] = [];
  let currentInfo: {
    name: string;
    logo: string;
    rawGroup: string;
    id: string;
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTM3U')) {
      continue;
    }

    if (line.startsWith('#EXTINF:')) {
      // Parse tvg attributes
      const groupTitleMatch = line.match(/group-title="([^"]+)"/i);
      const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
      const idMatch = line.match(/tvg-id="([^"]+)"/i);
      const nameMatch = line.match(/tvg-name="([^"]+)"/i);
      
      // Channel name is usually the part after the last comma
      const commaIndex = line.lastIndexOf(',');
      let name = '';
      if (commaIndex !== -1) {
        name = line.substring(commaIndex + 1).trim();
      }
      
      // Fallback name to tvg-name if comma part is empty
      if (!name && nameMatch) {
        name = nameMatch[1];
      }
      if (!name) {
        name = 'Unknown Channel';
      }

      const rawGroup = groupTitleMatch ? groupTitleMatch[1] : 'Global';

      currentInfo = {
        name,
        logo: logoMatch ? logoMatch[1] : '',
        rawGroup,
        id: idMatch ? idMatch[1] : name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      };
    } else if (!line.startsWith('#') && (line.startsWith('http://') || line.startsWith('https://'))) {
      if (currentInfo) {
        const detectedCategory = detectGenre(currentInfo.name, currentInfo.rawGroup, line);
        const detectedCountry = detectCountry(currentInfo.name, currentInfo.rawGroup, line);
        channels.push({
          id: currentInfo.id || `channel-${channels.length + 1}-${Math.random().toString(36).substr(2, 4)}`,
          name: currentInfo.name,
          url: line,
          logo: currentInfo.logo,
          category: detectedCategory,
          country: detectedCountry,
        });
        currentInfo = null;
      } else {
        // Just a raw stream link
        const detectedCategory = detectGenre(`Saluran ${channels.length + 1}`, 'Global', line);
        const detectedCountry = detectCountry(`Saluran ${channels.length + 1}`, 'Global', line);
        channels.push({
          id: `channel-${channels.length + 1}`,
          name: `Saluran ${channels.length + 1}`,
          url: line,
          logo: '',
          category: detectedCategory,
          country: detectedCountry,
        });
      }
    }
  }

  return channels;
}
