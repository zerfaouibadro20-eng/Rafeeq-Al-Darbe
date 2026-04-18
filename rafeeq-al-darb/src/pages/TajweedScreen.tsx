import React, { useState } from 'react';
import { TAJWEED_RULES } from '../utils/surahNames';

interface TajweedScreenProps { setPage: (page: string) => void; }

const QURAN_EXAMPLES: { rule: string; verse: string; surah: string; explanation: string }[] = [
  {
    rule: 'الإظهار',
    verse: 'مَنْ آمَنَ بِاللَّهِ وَالْيَوْمِ الْآخِرِ',
    surah: 'البقرة 177',
    explanation: 'النون الساكنة في "مَنْ" قبل الهمزة في "آمَنَ" - يجب إظهارها بوضوح'
  },
  {
    rule: 'الإدغام',
    verse: 'مِن رَّبِّهِمْ',
    surah: 'البقرة 5',
    explanation: 'النون الساكنة في "مِنْ" تُدغم في الراء المشددة في "رَّبِّهِمْ"'
  },
  {
    rule: 'الإقلاب',
    verse: 'مِن بَعْدِ مَا جَاءَكُمُ',
    surah: 'البقرة 92',
    explanation: 'النون الساكنة في "مِنْ" تُقلب ميماً قبل الباء في "بَعْدِ"'
  },
  {
    rule: 'الإخفاء',
    verse: 'مَن كَانَ يُؤْمِنُ',
    surah: 'البقرة 228',
    explanation: 'النون الساكنة في "مَنْ" تُخفى قبل الكاف في "كَانَ"'
  },
  {
    rule: 'المد الطبيعي',
    verse: 'قَالَ إِنِّي عَبْدُ اللَّهِ',
    surah: 'مريم 30',
    explanation: 'الألف بعد القاف في "قَالَ" مد طبيعي بمقدار حركتين'
  },
  {
    rule: 'المد المتصل',
    verse: 'جَاءَ أَمْرُ اللَّهِ',
    surah: 'النحل 1',
    explanation: 'مد واجب متصل - الألف مع الهمزة في كلمة واحدة'
  },
  {
    rule: 'الغنة',
    verse: 'إِنَّ اللَّهَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    surah: 'البقرة 20',
    explanation: 'الغنة في النون المشددة في "إِنَّ" - صوت من الخيشوم'
  },
];

const TajweedScreen: React.FC<TajweedScreenProps> = ({ setPage }) => {
  const [activeRule, setActiveRule] = useState<number | null>(null);

  const speak = (text: string, slow = true) => {
    if (!("speechSynthesis" in window)) return; window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA';
    u.rate = slow ? 0.6 : 0.8;
    window.speechSynthesis.speak(u);
  };

  const ruleExamples = (ruleName: string) =>
    QURAN_EXAMPLES.filter(e => e.rule === ruleName);

  return (
    <div className="min-h-screen pb-24 flex flex-col" style={{ background: '#121212', fontFamily: "'Cairo', sans-serif", direction: 'rtl' }}>
      <div className="px-4 py-4 sticky top-0 z-10 flex items-center gap-3" style={{ background: '#121212', borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
        <button onClick={() => setPage('home')} className="text-2xl" style={{ color: '#D4AF37' }}>←</button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#D4AF37' }}>أحكام التجويد</h1>
          <p className="text-gray-500 text-xs">7 أحكام أساسية</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {TAJWEED_RULES.map((rule, i) => {
          const examples = ruleExamples(rule.name);
          const isActive = activeRule === i;
          return (
            <div
              key={i}
              className="rounded-2xl overflow-hidden transition-all"
              style={{ background: '#1E1E1E', border: `1px solid ${isActive ? '#D4AF37' : 'rgba(212,175,55,0.15)'}` }}
            >
              <button
                onClick={() => setActiveRule(isActive ? null : i)}
                className="w-full p-4 flex items-center gap-3 text-right"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
                  style={{ background: isActive ? '#D4AF37' : 'rgba(212,175,55,0.1)', color: isActive ? '#121212' : '#D4AF37' }}
                >
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-bold" style={{ color: '#D4AF37' }}>{rule.name}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{rule.description}</p>
                </div>
                <span className="text-gray-600">{isActive ? '▲' : '▼'}</span>
              </button>

              {isActive && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}>
                    <p className="text-xs text-gray-500 mb-1">مثال تطبيقي:</p>
                    <p className="text-lg leading-loose" style={{ fontFamily: "'Scheherazade New', serif", color: '#D4AF37' }}>
                      {rule.example}
                    </p>
                    <button
                      onClick={() => speak(rule.example)}
                      className="mt-2 px-3 py-1 rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(212,175,55,0.2)', color: '#D4AF37' }}
                    >🔊 استمع</button>
                  </div>

                  {examples.map((ex, ei) => (
                    <div key={ei} className="p-3 rounded-xl" style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <p className="text-xs text-gray-500 mb-1">{ex.surah}</p>
                      <p className="text-base leading-loose mb-1" style={{ fontFamily: "'Scheherazade New', serif", color: 'white' }}>
                        {ex.verse}
                      </p>
                      <p className="text-xs text-gray-400 leading-relaxed">{ex.explanation}</p>
                      <button
                        onClick={() => speak(ex.verse)}
                        className="mt-2 px-3 py-1 rounded-lg text-xs font-bold"
                        style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}
                      >🔊 استمع للآية</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="p-4 rounded-2xl mt-4" style={{ background: '#1E1E1E', border: '1px solid rgba(212,175,55,0.2)' }}>
          <p className="font-bold mb-2" style={{ color: '#D4AF37' }}>نصيحة للمبتدئين</p>
          <p className="text-gray-400 text-sm leading-relaxed">
            ابدأ بحفظ أحكام النون الساكنة والتنوين (الإظهار، الإدغام، الإقلاب، الإخفاء)، 
            ثم انتقل لأحكام المد، واسمع لقراء مشهورين كالمنشاوي والحصري وعبد الباسط.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TajweedScreen;
