import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ARABIC_SURAH_NAMES } from '../utils/surahNames';

interface Verse { id: number; text: string; }
interface Surah { id: number; name: string; verses: Verse[]; }
interface QuranScreenProps { setPage: (page: string) => void; }

const SURAH_PAGES: number[] = [
  1,2,50,77,106,128,151,177,187,208,
  221,235,249,255,262,267,282,293,305,312,
  322,332,342,350,359,367,377,385,396,404,
  411,415,418,428,434,440,446,453,458,467,
  477,483,489,496,499,502,507,511,515,518,
  520,523,526,528,531,534,537,542,545,549,
  551,553,554,556,558,560,562,564,566,568,
  570,572,574,575,577,578,580,582,583,585,
  586,587,587,589,590,591,591,592,593,594,
  595,595,596,596,597,597,598,598,599,599,
  600,600,601,601,601,602,602,602,603,603,
  603,604,604,604,
];

const JUZZ_PAGES: number[] = [
  1,22,42,62,82,102,121,142,162,182,
  201,221,241,261,281,301,321,341,361,381,
  401,421,441,461,481,501,521,541,561,581,
];

const CDN_HAFS = (p: number) =>
  `https://cdn.jsdelivr.net/gh/quran/quran.com-images@master/images/page${String(p).padStart(3,'0')}.png`;
const CDN_HAFS_RAW = (p: number) =>
  `https://raw.githubusercontent.com/quran/quran.com-images/master/images/page${String(p).padStart(3,'0')}.png`;

const getPageSurah = (page: number): number => {
  for (let i = SURAH_PAGES.length - 1; i >= 0; i--) {
    if (SURAH_PAGES[i] <= page) return i + 1;
  }
  return 1;
};

const getPageJuzz = (page: number): number => {
  for (let i = JUZZ_PAGES.length - 1; i >= 0; i--) {
    if (JUZZ_PAGES[i] <= page) return i + 1;
  }
  return 1;
};

type ViewMode = 'mushaf' | 'surahs';
type Recitation = 'hafs' | 'warsh';

const QuranScreen: React.FC<QuranScreenProps> = ({ setPage }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('mushaf');
  const [recitation, setRecitation] = useState<Recitation>('hafs');
  const [musPage, setMusPage] = useState(1);
  const [showNavOverlay, setShowNavOverlay] = useState(true);
  const [imgSrc, setImgSrc] = useState('');
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [warshVerses, setWarshVerses] = useState<{ text: string; num: number; surahNum: number }[]>([]);
  const [warshLoading, setWarshLoading] = useState(false);
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [surahSearch, setSurahSearch] = useState('');
  const [fontSize, setFontSize] = useState(22);
  const [showSelectors, setShowSelectors] = useState(false);
  const hideNavTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef(0);

  const showNavTemporarily = () => {
    setShowNavOverlay(true);
    if (hideNavTimer.current) clearTimeout(hideNavTimer.current);
    hideNavTimer.current = setTimeout(() => setShowNavOverlay(false), 4000);
  };

  useEffect(() => {
    showNavTemporarily();
    return () => { if (hideNavTimer.current) clearTimeout(hideNavTimer.current); };
  }, []);

  useEffect(() => {
    if (viewMode === 'surahs') {
      const raw = localStorage.getItem(`quran_${recitation}`);
      if (raw) {
        try {
          let parsed: Surah[] = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length === 114) {
            parsed = parsed.map((s, i) => ({ ...s, name: ARABIC_SURAH_NAMES[i] || s.name }));
            setSurahs(parsed);
          }
        } catch { /* ignore */ }
      }
    }
  }, [viewMode, recitation]);

  useEffect(() => {
    if (viewMode !== 'mushaf') return;
    setImgError(false);
    setImgLoading(true);
    if (recitation === 'hafs') {
      setImgSrc(CDN_HAFS(musPage));
    } else {
      loadWarshPage(musPage);
    }
  }, [musPage, recitation, viewMode]);

  const loadWarshPage = async (page: number) => {
    const cacheKey = `warsh_page_${page}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { setWarshVerses(JSON.parse(cached)); return; }
    setWarshLoading(true);
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/page/${page}/ar.warsh`);
      const json = await res.json();
      const ayahs = json?.data?.ayahs || [];
      const verses = ayahs.map((a: { text: string; numberInSurah: number; surah: { number: number } }) => ({
        text: a.text, num: a.numberInSurah, surahNum: a.surah.number,
      }));
      sessionStorage.setItem(cacheKey, JSON.stringify(verses));
      setWarshVerses(verses);
    } catch { setWarshVerses([]); }
    setWarshLoading(false);
  };

  const goToPage = (p: number) => {
    setMusPage(Math.max(1, Math.min(604, p)));
    showNavTemporarily();
  };

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 60) dx < 0 ? goToPage(musPage + 1) : goToPage(musPage - 1);
    else showNavTemporarily();
  };

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA'; u.rate = 0.8;
    window.speechSynthesis.speak(u);
  };

  const filteredSurahs = surahs.filter(
    s => s.name.includes(surahSearch) || String(s.id).includes(surahSearch)
  );

  if (viewMode === 'mushaf' && selectedSurah) {
    return (
      <div className="min-h-screen pb-24 flex flex-col" style={{ background: '#0d0d0d', direction: 'rtl', fontFamily: "'Cairo', sans-serif" }}>
        <div className="flex items-center gap-3 px-4 py-3 sticky top-0 z-10" style={{ background: '#0d0d0d', borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
          <button onClick={() => setSelectedSurah(null)} className="text-2xl" style={{ color: '#D4AF37' }}>←</button>
          <div className="flex-1">
            <h2 className="font-bold text-lg" style={{ color: '#D4AF37', fontFamily: "'Amiri', serif" }}>سورة {selectedSurah.name}</h2>
            <p className="text-gray-500 text-xs">{selectedSurah.verses?.length} آية</p>
          </div>
          <div className="flex gap-1">
            {[{l:'أ-',fn:()=>setFontSize(f=>Math.max(16,f-2))},{l:'أ+',fn:()=>setFontSize(f=>Math.min(40,f+2))}].map(b=>(
              <button key={b.l} onClick={b.fn} className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                style={{background:'#1E1E1E',color:'#D4AF37'}}>{b.l}</button>
            ))}
            <button onClick={() => speak(selectedSurah.verses.map(v=>v.text).join(' '))}
              className="w-8 h-8 rounded-full flex items-center justify-center" style={{background:'rgba(212,175,55,0.2)'}}>🔊</button>
          </div>
        </div>

        {selectedSurah.id !== 9 && (
          <div className="text-center py-4 px-4 border-b" style={{ borderColor: 'rgba(212,175,55,0.15)' }}>
            <p className="text-2xl" style={{ color: '#D4AF37', fontFamily: "'Scheherazade New', serif", letterSpacing: '0.05em' }}>
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          <div className="rounded-2xl p-5" style={{ background: '#1A1200', border: '1px solid rgba(212,175,55,0.2)', direction: 'rtl' }}>
            <p className="leading-loose text-right" style={{ fontFamily: "'Scheherazade New', serif", fontSize: `${fontSize}px`, color: '#f5f0e0', lineHeight: '2.5' }}>
              {selectedSurah.verses.map((v, i) => (
                <span key={v.id || i}>
                  {v.text}
                  <span style={{ fontFamily: "'Scheherazade New', serif", color: '#D4AF37', fontSize: `${fontSize - 4}px` }}>
                    {' ﴿'}{i + 1}{'﴾ '}
                  </span>
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'mushaf') {
    const currentSurah = getPageSurah(musPage);
    const currentJuzz = getPageJuzz(musPage);

    return (
      <div className="min-h-screen flex flex-col relative select-none"
        style={{ background: '#0a0a0a', direction: 'rtl', touchAction: 'pan-y' }}
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
        onClick={showNavTemporarily}>

        {showNavOverlay && (
          <div className="fixed top-0 left-0 right-0 z-20 transition-all" style={{ background: 'linear-gradient(180deg,rgba(0,0,0,0.9) 0%,transparent 100%)' }}>
            <div className="flex items-center gap-2 px-3 py-3">
              <button onClick={() => setPage('home')} className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ background: 'rgba(212,175,55,0.2)', color: '#D4AF37' }}>←</button>
              <button onClick={e => { e.stopPropagation(); setShowSelectors(s => !s); }}
                className="flex-1 py-1.5 rounded-xl text-center text-xs font-bold"
                style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
                {ARABIC_SURAH_NAMES[currentSurah - 1]} · الجزء {currentJuzz} · صفحة {musPage}
              </button>
              <div className="flex gap-1">
                {(['hafs','warsh'] as Recitation[]).map(r=>(
                  <button key={r} onClick={e=>{e.stopPropagation();setRecitation(r);}}
                    className="px-2 py-1 rounded-lg text-xs font-bold"
                    style={{background:recitation===r?'#D4AF37':'rgba(212,175,55,0.1)',color:recitation===r?'#121212':'#D4AF37'}}>
                    {r==='hafs'?'حفص':'ورش'}
                  </button>
                ))}
                <button onClick={e=>{e.stopPropagation();setViewMode('surahs');}}
                  className="px-2 py-1 rounded-lg text-xs font-bold"
                  style={{background:'rgba(212,175,55,0.1)',color:'#D4AF37'}}>سور</button>
              </div>
            </div>

            {showSelectors && (
              <div className="px-3 pb-3 grid grid-cols-2 gap-2" onClick={e=>e.stopPropagation()}>
                <div>
                  <p className="text-xs text-gray-500 mb-1">السورة</p>
                  <select className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
                    style={{background:'#1E1E1E',color:'white',border:'1px solid rgba(212,175,55,0.3)'}}
                    value={currentSurah} onChange={e=>{ goToPage(SURAH_PAGES[+e.target.value-1]); setShowSelectors(false); }}>
                    {ARABIC_SURAH_NAMES.map((name,i)=>(
                      <option key={i} value={i+1}>{i+1}. {name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">الجزء</p>
                  <select className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
                    style={{background:'#1E1E1E',color:'white',border:'1px solid rgba(212,175,55,0.3)'}}
                    value={currentJuzz} onChange={e=>{ goToPage(JUZZ_PAGES[+e.target.value-1]); setShowSelectors(false); }}>
                    {Array.from({length:30},(_,i)=>i+1).map(j=>(
                      <option key={j} value={j}>الجزء {j}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 flex items-center justify-center relative" style={{ minHeight: '85vh' }}>
          {recitation === 'hafs' ? (
            <>
              {imgLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{borderColor:'#D4AF37',borderTopColor:'transparent'}}/>
                </div>
              )}
              {imgError ? (
                <div className="flex flex-col items-center gap-4 px-8 text-center">
                  <p className="text-5xl">📖</p>
                  <p className="text-gray-400 text-sm">تعذر تحميل صورة الصفحة {musPage}</p>
                  <button onClick={() => { setImgError(false); setImgLoading(true); setImgSrc(CDN_HAFS_RAW(musPage)); }}
                    className="px-4 py-2 rounded-xl text-sm font-bold" style={{background:'#D4AF37',color:'#121212'}}>إعادة المحاولة</button>
                </div>
              ) : (
                <img src={imgSrc} alt={`صفحة ${musPage}`}
                  className="max-h-screen max-w-full object-contain"
                  style={{ display: imgLoading ? 'none' : 'block', boxShadow: '0 0 60px rgba(212,175,55,0.15)' }}
                  onLoad={() => setImgLoading(false)}
                  onError={() => {
                    if (imgSrc === CDN_HAFS(musPage)) { setImgSrc(CDN_HAFS_RAW(musPage)); }
                    else { setImgLoading(false); setImgError(true); }
                  }}
                />
              )}
            </>
          ) : (
            <div className="w-full max-w-lg mx-4 my-4 rounded-2xl overflow-hidden"
              style={{ background: '#FDF8E8', border: '4px double #8B6914', boxShadow: '0 0 40px rgba(212,175,55,0.3)' }}>
              <div className="text-center py-3 border-b" style={{ borderColor: '#8B6914', background: '#F5ECC5' }}>
                <p className="text-sm font-bold" style={{ color: '#8B6914', fontFamily: "'Amiri',serif" }}>
                  {ARABIC_SURAH_NAMES[currentSurah - 1]} · الجزء {currentJuzz} · صفحة {musPage}
                </p>
              </div>
              {warshLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{borderColor:'#8B6914',borderTopColor:'transparent'}}/>
                </div>
              ) : warshVerses.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-500 text-sm">تعذر تحميل الصفحة</p>
                </div>
              ) : (
                <div className="p-5">
                  <p className="leading-loose text-right"
                    style={{ fontFamily: "'Scheherazade New', serif", fontSize: '20px', color: '#1a1a1a', lineHeight: '2.8', direction: 'rtl' }}>
                    {warshVerses.map((v, i) => (
                      <span key={i}>
                        {v.text}
                        <span style={{ fontFamily: "'Scheherazade New',serif", color: '#8B6914', fontSize: '14px' }}>
                          {' ﴿'}{v.num}{'﴾ '}
                        </span>
                      </span>
                    ))}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {showNavOverlay && (
          <div className="fixed bottom-0 left-0 right-0 z-20" style={{ background: 'linear-gradient(0deg,rgba(0,0,0,0.9) 0%,transparent 100%)' }}>
            <div className="flex items-center gap-3 px-4 py-4">
              <button onClick={e=>{e.stopPropagation();goToPage(musPage-1);}}
                disabled={musPage<=1}
                className="flex-1 py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all"
                style={{background:musPage<=1?'#1a1a1a':'rgba(212,175,55,0.2)',color:musPage<=1?'#444':'#D4AF37',border:'1px solid rgba(212,175,55,0.2)'}}>
                ‹ السابقة
              </button>
              <div className="flex flex-col items-center gap-1" onClick={e=>e.stopPropagation()}>
                <p className="text-xs text-gray-500">{musPage} / 604</p>
                <input type="number" min={1} max={604} value={musPage}
                  onChange={e=>goToPage(+e.target.value)}
                  className="w-16 text-center text-sm font-bold py-1 rounded-lg outline-none"
                  style={{background:'#1E1E1E',color:'#D4AF37',border:'1px solid rgba(212,175,55,0.3)'}}/>
              </div>
              <button onClick={e=>{e.stopPropagation();goToPage(musPage+1);}}
                disabled={musPage>=604}
                className="flex-1 py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all"
                style={{background:musPage>=604?'#1a1a1a':'rgba(212,175,55,0.2)',color:musPage>=604?'#444':'#D4AF37',border:'1px solid rgba(212,175,55,0.2)'}}>
                التالية ›
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (selectedSurah) {
    return (
      <div className="min-h-screen pb-24 flex flex-col" style={{ background: '#0d0d0d', direction: 'rtl', fontFamily: "'Cairo', sans-serif" }}>
        <div className="flex items-center gap-3 px-4 py-3 sticky top-0 z-10" style={{ background: '#0d0d0d', borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
          <button onClick={() => setSelectedSurah(null)} className="text-2xl" style={{ color: '#D4AF37' }}>←</button>
          <div className="flex-1">
            <h2 className="font-bold text-lg" style={{ color: '#D4AF37', fontFamily: "'Amiri', serif" }}>سورة {selectedSurah.name}</h2>
            <p className="text-gray-500 text-xs">{selectedSurah.verses?.length} آية · رواية {recitation === 'hafs' ? 'حفص' : 'ورش'}</p>
          </div>
          <div className="flex gap-1">
            {[{l:'أ-',fn:()=>setFontSize(f=>Math.max(16,f-2))},{l:'أ+',fn:()=>setFontSize(f=>Math.min(40,f+2))}].map(b=>(
              <button key={b.l} onClick={b.fn} className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                style={{background:'#1E1E1E',color:'#D4AF37'}}>{b.l}</button>
            ))}
            <button onClick={() => speak(selectedSurah.verses.map(v=>v.text).join(' '))}
              className="w-8 h-8 rounded-full flex items-center justify-center" style={{background:'rgba(212,175,55,0.2)'}}>🔊</button>
          </div>
        </div>

        {selectedSurah.id !== 9 && (
          <div className="text-center py-4 px-4 border-b" style={{ borderColor: 'rgba(212,175,55,0.15)' }}>
            <p className="text-2xl" style={{ color: '#D4AF37', fontFamily: "'Scheherazade New', serif" }}>
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          <div className="rounded-2xl p-5" style={{ background: '#1A1200', border: '1px solid rgba(212,175,55,0.2)', direction: 'rtl' }}>
            <p className="leading-loose text-right" style={{ fontFamily: "'Scheherazade New', serif", fontSize: `${fontSize}px`, color: '#f5f0e0', lineHeight: '2.5' }}>
              {selectedSurah.verses.map((v, i) => (
                <span key={v.id || i}>
                  {v.text}
                  <span style={{ fontFamily: "'Scheherazade New', serif", color: '#D4AF37', fontSize: `${fontSize - 4}px` }}>
                    {' ﴿'}{i + 1}{'﴾ '}
                  </span>
                </span>
              ))}
            </p>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => speak(selectedSurah.verses.map(v=>v.text).join(' '))}
              className="flex-1 py-3 rounded-xl font-bold text-sm" style={{background:'rgba(212,175,55,0.15)',color:'#D4AF37',border:'1px solid rgba(212,175,55,0.2)'}}>
              🔊 استمع للسورة كاملة
            </button>
            <button onClick={() => { goToPage(SURAH_PAGES[selectedSurah.id-1]); setSelectedSurah(null); setViewMode('mushaf'); }}
              className="flex-1 py-3 rounded-xl font-bold text-sm" style={{background:'rgba(212,175,55,0.15)',color:'#D4AF37',border:'1px solid rgba(212,175,55,0.2)'}}>
              📖 افتح في المصحف
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 flex flex-col" style={{ background: '#121212', direction: 'rtl', fontFamily: "'Cairo', sans-serif" }}>
      <div className="px-4 py-4 sticky top-0 z-10 space-y-3" style={{ background: '#121212', borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setPage('home')} className="text-2xl" style={{ color: '#D4AF37' }}>←</button>
          <h1 className="text-xl font-bold flex-1" style={{ color: '#D4AF37' }}>القرآن الكريم</h1>
          <button onClick={() => setViewMode('mushaf')}
            className="px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{background:'rgba(212,175,55,0.15)',color:'#D4AF37',border:'1px solid rgba(212,175,55,0.2)'}}>
            📖 المصحف
          </button>
        </div>

        <div className="flex gap-2">
          {(['hafs','warsh'] as Recitation[]).map(r=>(
            <button key={r} onClick={()=>setRecitation(r)}
              className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
              style={{background:recitation===r?'#D4AF37':'#1E1E1E',color:recitation===r?'#121212':'#888',border:'1px solid rgba(212,175,55,0.3)'}}>
              {r==='hafs'?'رواية حفص':'رواية ورش'}
            </button>
          ))}
        </div>

        <input type="text" placeholder="ابحث عن سورة بالاسم أو الرقم..." value={surahSearch}
          onChange={e=>setSurahSearch(e.target.value)}
          className="w-full px-4 py-2 rounded-xl text-sm outline-none"
          style={{background:'#1E1E1E',color:'white',border:'1px solid rgba(212,175,55,0.2)'}}/>
      </div>

      {surahs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <p className="text-5xl">📖</p>
          <p className="text-gray-400 text-center">لم يُحمَّل القرآن بعد.<br/>يرجى الانتظار حتى تنتهي شاشة التحميل.</p>
          <button onClick={() => setViewMode('mushaf')} className="px-6 py-3 rounded-xl font-bold"
            style={{background:'#D4AF37',color:'#121212'}}>افتح عارض المصحف</button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 p-4">
            {filteredSurahs.map(surah=>(
              <button key={surah.id} onClick={()=>setSelectedSurah(surah)}
                className="flex flex-col p-3 rounded-xl text-right transition-all active:scale-95"
                style={{background:'#1E1E1E',border:'1px solid rgba(212,175,55,0.15)'}}>
                <div className="flex items-center justify-between mb-1">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{background:'rgba(212,175,55,0.2)',color:'#D4AF37'}}>{surah.id}</div>
                  <span className="text-gray-600 text-xs">{surah.verses?.length} آية</span>
                </div>
                <p className="font-bold text-sm" style={{color:'#D4AF37',fontFamily:"'Amiri',serif"}}>{surah.name}</p>
                <p className="text-xs text-gray-600 mt-0.5">ص {SURAH_PAGES[surah.id-1]}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuranScreen;
