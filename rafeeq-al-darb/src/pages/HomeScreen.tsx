import React from 'react';

interface HomeScreenProps {
  setPage: (page: string) => void;
}

const features = [
  { page: 'quran', icon: '📖', label: 'القرآن الكريم', desc: 'حفص وورش - 114 سورة' },
  { page: 'tilawa', icon: '🎙️', label: 'صفحة التلاوة', desc: 'تلاوة وتصحيح تجويدي' },
  { page: 'rsvp', icon: '⚡', label: 'ختم RSVP', desc: 'ختم سريع بتتبع العين' },
  { page: 'hadith', icon: '📚', label: 'الأحاديث', desc: '20 كتاباً من السنة النبوية' },
  { page: 'tajweed', icon: '✨', label: 'التجويد', desc: '7 أحكام تجويدية' },
  { page: 'fiqh', icon: '⚖️', label: 'الأحكام الشرعية', desc: '8 أبواب فقهية مفصلة' },
  { page: 'prayer', icon: '🕌', label: 'مواقيت الصلاة', desc: 'أوقات الصلاة مع الأذان' },
  { page: 'qibla', icon: '🧭', label: 'بوصلة القبلة', desc: 'اتجاه القبلة الدقيق' },
  { page: 'tasbih', icon: '📿', label: 'المسبحة', desc: '33 خرزة - تسبيح رقمي' },
];

const HomeScreen: React.FC<HomeScreenProps> = ({ setPage }) => {
  return (
    <div
      className="min-h-screen pb-24"
      style={{
        background: '#121212',
        fontFamily: "'Cairo', sans-serif",
        direction: 'rtl'
      }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1a1200 0%, #2a1f00 50%, #1a1200 100%)',
          borderBottom: '1px solid rgba(212,175,55,0.3)'
        }}
      >
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full" style={{ background: '#D4AF37', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full" style={{ background: '#D4AF37', transform: 'translate(-30%, 30%)' }} />
        </div>
        <div className="relative flex flex-col items-center py-10 px-4">
          <img src="/icons/icon.png" alt="رفيق الدرب" className="w-20 h-20 rounded-2xl mb-4 shadow-lg" style={{ boxShadow: '0 0 20px rgba(212,175,55,0.5)' }} />
          <h1 className="text-3xl font-bold" style={{ color: '#D4AF37', fontFamily: "'Amiri', serif" }}>رفيق الدرب</h1>
          <p className="text-gray-400 text-sm mt-1">تطبيقك الإسلامي الشامل</p>
        </div>
      </div>

      <div className="px-4 py-6">
        <div className="grid grid-cols-2 gap-3">
          {features.map((f) => (
            <button
              key={f.page}
              onClick={() => setPage(f.page)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center transition-all duration-200 active:scale-95"
              style={{
                background: '#1E1E1E',
                border: '1px solid rgba(212,175,55,0.2)',
              }}
            >
              <span className="text-3xl">{f.icon}</span>
              <span className="font-bold text-sm" style={{ color: '#D4AF37' }}>{f.label}</span>
              <span className="text-gray-500 text-xs leading-tight">{f.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mx-4 mt-4 p-4 rounded-2xl" style={{ background: '#1E1E1E', border: '1px solid rgba(212,175,55,0.2)' }}>
        <p className="text-center text-xs" style={{ color: '#D4AF37', fontFamily: "'Amiri', serif" }}>
          ﴿ إِنَّ هَذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ ﴾
        </p>
        <p className="text-center text-gray-500 text-xs mt-1">[الإسراء: 9]</p>
      </div>

      <div className="mt-6 pb-4 text-center">
        <p className="text-xs" style={{ color: '#D4AF37' }}>المطور البسيط - بدر الدين زرفاوي</p>
        <p className="text-gray-600 text-xs">Badr Eddine Zerfaoui</p>
      </div>
    </div>
  );
};

export default HomeScreen;
