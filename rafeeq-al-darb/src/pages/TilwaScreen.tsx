import React, { useState, useEffect, useRef } from 'react';
import { ARABIC_SURAH_NAMES } from '../utils/surahNames';

interface Verse { id: number; text: string; }
interface Surah { id: number; name: string; verses: Verse[]; }
interface TilwaScreenProps { setPage: (page: string) => void; }

type Recitation = 'hafs' | 'warsh';

const analyzeTajweed = (spoken: string, expected: string): string => {
  if (expected.includes('مَنْ آمَنَ') && !spoken.includes('آمن'))
    return '⚠️ خطأ في الإظهار: يجب إظهار النون الساكنة قبل الهمزة';
  if (expected.includes('مِن رَّبِّ') && !spoken.includes('ربّ'))
    return '⚠️ خطأ في الإدغام: يجب إدغام النون الساكنة في الراء';
  if (expected.includes('مِن بَعْدِ') && !spoken.includes('بعد'))
    return '⚠️ خطأ في الإقلاب: تُقلب النون ميماً عند الباء';
  const similarity = levenshteinSimilarity(
    spoken.replace(/[\u064B-\u065F]/g, ''),
    expected.replace(/[\u064B-\u065F]/g, '')
  );
  if (similarity < 0.6) return '⚠️ الكلمات مختلفة - تأكد من النطق الصحيح';
  if (similarity < 0.8) return '⚠️ يوجد فرق طفيف في النطق - راجع مخارج الحروف';
  return '⚠️ خطأ في التلاوة - حاول مرة أخرى';
};

const levenshteinSimilarity = (a: string, b: string): number => {
  const m = a.length, n = b.length;
  if (!m || !n) return 0;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return 1 - dp[m][n] / Math.max(m, n);
};

const TilwaScreen: React.FC<TilwaScreenProps> = ({ setPage }) => {
  const [recitation, setRecitation] = useState<Recitation>('hafs');
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [currentAyah, setCurrentAyah] = useState(0);
  const [recognizedText, setRecognizedText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [correction, setCorrection] = useState<{ spoken: string; expected: string; errorMsg: string } | null>(null);
  const [showError, setShowError] = useState(false);
  const [search, setSearch] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const loadSurahs = (r: Recitation) => {
    const raw = localStorage.getItem(`quran_${r}`);
    if (raw) {
      try {
        let parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed = parsed.map((s: Surah, idx: number) => ({
            ...s,
            name: ARABIC_SURAH_NAMES[idx] || s.name
          }));
          setSurahs(parsed);
        }
      } catch { /* ignore */ }
    } else {
      setSurahs([]);
    }
  };

  useEffect(() => {
    loadSurahs(recitation);
    setSelectedSurah(null);
    setCurrentAyah(0);
    setRecognizedText('');
    setCorrection(null);
    setShowError(false);
  }, [recitation]);

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('متصفحك لا يدعم التعرف الصوتي. استخدم Chrome أو Safari.'); return; }
    const recognition = new SR();
    recognition.lang = 'ar-SA';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    recognition.onstart = () => setIsListening(true);
    recognition.onend   = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const spoken = event.results[0][0].transcript.trim();
      setRecognizedText(spoken);
      const verse = selectedSurah?.verses[currentAyah];
      if (!verse) return;
      const expected = verse.text;
      const cleaned = (t: string) => t.replace(/[\u064B-\u065F]/g, '').trim();
      const similarity = levenshteinSimilarity(cleaned(spoken), cleaned(expected));
      if (similarity < 0.7) {
        const errorMsg = analyzeTajweed(spoken, expected);
        setCorrection({ spoken, expected, errorMsg });
        setShowError(true);
        if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
        setTimeout(() => {
          if (!("speechSynthesis" in window)) return; window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(expected);
          u.lang = 'ar-SA'; u.rate = 0.7;
          window.speechSynthesis.speak(u);
        }, 500);
      } else {
        setCorrection(null);
        setShowError(false);
        setTimeout(() => {
          if (currentAyah < (selectedSurah?.verses.length || 0) - 1) {
            setCurrentAyah(a => a + 1);
            setRecognizedText('');
          } else {
            alert('ما شاء الله! أنهيت السورة ✅');
          }
        }, 800);
      }
    };
    recognition.start();
  };

  const stopListening = () => { recognitionRef.current?.stop(); setIsListening(false); };

  const currentVerse = selectedSurah?.verses[currentAyah];
  const filtered = surahs.filter(s => s.name.includes(search) || String(s.id).includes(search));

  const hafsAvailable  = !!localStorage.getItem('quran_hafs');
  const warshAvailable = !!localStorage.getItem('quran_warsh');

  return (
    <div
      className="min-h-screen pb-24 flex flex-col"
      style={{
        background: showError ? '#1a0000' : '#121212',
        border: showError ? '4px solid #ff0000' : 'none',
        fontFamily: "'Cairo', sans-serif",
        direction: 'rtl',
        transition: 'background 0.3s, border 0.3s'
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-4 sticky top-0 z-10 space-y-3"
        style={{ background: showError ? '#1a0000' : '#121212', borderBottom: '1px solid rgba(212,175,55,0.2)' }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => setPage('home')} className="text-2xl" style={{ color: '#D4AF37' }}>←</button>
          <h1 className="text-xl font-bold" style={{ color: '#D4AF37' }}>صفحة التلاوة</h1>
        </div>

        {/* Recitation Selector */}
        {!selectedSurah && (
          <div className="flex gap-2">
            {([
              { key: 'hafs' as Recitation, label: 'رواية حفص عن عاصم', available: hafsAvailable },
              { key: 'warsh' as Recitation, label: 'رواية ورش عن نافع', available: warshAvailable },
            ]).map(r => (
              <button
                key={r.key}
                onClick={() => r.available && setRecitation(r.key)}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: recitation === r.key ? '#D4AF37' : '#1E1E1E',
                  color: recitation === r.key ? '#121212' : r.available ? '#888' : '#444',
                  border: `1px solid ${recitation === r.key ? '#D4AF37' : 'rgba(212,175,55,0.2)'}`,
                  opacity: r.available ? 1 : 0.5,
                  cursor: r.available ? 'pointer' : 'not-allowed'
                }}
              >
                {r.label}
                {!r.available && ' (غير محمّل)'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Surah selector */}
      {!selectedSurah ? (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {surahs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <p className="text-4xl">📖</p>
              <p className="text-gray-400 text-center">
                رواية {recitation === 'hafs' ? 'حفص' : 'ورش'} غير محمّلة بعد.<br />
                أعد تشغيل التطبيق مع الإنترنت لتحميلها.
              </p>
            </div>
          ) : (
            <>
              <input
                type="text"
                placeholder="ابحث عن سورة..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-4 py-2 rounded-xl text-sm outline-none mb-3"
                style={{ background: '#1E1E1E', color: 'white', border: '1px solid rgba(212,175,55,0.2)' }}
              />
              <div className="grid grid-cols-2 gap-2">
                {filtered.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedSurah(s); setCurrentAyah(0); setRecognizedText(''); setCorrection(null); setShowError(false); }}
                    className="flex flex-col p-3 rounded-xl text-right"
                    style={{ background: '#1E1E1E', border: '1px solid rgba(212,175,55,0.15)' }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: 'rgba(212,175,55,0.2)', color: '#D4AF37' }}>{s.id}</div>
                      <span className="text-gray-600 text-xs">{s.verses?.length} آية</span>
                    </div>
                    <p className="font-bold text-sm" style={{ color: '#D4AF37', fontFamily: "'Amiri', serif" }}>{s.name}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col px-4 py-4 gap-4">
          {/* Back + info row */}
          <div className="flex items-center justify-between">
            <button onClick={() => { setSelectedSurah(null); setShowError(false); }} className="text-sm" style={{ color: '#D4AF37' }}>
              ← {selectedSurah.name}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
                {recitation === 'hafs' ? 'حفص' : 'ورش'}
              </span>
              <p className="text-gray-500 text-xs">آية {currentAyah + 1}/{selectedSurah.verses.length}</p>
            </div>
          </div>

          {/* Verse display */}
          <div className="p-5 rounded-2xl" style={{ background: '#1E1E1E', border: '1px solid rgba(212,175,55,0.3)' }}>
            <p className="text-gray-500 text-xs mb-3 text-center">سورة {selectedSurah.name} · الآية {currentAyah + 1}</p>
            <p
              className="leading-loose text-white text-center"
              style={{ fontSize: '26px', fontFamily: "'Scheherazade New', serif" }}
            >
              {currentVerse?.text}
            </p>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button
              onClick={() => { if (currentAyah > 0) { setCurrentAyah(a => a - 1); setRecognizedText(''); setCorrection(null); setShowError(false); } }}
              disabled={currentAyah === 0}
              className="flex-1 py-2 rounded-xl text-sm font-bold"
              style={{ background: '#1E1E1E', color: currentAyah === 0 ? '#444' : '#888', border: '1px solid #333' }}
            >◄ السابقة</button>
            <button
              onClick={() => {
                if (!("speechSynthesis" in window)) return; window.speechSynthesis.cancel();
                const u = new SpeechSynthesisUtterance(currentVerse?.text || '');
                u.lang = 'ar-SA'; u.rate = 0.7;
                window.speechSynthesis.speak(u);
              }}
              className="flex-1 py-2 rounded-xl text-sm font-bold"
              style={{ background: '#1E1E1E', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}
            >🔊 استمع</button>
            <button
              onClick={() => {
                if (currentAyah < selectedSurah.verses.length - 1) {
                  setCurrentAyah(a => a + 1); setRecognizedText(''); setCorrection(null); setShowError(false);
                }
              }}
              disabled={currentAyah >= selectedSurah.verses.length - 1}
              className="flex-1 py-2 rounded-xl text-sm font-bold"
              style={{ background: '#1E1E1E', color: currentAyah >= selectedSurah.verses.length - 1 ? '#444' : '#888', border: '1px solid #333' }}
            >التالية ►</button>
          </div>

          {/* Error overlay */}
          {showError && correction && (
            <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,0,0,0.2)', border: '2px solid #ff0000' }}>
              <p className="text-red-400 font-bold text-sm mb-2">{correction.errorMsg}</p>
              <p className="text-gray-400 text-xs">ما تلوت: <span className="text-white">{correction.spoken}</span></p>
              <p className="text-gray-400 text-xs mt-1">الصحيح:
                <span style={{ color: '#D4AF37', fontFamily: "'Scheherazade New', serif", fontSize: '16px' }}>
                  {' '}{correction.expected}
                </span>
              </p>
              <button
                onClick={() => { setShowError(false); setCorrection(null); setRecognizedText(''); }}
                className="mt-3 w-full py-2 rounded-xl text-sm font-bold"
                style={{ background: '#D4AF37', color: '#121212' }}
              >حاول مجدداً</button>
            </div>
          )}

          {/* Recognized text */}
          {recognizedText && !showError && (
            <div className="p-3 rounded-xl" style={{ background: '#1E1E1E', border: '1px solid rgba(212,175,55,0.2)' }}>
              <p className="text-xs text-gray-500 mb-1">ما سمعناه:</p>
              <p className="text-white text-sm">{recognizedText}</p>
            </div>
          )}

          {/* Mic button */}
          <div className="flex flex-col items-center gap-2 mt-2">
            <button
              onClick={isListening ? stopListening : startListening}
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all active:scale-90"
              style={{
                background: isListening ? '#ff4444' : '#D4AF37',
                color: isListening ? 'white' : '#121212',
                boxShadow: isListening ? '0 0 30px rgba(255,68,68,0.6)' : '0 0 20px rgba(212,175,55,0.4)'
              }}
            >
              {isListening ? '⏹' : '🎙️'}
            </button>
            <p className="text-center text-gray-500 text-xs">
              {isListening ? 'جاري الاستماع...' : 'اضغط للتلاوة'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TilwaScreen;
