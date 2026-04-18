import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ARABIC_SURAH_NAMES } from '../utils/surahNames';

interface Verse { id: number; text: string; }
interface Surah { id: number; name: string; verses: Verse[]; }
interface RSVPScreenProps { setPage: (page: string) => void; }

type Recitation = 'hafs' | 'warsh';

const RSVPScreen: React.FC<RSVPScreenProps> = ({ setPage }) => {
  const [recitation, setRecitation] = useState<Recitation>('hafs');
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [wpm, setWpm] = useState(250);
  const [isLooking, setIsLooking] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [pausedByUser, setPausedByUser] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [search, setSearch] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const detectorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
    setWords([]);
    setCurrentWordIndex(0);
    setIsActive(false);
  }, [recitation]);

  useEffect(() => {
    return () => stopAll();
  }, []);

  const stopAll = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (detectorIntervalRef.current) clearInterval(detectorIntervalRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraEnabled(true);
      detectorIntervalRef.current = setInterval(async () => {
        try {
          if (!videoRef.current) return;
          const FD = (window as any).FaceDetector;
          if (!FD) { setIsLooking(true); return; }
          const faces = await new FD().detect(videoRef.current);
          setIsLooking(faces.length > 0 && faces[0].boundingBox.width > 80);
        } catch { setIsLooking(true); }
      }, 600);
    } catch {
      setCameraError('تعذر الوصول للكاميرا. سيعمل بدون تتبع العين.');
      setIsLooking(true);
    }
  };

  const selectSurah = (surah: Surah) => {
    const allWords = surah.verses.flatMap(v => v.text.split(/\s+/)).filter(Boolean);
    setSelectedSurah(surah);
    setWords(allWords);
    setCurrentWordIndex(0);
    setIsActive(false);
    setPausedByUser(false);
  };

  const startRSVP = useCallback(() => {
    setIsActive(true);
    setPausedByUser(false);
    intervalRef.current = setInterval(() => {
      setCurrentWordIndex(idx => {
        if (idx >= words.length - 1) { setIsActive(false); return idx; }
        return idx + 1;
      });
    }, Math.round(60000 / wpm));
  }, [words.length, wpm]);

  const pauseRSVP = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsActive(false);
  };

  useEffect(() => {
    if (isActive && !isLooking && !pausedByUser) pauseRSVP();
  }, [isLooking]);

  const hafsAvailable  = !!localStorage.getItem('quran_hafs');
  const warshAvailable = !!localStorage.getItem('quran_warsh');
  const progress = words.length ? (currentWordIndex / words.length) * 100 : 0;
  const filtered = surahs.filter(s => s.name.includes(search) || String(s.id).includes(search));

  return (
    <div
      className="min-h-screen pb-24 flex flex-col"
      style={{ background: '#121212', fontFamily: "'Cairo', sans-serif", direction: 'rtl' }}
    >
      {/* Header */}
      <div
        className="px-4 py-4 sticky top-0 z-10 space-y-3"
        style={{ background: '#121212', borderBottom: '1px solid rgba(212,175,55,0.2)' }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => { stopAll(); setPage('home'); }} className="text-2xl" style={{ color: '#D4AF37' }}>←</button>
          <h1 className="text-xl font-bold" style={{ color: '#D4AF37' }}>ختم RSVP</h1>
          {cameraEnabled && (
            <div className={`mr-auto w-3 h-3 rounded-full ${isLooking ? 'bg-green-500' : 'bg-red-500'}`} />
          )}
        </div>

        {/* Recitation selector - only when selecting surah */}
        {!selectedSurah && (
          <div className="flex gap-2">
            {([
              { key: 'hafs' as Recitation, label: 'رواية حفص', available: hafsAvailable },
              { key: 'warsh' as Recitation, label: 'رواية ورش', available: warshAvailable },
            ]).map(r => (
              <button
                key={r.key}
                onClick={() => r.available && setRecitation(r.key)}
                className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: recitation === r.key ? '#D4AF37' : '#1E1E1E',
                  color: recitation === r.key ? '#121212' : r.available ? '#888' : '#444',
                  border: `1px solid ${recitation === r.key ? '#D4AF37' : 'rgba(212,175,55,0.2)'}`,
                  opacity: r.available ? 1 : 0.5,
                  cursor: r.available ? 'pointer' : 'not-allowed'
                }}
              >
                {r.label}
                {!r.available && ' ⚠️'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Surah selection */}
      {!selectedSurah ? (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Camera card */}
          <div className="p-4 rounded-2xl mb-4" style={{ background: '#1E1E1E', border: '1px solid rgba(212,175,55,0.2)' }}>
            <p className="text-sm font-bold mb-1" style={{ color: '#D4AF37' }}>تتبع العين بالكاميرا 👁️</p>
            <p className="text-xs text-gray-500 mb-3">يتوقف التدفق تلقائياً عند إبعاد النظر عن الشاشة</p>
            {!cameraEnabled ? (
              <button onClick={startCamera} className="w-full py-2 rounded-xl text-sm font-bold"
                style={{ background: '#D4AF37', color: '#121212' }}>
                تفعيل الكاميرا
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isLooking ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className="text-xs text-gray-400">{isLooking ? 'الكاميرا تراك ✅' : 'لا يرى وجهك ⚠️'}</span>
              </div>
            )}
            {cameraError && <p className="text-yellow-500 text-xs mt-2">{cameraError}</p>}
          </div>

          <video ref={videoRef} autoPlay muted playsInline className="hidden" />

          {surahs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <p className="text-4xl">📖</p>
              <p className="text-gray-400 text-center">
                رواية {recitation === 'hafs' ? 'حفص' : 'ورش'} غير محمّلة.<br />
                أعد تشغيل التطبيق مع الإنترنت.
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
                    onClick={() => selectSurah(s)}
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
        /* Reading view */
        <div className="flex-1 flex flex-col px-4 py-4 gap-4">
          <video ref={videoRef} autoPlay muted playsInline className="hidden" />

          <div className="flex items-center justify-between">
            <button
              onClick={() => { stopAll(); setSelectedSurah(null); setIsActive(false); }}
              className="text-sm" style={{ color: '#D4AF37' }}
            >← {selectedSurah.name}</button>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
                {recitation === 'hafs' ? 'حفص' : 'ورش'}
              </span>
              <p className="text-xs text-gray-500">{currentWordIndex + 1} / {words.length}</p>
            </div>
          </div>

          {/* Word display */}
          <div
            className="flex flex-col items-center justify-center h-52 rounded-2xl relative"
            style={{ background: '#1E1E1E', border: '2px solid rgba(212,175,55,0.3)' }}
          >
            {!isLooking && cameraEnabled && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl z-10"
                style={{ background: 'rgba(0,0,0,0.88)', border: '2px solid #ff4444' }}>
                <div className="text-center">
                  <p className="text-4xl mb-2">👁️</p>
                  <p className="text-white font-bold">توقف - انظر إلى الشاشة</p>
                </div>
              </div>
            )}
            <p
              className="text-center px-6"
              style={{ fontSize: '38px', fontFamily: "'Scheherazade New', serif", color: '#D4AF37', lineHeight: 1.6 }}
            >
              {words[currentWordIndex] || ''}
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div className="h-full rounded-full transition-all duration-200"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #D4AF37, #f0d060)' }} />
          </div>

          {/* WPM slider */}
          <div className="flex flex-col gap-2 p-4 rounded-2xl"
            style={{ background: '#1E1E1E', border: '1px solid rgba(212,175,55,0.2)' }}>
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-400">السرعة: <span style={{ color: '#D4AF37' }}>{wpm}</span> كلمة/دقيقة</label>
              <span className="text-xs text-gray-600">
                {wpm < 200 ? 'بطيء' : wpm < 400 ? 'متوسط' : wpm < 600 ? 'سريع' : 'متقدم'}
              </span>
            </div>
            <input
              type="range" min={100} max={800} step={25} value={wpm}
              onChange={e => { setWpm(Number(e.target.value)); if (isActive) { pauseRSVP(); } }}
              className="w-full"
              style={{ accentColor: '#D4AF37' }}
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>100</span><span>250</span><span>500</span><span>800</span>
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => { setCurrentWordIndex(0); setIsActive(false); }}
              className="flex-1 py-3 rounded-xl text-sm font-bold"
              style={{ background: '#1E1E1E', color: '#888', border: '1px solid #333' }}
            >↩ إعادة</button>
            <button
              onClick={() => {
                if (isActive) { pauseRSVP(); setPausedByUser(true); }
                else { startRSVP(); }
              }}
              className="flex-1 py-3 rounded-xl text-sm font-bold"
              style={{ background: '#D4AF37', color: '#121212' }}
            >
              {isActive ? '⏸ إيقاف' : currentWordIndex === 0 ? '▶ ابدأ' : '▶ استئناف'}
            </button>
          </div>

          {/* Completion message */}
          {currentWordIndex >= words.length - 1 && !isActive && words.length > 0 && (
            <div className="p-4 rounded-2xl text-center"
              style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid #D4AF37' }}>
              <p className="text-2xl mb-2">🎉</p>
              <p className="font-bold" style={{ color: '#D4AF37' }}>ما شاء الله! أنهيت السورة</p>
              <button
                onClick={() => { setCurrentWordIndex(0); setIsActive(false); }}
                className="mt-2 px-4 py-1 rounded-xl text-sm font-bold"
                style={{ background: '#D4AF37', color: '#121212' }}
              >قراءة مرة أخرى</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RSVPScreen;
