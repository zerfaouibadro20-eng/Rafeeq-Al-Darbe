import React, { useState, useEffect, useRef, useCallback } from 'react';

interface PrayerScreenProps { setPage: (page: string) => void; }
interface PrayerTime { name: string; nameAr: string; time: string; icon: string; }

const PRAYER_NAMES = [
  { key: 'Fajr',    nameAr: 'الفجر',   icon: '🌅' },
  { key: 'Dhuhr',   nameAr: 'الظهر',   icon: '☀️' },
  { key: 'Asr',     nameAr: 'العصر',   icon: '🌤️' },
  { key: 'Maghrib', nameAr: 'المغرب',  icon: '🌇' },
  { key: 'Isha',    nameAr: 'العشاء',  icon: '🌙' },
];

const ADHAN_PHRASES = [
  { text: 'اللهُ أكبر اللهُ أكبر', repeat: 2 },
  { text: 'أشهدُ أن لا إله إلا الله', repeat: 2 },
  { text: 'أشهدُ أن محمداً رسولُ الله', repeat: 2 },
  { text: 'حيَّ على الصلاة', repeat: 2 },
  { text: 'حيَّ على الفلاح', repeat: 2 },
  { text: 'اللهُ أكبر اللهُ أكبر', repeat: 1 },
  { text: 'لا إله إلا الله', repeat: 1 },
];

const VOICE_PROFILES = [
  { id: 'v1', name: 'صوت المؤذن الأول', icon: '🎙️', rate: 0.55, pitch: 0.75, pauseMs: 900 },
  { id: 'v2', name: 'صوت المؤذن الثاني', icon: '🎤', rate: 0.7, pitch: 1.15, pauseMs: 700 },
];

const CALC_METHODS = [
  { id: 4,  name: 'أم القرى - مكة المكرمة' },
  { id: 2,  name: 'ISNA - أمريكا الشمالية' },
  { id: 3,  name: 'رابطة العالم الإسلامي' },
  { id: 5,  name: 'الهيئة المصرية للمساحة' },
  { id: 1,  name: 'جامعة العلوم الإسلامية، كراتشي' },
];

const hasSpeech = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

const playNotificationTone = () => {
  try {
    const ctx = new (window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.start(); osc.stop(ctx.currentTime + 1.2);
  } catch { /* not supported */ }
};

const loadToggles = (): Record<string, boolean> => {
  try { return JSON.parse(localStorage.getItem('prayer_toggles') || '{}'); } catch { return {}; }
};

const PrayerScreen: React.FC<PrayerScreenProps> = ({ setPage }) => {
  const [prayers, setPrayers]     = useState<PrayerTime[]>([]);
  const [location, setLocation]   = useState<{ lat: number; lng: number; city: string } | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [nextPrayer, setNextPrayer]   = useState<PrayerTime | null>(null);
  const [countdown, setCountdown] = useState('');
  const [playing, setPlaying]     = useState(false);
  const [toggles, setToggles]     = useState<Record<string, boolean>>(loadToggles);
  const [method, setMethod]       = useState<number>(+( localStorage.getItem('calc_method') || '4'));
  const [voice, setVoice]         = useState<string>(localStorage.getItem('adhan_voice') || 'v1');
  const [showSettings, setShowSettings] = useState(false);
  const [tab, setTab]             = useState<'times' | 'settings'>('times');
  const lastFiredRef = useRef<string>('');
  const phraseQueueRef = useRef<{ text: string; remaining: number }[]>([]);
  const playingRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!prayers.length) return;
    const now = currentTime;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const nowSec = now.getSeconds();
    let foundNext = false;
    for (const p of prayers) {
      const [h, m] = p.time.split(':').map(Number);
      const pMin = h * 60 + m;
      if (pMin > nowMin && !foundNext) {
        foundNext = true;
        setNextPrayer(p);
        const diff = pMin - nowMin;
        const hrs = Math.floor(diff / 60);
        const mins = diff % 60;
        setCountdown(`${hrs > 0 ? hrs + ' ساعة و' : ''}${mins} دقيقة`);
      }
      if (pMin === nowMin && nowSec < 5) {
        const key = `${p.name}-${now.toDateString()}-${now.getHours()}-${now.getMinutes()}`;
        if (lastFiredRef.current !== key && toggles[p.name] !== false) {
          lastFiredRef.current = key;
          playAdhan();
        }
      }
    }
    if (!foundNext) { setNextPrayer(prayers[0]); setCountdown('غداً إن شاء الله'); }
  }, [currentTime, prayers]);

  const getLocation = useCallback(() => {
    setLoading(true); setError('');
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=${method}`);
          const json = await res.json();
          if (json.status === 'OK') {
            const t = json.data.timings;
            const list: PrayerTime[] = PRAYER_NAMES.map(p => ({ name: p.key, nameAr: p.nameAr, icon: p.icon, time: t[p.key] || '00:00' }));
            setPrayers(list);
            const tz = json.data.meta?.timezone || '';
            const city = tz.split('/').pop()?.replace(/_/g, ' ') || 'موقعك';
            setLocation({ lat, lng, city });
            localStorage.setItem('prayer_times', JSON.stringify({ list, lat, lng, city, date: new Date().toDateString(), method }));
          }
        } catch { setError('تعذر الاتصال بخادم مواقيت الصلاة.'); }
        setLoading(false);
      },
      () => {
        setError('يرجى السماح بالوصول للموقع الجغرافي.');
        setLoading(false);
        const cached = localStorage.getItem('prayer_times');
        if (cached) {
          try {
            const d = JSON.parse(cached);
            setPrayers(d.list); setLocation({ lat: d.lat, lng: d.lng, city: d.city });
          } catch { /* ignore */ }
        }
      }
    );
  }, [method]);

  useEffect(() => {
    const cached = localStorage.getItem('prayer_times');
    if (cached) {
      try {
        const d = JSON.parse(cached);
        if (d.date === new Date().toDateString()) { setPrayers(d.list); setLocation({ lat: d.lat, lng: d.lng, city: d.city }); return; }
      } catch { /* ignore */ }
    }
    getLocation();
  }, []);

  const stopAdhan = () => {
    if (hasSpeech()) window.speechSynthesis.cancel();
    phraseQueueRef.current = [];
    playingRef.current = false;
    setPlaying(false);
  };

  const speakNext = (vProfile: typeof VOICE_PROFILES[0]) => {
    const queue = phraseQueueRef.current;
    if (!queue.length || !playingRef.current) { stopAdhan(); return; }
    const item = queue[0];
    if (!hasSpeech()) { stopAdhan(); return; }
    const u = new SpeechSynthesisUtterance(item.text);
    u.lang = 'ar-SA';
    u.rate = vProfile.rate;
    u.pitch = vProfile.pitch;
    u.volume = 1;
    u.onend = () => {
      if (!playingRef.current) return;
      item.remaining--;
      if (item.remaining <= 0) {
        phraseQueueRef.current = queue.slice(1);
      }
      setTimeout(() => speakNext(vProfile), vProfile.pauseMs);
    };
    window.speechSynthesis.speak(u);
  };

  const playAdhan = () => {
    stopAdhan();
    const vProfile = VOICE_PROFILES.find(v2 => v2.id === voice) || VOICE_PROFILES[0];
    phraseQueueRef.current = ADHAN_PHRASES.map(p => ({ text: p.text, remaining: p.repeat }));
    playingRef.current = true;
    setPlaying(true);
    playNotificationTone();
    setTimeout(() => {
      if (hasSpeech()) speakNext(vProfile);
      else { setPlaying(false); playingRef.current = false; }
    }, 1300);
  };

  const togglePrayer = (key: string) => {
    const updated = { ...toggles, [key]: toggles[key] === false ? true : false };
    setToggles(updated);
    localStorage.setItem('prayer_toggles', JSON.stringify(updated));
  };

  const setVoiceAndSave = (v: string) => {
    setVoice(v); localStorage.setItem('adhan_voice', v);
  };

  const setMethodAndSave = (m: number) => {
    setMethod(m); localStorage.setItem('calc_method', String(m));
    localStorage.removeItem('prayer_times');
    getLocation();
  };

  const fmt = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'م' : 'ص'}`;
  };

  const timeNowStr = currentTime.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="min-h-screen pb-24 flex flex-col" style={{ background: '#121212', fontFamily: "'Cairo', sans-serif", direction: 'rtl' }}>
      <div className="px-4 py-4 sticky top-0 z-10" style={{ background: '#121212', borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => setPage('home')} className="text-2xl" style={{ color: '#D4AF37' }}>←</button>
          <div className="flex-1">
            <h1 className="text-xl font-bold" style={{ color: '#D4AF37' }}>مواقيت الصلاة</h1>
            {location && <p className="text-xs text-gray-500">📍 {location.city}</p>}
          </div>
          <div className="text-sm font-bold" style={{ color: '#D4AF37', fontFamily: 'monospace' }}>{timeNowStr}</div>
        </div>
        <div className="flex gap-2">
          {[{id:'times',label:'المواقيت'},{id:'settings',label:'الإعدادات'}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id as 'times'|'settings')}
              className="flex-1 py-1.5 rounded-xl text-xs font-bold"
              style={{background: tab===t.id?'#D4AF37':'#1E1E1E', color: tab===t.id?'#121212':'#666', border:'1px solid rgba(212,175,55,0.2)'}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'times' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

          {nextPrayer && (
            <div className="p-5 rounded-2xl text-center relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg,#1a1200,#2a1f00)', border: '2px solid rgba(212,175,55,0.6)', boxShadow: '0 0 30px rgba(212,175,55,0.1)' }}>
              <p className="text-gray-400 text-sm mb-1">الصلاة القادمة</p>
              <p className="text-4xl font-bold" style={{ color: '#D4AF37' }}>{nextPrayer.icon} {nextPrayer.nameAr}</p>
              <p className="text-3xl text-white font-bold mt-1">{fmt(nextPrayer.time)}</p>
              <p className="text-gray-400 text-sm mt-2">بعد {countdown}</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }} />
              <p className="text-gray-400 text-sm">جاري تحديد الموقع وجلب المواقيت...</p>
            </div>
          )}

          {error && !prayers.length && (
            <div className="p-4 rounded-2xl space-y-3" style={{ background: 'rgba(255,100,0,0.1)', border: '1px solid rgba(255,100,0,0.4)' }}>
              <p className="text-orange-400 text-sm">{error}</p>
              <button onClick={getLocation} className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: '#D4AF37', color: '#121212' }}>
                إعادة المحاولة
              </button>
            </div>
          )}

          {prayers.length > 0 && (
            <div className="space-y-2">
              {prayers.map(p => {
                const enabled = toggles[p.name] !== false;
                const isNext = nextPrayer?.name === p.name;
                return (
                  <div key={p.name} className="flex items-center gap-3 p-4 rounded-2xl"
                    style={{ background: isNext ? 'rgba(212,175,55,0.12)' : '#1E1E1E', border: `1px solid ${isNext ? 'rgba(212,175,55,0.5)' : 'rgba(212,175,55,0.1)'}` }}>
                    <span className="text-2xl">{p.icon}</span>
                    <div className="flex-1">
                      <p className="font-bold" style={{ color: isNext ? '#D4AF37' : 'white' }}>{p.nameAr}</p>
                      <p className="text-xs mt-0.5" style={{ color: enabled ? '#4CAF50' : '#555' }}>
                        {enabled ? '🔔 مفعّل' : '🔕 معطّل'}
                      </p>
                    </div>
                    <p className="text-lg font-bold" style={{ color: '#D4AF37' }}>{fmt(p.time)}</p>
                    <button onClick={() => togglePrayer(p.name)}
                      className="relative flex-shrink-0" style={{ width: '44px', height: '24px' }}>
                      <span className="block w-full h-full rounded-full transition-all" style={{ background: enabled ? '#D4AF37' : '#333' }} />
                      <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                        style={{ left: enabled ? '22px' : '2px' }} />
                    </button>
                    <button onClick={playAdhan}
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(212,175,55,0.2)', color: '#D4AF37', fontSize: '12px' }}>▶</button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="p-4 rounded-2xl space-y-3" style={{ background: '#1E1E1E', border: '1px solid rgba(212,175,55,0.2)' }}>
            <div className="flex items-center justify-between">
              <p className="font-bold" style={{ color: '#D4AF37' }}>🔊 الأذان</p>
              {!hasSpeech() && <p className="text-xs text-orange-400">TTS غير متاح في هذا المتصفح</p>}
            </div>

            {playing && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
                <div className="flex gap-0.5 items-end">
                  {[4,7,5,8,6].map((h,i) => (
                    <div key={i} className="w-1.5 rounded-full animate-bounce"
                      style={{ height: `${h * 4}px`, background: '#D4AF37', animationDelay: `${i * 0.12}s`, animationDuration: '0.8s' }}/>
                  ))}
                </div>
                <p className="text-sm text-white flex-1">جاري تلاوة الأذان...</p>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={playAdhan} disabled={playing}
                className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                style={{ background: playing ? '#222' : '#D4AF37', color: playing ? '#555' : '#121212' }}>
                ▶ {playing ? 'يُشغَّل...' : 'تشغيل الأذان'}
              </button>
              <button onClick={stopAdhan}
                className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{ background: '#1E1E1E', color: '#888', border: '1px solid #2a2a2a' }}>
                ⏹ إيقاف
              </button>
            </div>

            <p className="text-xs text-gray-600 text-center">يُشغَّل تلقائياً عند دخول وقت الصلاة إذا كان التطبيق مفتوحاً</p>
          </div>

          {!location && !loading && (
            <button onClick={getLocation} className="w-full py-3 rounded-2xl font-bold text-sm"
              style={{ background: '#D4AF37', color: '#121212' }}>📍 تحديد موقعي الآن</button>
          )}

          {location && (
            <button onClick={getLocation} className="w-full py-2 rounded-2xl text-xs font-bold"
              style={{ background: 'rgba(212,175,55,0.08)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.15)' }}>
              🔄 تحديث المواقيت
            </button>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(212,175,55,0.2)' }}>
            <div className="px-4 py-3" style={{ background: 'rgba(212,175,55,0.1)' }}>
              <p className="font-bold text-sm" style={{ color: '#D4AF37' }}>🎙️ صوت الأذان</p>
            </div>
            {VOICE_PROFILES.map(v2 => (
              <button key={v2.id} onClick={() => setVoiceAndSave(v2.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-right transition-all"
                style={{ background: voice === v2.id ? 'rgba(212,175,55,0.08)' : '#1E1E1E', borderTop: '1px solid rgba(212,175,55,0.08)' }}>
                <span className="text-2xl">{v2.icon}</span>
                <div className="flex-1">
                  <p className="font-bold text-sm" style={{ color: voice === v2.id ? '#D4AF37' : 'white' }}>{v2.name}</p>
                  <p className="text-xs text-gray-500">سرعة: {v2.rate} · طبقة: {v2.pitch}</p>
                </div>
                {voice === v2.id && <span style={{ color: '#D4AF37' }}>✓</span>}
              </button>
            ))}
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(212,175,55,0.2)' }}>
            <div className="px-4 py-3" style={{ background: 'rgba(212,175,55,0.1)' }}>
              <p className="font-bold text-sm" style={{ color: '#D4AF37' }}>🕌 طريقة حساب المواقيت</p>
            </div>
            {CALC_METHODS.map(m => (
              <button key={m.id} onClick={() => setMethodAndSave(m.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-right transition-all"
                style={{ background: method === m.id ? 'rgba(212,175,55,0.08)' : '#1E1E1E', borderTop: '1px solid rgba(212,175,55,0.08)' }}>
                <div className="flex-1">
                  <p className="text-sm" style={{ color: method === m.id ? '#D4AF37' : '#aaa' }}>{m.name}</p>
                </div>
                {method === m.id && <span style={{ color: '#D4AF37' }}>✓</span>}
              </button>
            ))}
          </div>

          <div className="rounded-2xl p-4 space-y-3" style={{ background: '#1E1E1E', border: '1px solid rgba(212,175,55,0.15)' }}>
            <p className="font-bold text-sm" style={{ color: '#D4AF37' }}>🔔 تنبيهات الصلاة</p>
            {PRAYER_NAMES.map(p => {
              const enabled = toggles[p.key] !== false;
              return (
                <div key={p.key} className="flex items-center justify-between">
                  <span className="text-sm text-white">{p.icon} {p.nameAr}</span>
                  <button onClick={() => togglePrayer(p.key)}
                    className="relative" style={{ width: '44px', height: '24px' }}>
                    <span className="block w-full h-full rounded-full" style={{ background: enabled ? '#D4AF37' : '#333' }} />
                    <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                      style={{ left: enabled ? '22px' : '2px' }} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PrayerScreen;
