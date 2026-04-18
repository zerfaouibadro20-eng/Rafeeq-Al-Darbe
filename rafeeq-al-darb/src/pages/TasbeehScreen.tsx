import React, { useState, useEffect, useCallback } from 'react';

interface TasbeehScreenProps { setPage: (page: string) => void; }

const DHIKR_LIST = [
  { id: 'subhan', text: 'سُبْحَانَ اللَّهِ', color: '#4CAF50', goal: 33 },
  { id: 'hamd', text: 'الْحَمْدُ لِلَّهِ', color: '#2196F3', goal: 33 },
  { id: 'akbar', text: 'اللَّهُ أَكْبَرُ', color: '#FF9800', goal: 33 },
  { id: 'lailaha', text: 'لَا إِلَهَ إِلَّا اللَّهُ', color: '#D4AF37', goal: 100 },
  { id: 'istighfar', text: 'أَسْتَغْفِرُ اللَّهَ', color: '#9C27B0', goal: 70 },
];

const BEADS = 33;

const TasbeehScreen: React.FC<TasbeehScreenProps> = ({ setPage }) => {
  const [selectedDhikr, setSelectedDhikr] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [activeBeads, setActiveBeads] = useState<boolean[]>(Array(BEADS).fill(false));
  const [totalToday, setTotalToday] = useState(0);
  const [sessions, setSessions] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('tasbeeh_counts');
    if (saved) {
      try { setCounts(JSON.parse(saved)); } catch { /* ignore */ }
    }
    const todaySaved = localStorage.getItem('tasbeeh_today');
    if (todaySaved) {
      try {
        const { total, date, sess } = JSON.parse(todaySaved);
        if (date === new Date().toDateString()) {
          setTotalToday(total || 0);
          setSessions(sess || 0);
        }
      } catch { /* ignore */ }
    }
  }, []);

  const currentDhikr = DHIKR_LIST[selectedDhikr];
  const currentCount = counts[currentDhikr.id] || 0;
  const beadsFilled = currentCount % BEADS;
  const goal = currentDhikr.goal;

  const increment = useCallback(() => {
    const newCount = currentCount + 1;
    const newCounts = { ...counts, [currentDhikr.id]: newCount };
    setCounts(newCounts);
    localStorage.setItem('tasbeeh_counts', JSON.stringify(newCounts));

    const newBeads = Array(BEADS).fill(false);
    for (let i = 0; i < beadsFilled + 1 && i < BEADS; i++) newBeads[i] = true;
    setActiveBeads(newBeads);

    const newTotal = totalToday + 1;
    setTotalToday(newTotal);

    const newSess = newCount % goal === 0 ? sessions + 1 : sessions;
    setSessions(newSess);

    localStorage.setItem('tasbeeh_today', JSON.stringify({
      total: newTotal,
      date: new Date().toDateString(),
      sess: newSess
    }));

    if (navigator.vibrate) navigator.vibrate(30);

    if (newCount % BEADS === 0) {
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
    if (newCount % goal === 0) {
      setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
      }, 100);
    }
  }, [currentCount, counts, currentDhikr.id, beadsFilled, totalToday, sessions, goal]);

  const resetCurrent = () => {
    const newCounts = { ...counts, [currentDhikr.id]: 0 };
    setCounts(newCounts);
    localStorage.setItem('tasbeeh_counts', JSON.stringify(newCounts));
    setActiveBeads(Array(BEADS).fill(false));
  };

  const resetAll = () => {
    setCounts({});
    localStorage.removeItem('tasbeeh_counts');
    setActiveBeads(Array(BEADS).fill(false));
    setTotalToday(0);
    setSessions(0);
  };

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA'; u.rate = 0.7;
    window.speechSynthesis.speak(u);
  };

  return (
    <div
      className="min-h-screen pb-24 flex flex-col select-none"
      style={{ background: '#121212', fontFamily: "'Cairo', sans-serif", direction: 'rtl' }}
    >
      <div className="px-4 py-4 sticky top-0 z-10 flex items-center gap-3" style={{ background: '#121212', borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
        <button onClick={() => setPage('home')} className="text-2xl" style={{ color: '#D4AF37' }}>←</button>
        <h1 className="text-xl font-bold" style={{ color: '#D4AF37' }}>المسبحة</h1>
        <div className="mr-auto flex items-center gap-2 text-xs text-gray-500">
          <span>اليوم: {totalToday}</span>
        </div>
      </div>

      <div className="px-4 py-3 overflow-x-auto">
        <div className="flex gap-2 pb-1" style={{ minWidth: 'max-content' }}>
          {DHIKR_LIST.map((d, i) => (
            <button
              key={d.id}
              onClick={() => setSelectedDhikr(i)}
              className="px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all"
              style={{
                background: selectedDhikr === i ? d.color : '#1E1E1E',
                color: selectedDhikr === i ? '#fff' : '#888',
                border: `1px solid ${selectedDhikr === i ? d.color : 'rgba(255,255,255,0.1)'}`
              }}
            >
              {d.text.split(' ').slice(0, 2).join(' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center gap-4 px-4 py-4">
        <div className="p-4 rounded-2xl w-full text-center" style={{ background: '#1E1E1E', border: `1px solid ${currentDhikr.color}40` }}>
          <p className="text-2xl leading-relaxed mb-2" style={{ color: currentDhikr.color, fontFamily: "'Scheherazade New', serif" }}>
            {currentDhikr.text}
          </p>
          <div className="flex items-center justify-center gap-4">
            <div className="text-5xl font-bold" style={{ color: currentDhikr.color }}>{currentCount}</div>
            <div className="text-right">
              <p className="text-gray-500 text-xs">الهدف: {goal}</p>
              <p className="text-gray-500 text-xs">الجولات: {Math.floor(currentCount / goal)}</p>
            </div>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2 mt-3">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (currentCount % goal || (currentCount > 0 && currentCount % goal === 0 ? goal : 0)) / goal * 100)}%`, background: currentDhikr.color }}
            />
          </div>
        </div>

        <div className="w-full max-w-xs">
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(11, 1fr)' }}>
            {Array(BEADS).fill(0).map((_, i) => (
              <button
                key={i}
                onClick={increment}
                className="aspect-square rounded-full transition-all duration-150"
                style={{
                  background: i < beadsFilled ? currentDhikr.color : '#2a2a2a',
                  border: `1px solid ${i < beadsFilled ? currentDhikr.color : '#444'}`,
                  boxShadow: i < beadsFilled ? `0 0 6px ${currentDhikr.color}60` : 'none',
                  minWidth: '24px',
                  minHeight: '24px'
                }}
              />
            ))}
          </div>
          <p className="text-center text-xs text-gray-600 mt-2">{beadsFilled} / {BEADS}</p>
        </div>

        <button
          onClick={increment}
          className="w-48 h-48 rounded-full flex flex-col items-center justify-center text-center transition-all active:scale-95"
          style={{
            background: `radial-gradient(circle, ${currentDhikr.color}20, ${currentDhikr.color}05)`,
            border: `4px solid ${currentDhikr.color}`,
            boxShadow: `0 0 30px ${currentDhikr.color}30`
          }}
        >
          <span className="text-5xl font-bold" style={{ color: currentDhikr.color }}>{currentCount}</span>
          <span className="text-xs text-gray-400 mt-1">اضغط للتسبيح</span>
        </button>

        <div className="flex gap-3 w-full">
          <button
            onClick={resetCurrent}
            className="flex-1 py-3 rounded-xl text-sm font-bold"
            style={{ background: '#1E1E1E', color: '#888', border: '1px solid #333' }}
          >إعادة</button>
          <button
            onClick={() => speak(currentDhikr.text)}
            className="flex-1 py-3 rounded-xl text-sm font-bold"
            style={{ background: '#1E1E1E', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}
          >🔊 استمع</button>
          <button
            onClick={resetAll}
            className="flex-1 py-3 rounded-xl text-sm font-bold"
            style={{ background: '#1E1E1E', color: '#ff4444', border: '1px solid rgba(255,68,68,0.3)' }}
          >مسح الكل</button>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full">
          {DHIKR_LIST.map((d) => (
            <div key={d.id} className="p-3 rounded-xl text-center" style={{ background: '#1E1E1E', border: `1px solid ${d.color}30` }}>
              <p className="text-xs text-gray-500 truncate">{d.text.split(' ').slice(0, 2).join(' ')}</p>
              <p className="font-bold mt-1" style={{ color: d.color }}>{counts[d.id] || 0}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TasbeehScreen;
