import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
}

const ALL_HADITH_BOOKS = [
  { id: 'bukhari',       name: 'صحيح البخاري',             cdn: 'ara-bukhari' },
  { id: 'muslim',        name: 'صحيح مسلم',                cdn: 'ara-muslim' },
  { id: 'tirmidhi',      name: 'سنن الترمذي',              cdn: 'ara-tirmidhi' },
  { id: 'abudawud',      name: 'سنن أبي داود',             cdn: 'ara-abudawud' },
  { id: 'nasai',         name: 'سنن النسائي',              cdn: 'ara-nasai' },
  { id: 'ibnmajah',      name: 'سنن ابن ماجه',            cdn: 'ara-ibnmajah' },
  { id: 'malik',         name: 'موطأ مالك',                cdn: 'ara-malik' },
  { id: 'darimi',        name: 'سنن الدارمي',              cdn: 'ara-darimi' },
  { id: 'ahmad',         name: 'مسند أحمد',                cdn: '' },
  { id: 'ibnhban',       name: 'صحيح ابن حبان',           cdn: '' },
  { id: 'ibnhuzaimah',   name: 'صحيح ابن خزيمة',          cdn: '' },
  { id: 'hakim',         name: 'المستدرك على الصحيحين',   cdn: '' },
  { id: 'nawawi',        name: 'الأربعون النووية',         cdn: 'ara-nawawi40' },
  { id: 'riyadh',        name: 'رياض الصالحين',           cdn: '' },
  { id: 'mishkat',       name: 'مشكاة المصابيح',          cdn: '' },
  { id: 'bulugh',        name: 'بلوغ المرام',              cdn: '' },
  { id: 'umdah',         name: 'عمدة الأحكام',             cdn: '' },
  { id: 'saeed',         name: 'سنن سعيد بن منصور',       cdn: '' },
  { id: 'abdulrazzaq',   name: 'مصنف عبد الرزاق',         cdn: '' },
  { id: 'ibnabishaybah', name: 'مصنف ابن أبي شيبة',       cdn: '' },
];

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/';
const SAANDSOFT_BASE = 'https://raw.githubusercontent.com/saandsoft/hadith-json/main/db/';
const MAX_HADITHS = 600;

const isValidQuran = (key: string): boolean => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length === 114 && parsed[0]?.verses?.length > 0;
  } catch { return false; }
};

const isHadithCached = (id: string): boolean => {
  try {
    const raw = localStorage.getItem(`hadith_${id}`);
    if (!raw) return false;
    const d = JSON.parse(raw);
    const list = d.hadiths || d.data || (Array.isArray(d) ? d : []);
    return list.length > 0;
  } catch { return false; }
};

type RawHadith = {
  text?: string; hadith?: string; arabic?: string;
  hadithnumber?: number; id?: number;
  reference?: { book?: number; hadith?: number };
};
const extractHadiths = (data: unknown): { id: number; text: string; book?: number }[] => {
  let list: RawHadith[] = [];
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.hadiths)) list = d.hadiths as RawHadith[];
    else if (Array.isArray(d.data)) list = d.data as RawHadith[];
  } else if (Array.isArray(data)) {
    list = data as RawHadith[];
  }
  return list.slice(0, MAX_HADITHS).map((h, i) => ({
    id: (h.hadithnumber ?? h.id ?? i + 1) as number,
    text: (h.text || h.hadith || h.arabic || '') as string,
    book: h.reference?.book,
  })).filter(h => h.text.length > 5);
};

const extractSections = (data: unknown): Record<string, string> => {
  try {
    const d = data as Record<string, unknown>;
    const meta = d?.metadata as Record<string, unknown> | undefined;
    const section = meta?.section;
    if (section && typeof section === 'object' && !Array.isArray(section)) {
      return section as Record<string, string>;
    }
  } catch { /* ignore */ }
  return {};
};

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('جاري التحقق من البيانات...');
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState('');

  const loadQuranRisan = async (recitation: string): Promise<boolean> => {
    const urls = [
      'https://cdn.jsdelivr.net/gh/risan/quran-json@main/data/quran.json',
      'https://raw.githubusercontent.com/risan/quran-json/main/data/quran.json',
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        let data = await res.json();
        if (data && !Array.isArray(data) && data.data) data = data.data;
        if (Array.isArray(data) && data.length === 114 && data[0]?.verses?.length > 0) {
          localStorage.setItem(`quran_${recitation}`, JSON.stringify(data));
          return true;
        }
      } catch { /* try next */ }
    }
    return false;
  };

  const loadQuranAlquranCloud = async (recitation: string, edition: string): Promise<boolean> => {
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/quran/${edition}`);
      if (!res.ok) return false;
      const json = await res.json();
      const surahs = json?.data?.surahs;
      if (!Array.isArray(surahs) || surahs.length !== 114) return false;
      const transformed = surahs.map((s: { number: number; englishName: string; revelationType: string; ayahs: { numberInSurah: number; text: string }[] }) => ({
        id: s.number,
        name: s.englishName,
        transliteration: s.englishName,
        type: (s.revelationType || 'meccan').toLowerCase(),
        total_verses: s.ayahs?.length || 0,
        verses: (s.ayahs || []).map((a) => ({ id: a.numberInSurah, text: a.text })),
      }));
      localStorage.setItem(`quran_${recitation}`, JSON.stringify(transformed));
      return true;
    } catch { return false; }
  };

  const loadHadithBook = async (id: string, cdn: string): Promise<boolean> => {
    if (cdn) {
      try {
        const res = await fetch(`${CDN_BASE}${cdn}.min.json`);
        if (res.ok) {
          const data = await res.json();
          const hadiths = extractHadiths(data);
          if (hadiths.length > 0) {
            localStorage.setItem(`hadith_${id}`, JSON.stringify({ hadiths }));
            const sections = extractSections(data);
            if (Object.keys(sections).length > 0) {
              try { localStorage.setItem(`hadith_${id}_sections`, JSON.stringify(sections)); } catch { /* storage full */ }
            }
            return true;
          }
        }
      } catch { /* fall through */ }
    }
    try {
      const res = await fetch(`${SAANDSOFT_BASE}${id}.json`);
      if (!res.ok) return false;
      const data = await res.json();
      const hadiths = extractHadiths(data);
      if (hadiths.length > 0) {
        localStorage.setItem(`hadith_${id}`, JSON.stringify({ hadiths }));
        const sections = extractSections(data);
        if (Object.keys(sections).length > 0) {
          try { localStorage.setItem(`hadith_${id}_sections`, JSON.stringify(sections)); } catch { /* storage full */ }
        }
        return true;
      }
      return false;
    } catch { return false; }
  };

  const loadAllData = async () => {
    setError(null);
    const total = 2 + ALL_HADITH_BOOKS.length;
    let current = 0;
    const step = () => { current++; setProgress(Math.round((current / total) * 100)); };

    setStatus('تحميل القرآن - رواية حفص...');
    setDetail('');
    if (!isValidQuran('quran_hafs')) {
      const ok = await loadQuranRisan('hafs');
      if (!ok) await loadQuranAlquranCloud('hafs', 'quran-uthmani');
    }
    step();

    setStatus('تحميل القرآن - رواية ورش...');
    setDetail('');
    if (!isValidQuran('quran_warsh')) {
      const ok = await loadQuranAlquranCloud('warsh', 'ar.warsh');
      if (!ok) {
        const hafsRaw = localStorage.getItem('quran_hafs');
        if (hafsRaw) localStorage.setItem('quran_warsh', hafsRaw);
      }
    }
    step();

    for (let i = 0; i < ALL_HADITH_BOOKS.length; i++) {
      const book = ALL_HADITH_BOOKS[i];
      if (!isHadithCached(book.id)) {
        setStatus(`تحميل كتب الحديث (${i + 1}/${ALL_HADITH_BOOKS.length})`);
        setDetail(book.name);
        await loadHadithBook(book.id, book.cdn);
      } else {
        setStatus(`كتب الحديث (${i + 1}/${ALL_HADITH_BOOKS.length})`);
        setDetail(book.name + ' ✅');
      }
      step();
    }

    setProgress(100);
    setStatus('اكتمل التحميل ✅');
    setDetail('التطبيق جاهز للعمل بدون إنترنت');
    setTimeout(onComplete, 900);
  };

  const checkAndLoad = () => {
    const hafsOk = isValidQuran('quran_hafs');
    const warshOk = isValidQuran('quran_warsh');
    const hadithOk = ALL_HADITH_BOOKS.every(b => isHadithCached(b.id));

    if (hafsOk && warshOk && hadithOk) {
      setStatus('البيانات محفوظة محلياً ✅');
      setDetail('جميع البيانات جاهزة');
      setProgress(100);
      setTimeout(onComplete, 500);
    } else {
      const missing: string[] = [];
      if (!hafsOk) missing.push('القرآن (حفص)');
      if (!warshOk) missing.push('القرآن (ورش)');
      const missingH = ALL_HADITH_BOOKS.filter(b => !isHadithCached(b.id));
      if (missingH.length) missing.push(`${missingH.length} كتاب حديث`);
      setDetail(`جاري تحميل: ${missing.join('، ')}`);
      loadAllData();
    }
  };

  useEffect(() => { checkAndLoad(); }, []);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen"
      style={{ background: 'linear-gradient(135deg, #121212 0%, #1a1a2e 50%, #121212 100%)', fontFamily: "'Cairo', sans-serif", direction: 'rtl' }}
    >
      <div className="flex flex-col items-center gap-8 px-6 max-w-sm w-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-2xl" style={{ boxShadow: '0 0 40px rgba(212,175,55,0.4)' }}>
            <img src="/icons/icon.png" alt="رفيق الدرب" className="w-full h-full object-cover" />
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold" style={{ color: '#D4AF37', fontFamily: "'Amiri', serif" }}>رفيق الدرب</h1>
            <p className="text-gray-400 text-sm mt-1">Rafeeq Al-Darb</p>
          </div>
        </div>

        <div className="w-full space-y-3">
          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #D4AF37, #f0d060)' }} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <p className="text-white text-sm font-bold">{status}</p>
              <span className="text-gray-400 text-xs font-mono">{Math.round(progress)}%</span>
            </div>
            {detail && <p className="text-gray-500 text-xs">{detail}</p>}
          </div>
        </div>

        <div className="w-full grid grid-cols-3 gap-2">
          {[
            { label: 'القرآن', value: '2 رواية', ok: isValidQuran('quran_hafs') && isValidQuran('quran_warsh') },
            { label: 'السور', value: '114 سورة', ok: isValidQuran('quran_hafs') },
            { label: 'الحديث', value: '20 كتاب', ok: ALL_HADITH_BOOKS.every(b => isHadithCached(b.id)) },
          ].map(s => (
            <div key={s.label} className="p-2 rounded-xl text-center"
              style={{ background: s.ok ? 'rgba(212,175,55,0.1)' : '#1E1E1E', border: `1px solid ${s.ok ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.05)'}` }}>
              <p className="text-xs font-bold" style={{ color: s.ok ? '#D4AF37' : '#555' }}>{s.value}</p>
              <p className="text-xs text-gray-600 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {error && (
          <div className="w-full bg-red-900/50 border border-red-500 rounded-lg p-4 text-center">
            <p className="text-red-300 text-sm">{error}</p>
            <button onClick={() => { setError(null); setProgress(0); checkAndLoad(); }}
              className="mt-2 px-4 py-1 rounded-lg text-sm font-bold" style={{ background: '#D4AF37', color: '#121212' }}>
              إعادة المحاولة
            </button>
          </div>
        )}

        <div className="text-center space-y-1">
          <p className="text-gray-500 text-xs">يحتاج إنترنت لأول مرة فقط</p>
          <p className="text-gray-600 text-xs">بعد التحميل يعمل بدون إنترنت تماماً</p>
        </div>

        <div className="pt-4 border-t border-gray-800 w-full text-center">
          <p className="text-xs" style={{ color: '#D4AF37' }}>المطور البسيط - بدر الدين زرفاوي</p>
          <p className="text-gray-600 text-xs">Badr Eddine Zerfaoui</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
