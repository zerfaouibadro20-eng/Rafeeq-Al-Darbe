import React, { useState } from 'react';
import LoadingScreen from './pages/LoadingScreen';
import HomeScreen from './pages/HomeScreen';
import QuranScreen from './pages/QuranScreen';
import TilwaScreen from './pages/TilwaScreen';
import RSVPScreen from './pages/RSVPScreen';
import HadithScreen from './pages/HadithScreen';
import TajweedScreen from './pages/TajweedScreen';
import FiqhScreen from './pages/FiqhScreen';
import PrayerScreen from './pages/PrayerScreen';
import QiblaScreen from './pages/QiblaScreen';
import TasbeehScreen from './pages/TasbeehScreen';

type Page =
  | 'loading' | 'home' | 'quran' | 'tilawa' | 'rsvp'
  | 'hadith' | 'tajweed' | 'fiqh' | 'prayer' | 'qibla' | 'tasbih';

const NAV_ITEMS: { page: Page; icon: string; label: string }[] = [
  { page: 'home',   icon: '🏠',  label: 'الرئيسية' },
  { page: 'quran',  icon: '📖',  label: 'القرآن' },
  { page: 'hadith', icon: '📚',  label: 'الحديث' },
  { page: 'prayer', icon: '🕌',  label: 'الصلاة' },
  { page: 'tasbih', icon: '📿',  label: 'المسبحة' },
];

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('loading');

  const renderPage = () => {
    switch (page) {
      case 'loading':  return <LoadingScreen onComplete={() => setPage('home')} />;
      case 'home':     return <HomeScreen setPage={(p) => setPage(p as Page)} />;
      case 'quran':    return <QuranScreen setPage={(p) => setPage(p as Page)} />;
      case 'tilawa':   return <TilwaScreen setPage={(p) => setPage(p as Page)} />;
      case 'rsvp':     return <RSVPScreen setPage={(p) => setPage(p as Page)} />;
      case 'hadith':   return <HadithScreen setPage={(p) => setPage(p as Page)} />;
      case 'tajweed':  return <TajweedScreen setPage={(p) => setPage(p as Page)} />;
      case 'fiqh':     return <FiqhScreen setPage={(p) => setPage(p as Page)} />;
      case 'prayer':   return <PrayerScreen setPage={(p) => setPage(p as Page)} />;
      case 'qibla':    return <QiblaScreen setPage={(p) => setPage(p as Page)} />;
      case 'tasbih':   return <TasbeehScreen setPage={(p) => setPage(p as Page)} />;
      default:         return <HomeScreen setPage={(p) => setPage(p as Page)} />;
    }
  };

  return (
    <div style={{ background: '#121212', maxWidth: '480px', margin: '0 auto', minHeight: '100vh', position: 'relative' }}>
      {renderPage()}

      {page !== 'loading' && (
        <nav style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '480px',
          background: '#0a0a0a',
          borderTop: '1px solid rgba(212,175,55,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingTop: '6px',
          paddingBottom: '10px',
          zIndex: 9999,
          fontFamily: "'Cairo', sans-serif",
          direction: 'rtl',
        }}>
          {NAV_ITEMS.map((item) => {
            const active = page === item.page;
            return (
              <button
                key={item.page}
                onClick={() => setPage(item.page)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: '2px', padding: '4px 10px', border: 'none', background: 'none',
                  cursor: 'pointer', position: 'relative', minWidth: '52px',
                }}
              >
                {active && (
                  <span style={{
                    position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)',
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'rgba(212,175,55,0.18)', border: '1px solid rgba(212,175,55,0.4)',
                    display: 'block',
                  }} />
                )}
                <span style={{ fontSize: '22px', lineHeight: 1, position: 'relative', zIndex: 1 }}>{item.icon}</span>
                <span style={{ fontSize: '10px', lineHeight: 1, color: active ? '#D4AF37' : '#555', fontWeight: active ? 700 : 400, position: 'relative', zIndex: 1 }}>{item.label}</span>
                {active && (
                  <span style={{ width: '20px', height: '3px', borderRadius: '2px', background: '#D4AF37', marginTop: '2px' }} />
                )}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
};

export default App;
