import React, { useState } from 'react';
import { FIQH_CHAPTERS } from '../utils/surahNames';

interface FiqhScreenProps { setPage: (page: string) => void; }

const FiqhScreen: React.FC<FiqhScreenProps> = ({ setPage }) => {
  const [activeChapter, setActiveChapter] = useState<number | null>(null);

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return; window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA'; u.rate = 0.85;
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="min-h-screen pb-24 flex flex-col" style={{ background: '#121212', fontFamily: "'Cairo', sans-serif", direction: 'rtl' }}>
      <div className="px-4 py-4 sticky top-0 z-10 flex items-center gap-3" style={{ background: '#121212', borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
        <button onClick={() => setPage('home')} className="text-2xl" style={{ color: '#D4AF37' }}>←</button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#D4AF37' }}>الأحكام الشرعية</h1>
          <p className="text-gray-500 text-xs">8 أبواب فقهية مفصلة</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {FIQH_CHAPTERS.map((chapter) => {
          const isActive = activeChapter === chapter.id;
          return (
            <div
              key={chapter.id}
              className="rounded-2xl overflow-hidden"
              style={{ background: '#1E1E1E', border: `1px solid ${isActive ? '#D4AF37' : 'rgba(212,175,55,0.15)'}` }}
            >
              <button
                onClick={() => setActiveChapter(isActive ? null : chapter.id)}
                className="w-full p-4 flex items-center gap-3 text-right"
              >
                <span className="text-2xl">{chapter.icon}</span>
                <div className="flex-1">
                  <p className="font-bold" style={{ color: '#D4AF37' }}>{chapter.name}</p>
                  <p className="text-gray-500 text-xs">{chapter.details.length} أحكام مفصلة</p>
                </div>
                <span className="text-gray-600">{isActive ? '▲' : '▼'}</span>
              </button>

              {isActive && (
                <div className="px-4 pb-4 space-y-3">
                  {chapter.details.map((detail, di) => (
                    <div key={di} className="flex gap-3 p-3 rounded-xl" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.1)' }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5" style={{ background: 'rgba(212,175,55,0.3)', color: '#D4AF37' }}>
                        {di + 1}
                      </div>
                      <p className="text-gray-200 text-sm leading-relaxed flex-1">{detail}</p>
                    </div>
                  ))}

                  <div className="p-3 rounded-xl mt-2" style={{ background: '#161616', border: '1px solid rgba(212,175,55,0.3)' }}>
                    <p className="text-xs text-gray-500 mb-1">الدليل الشرعي:</p>
                    <p className="text-sm leading-relaxed" style={{ color: '#D4AF37', fontFamily: "'Scheherazade New', serif" }}>
                      {chapter.evidence}
                    </p>
                    <button
                      onClick={() => speak(chapter.evidence)}
                      className="mt-2 px-3 py-1 rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(212,175,55,0.2)', color: '#D4AF37' }}
                    >🔊 استمع</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="p-4 rounded-2xl" style={{ background: '#1E1E1E', border: '1px solid rgba(212,175,55,0.2)' }}>
          <p className="text-xs text-gray-500 text-center">
            تنبيه: هذه معلومات عامة. للفتوى في مسائل محددة، يرجى الرجوع للعلماء المتخصصين.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FiqhScreen;
