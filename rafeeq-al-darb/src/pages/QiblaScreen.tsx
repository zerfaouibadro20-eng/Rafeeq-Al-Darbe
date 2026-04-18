import React, { useState, useEffect, useRef } from 'react';

interface QiblaScreenProps { setPage: (page: string) => void; }

const getQiblaAngle = (lat: number, lng: number): number => {
  const meccaLat = 21.4225, meccaLng = 39.8262;
  const φ1 = (lat * Math.PI) / 180, φ2 = (meccaLat * Math.PI) / 180;
  const Δλ = ((meccaLng - lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

const QiblaScreen: React.FC<QiblaScreenProps> = ({ setPage }) => {
  const [qiblaAngle, setQiblaAngle] = useState<number | null>(null);
  const [compassHeading, setCompassHeading] = useState(0);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [aligned, setAligned] = useState(false);

  const toMecca = (lat: number, lng: number): number => {
    const R = 6371;
    const dLat = ((21.4225 - lat) * Math.PI) / 180;
    const dLon = ((39.8262 - lng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat * Math.PI) / 180) * Math.cos((21.4225 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocation({ lat, lng });
        setQiblaAngle(getQiblaAngle(lat, lng));
        setDistance(Math.round(toMecca(lat, lng)));
        setLoading(false);
      },
      () => {
        setError('يرجى السماح للتطبيق بالوصول للموقع لتحديد اتجاه القبلة.');
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const heading = e.webkitCompassHeading ?? (e.alpha ? (360 - e.alpha) % 360 : 0);
      setCompassHeading(heading);
    };

    if (window.DeviceOrientationEvent) {
      const requestPerm = (window.DeviceOrientationEvent as any).requestPermission;
      if (typeof requestPerm === 'function') {
        requestPerm().then((result: string) => {
          if (result === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        }).catch(() => {
          window.addEventListener('deviceorientation', handleOrientation);
        });
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
      }
    }

    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  useEffect(() => {
    if (qiblaAngle !== null) {
      const diff = Math.abs(((qiblaAngle - compassHeading + 540) % 360) - 180);
      setAligned(diff < 10);
    }
  }, [qiblaAngle, compassHeading]);

  const needleRotation = qiblaAngle !== null ? qiblaAngle - compassHeading : 0;

  return (
    <div className="min-h-screen pb-24 flex flex-col" style={{ background: '#121212', fontFamily: "'Cairo', sans-serif", direction: 'rtl' }}>
      <div className="px-4 py-4 sticky top-0 z-10 flex items-center gap-3" style={{ background: '#121212', borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
        <button onClick={() => setPage('home')} className="text-2xl" style={{ color: '#D4AF37' }}>←</button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#D4AF37' }}>بوصلة القبلة</h1>
          {distance && <p className="text-gray-500 text-xs">{distance.toLocaleString('ar-SA')} كم من مكة المكرمة</p>}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
        {loading && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }} />
            <p className="text-gray-400">جاري تحديد موقعك...</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl text-center w-full max-w-sm" style={{ background: 'rgba(255,100,0,0.1)', border: '1px solid rgba(255,100,0,0.4)' }}>
            <p className="text-orange-400">{error}</p>
          </div>
        )}

        {qiblaAngle !== null && (
          <>
            <div
              className="relative w-72 h-72 rounded-full flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle, #2a1f00, #1E1E1E)',
                border: `4px solid ${aligned ? '#00ff88' : '#D4AF37'}`,
                boxShadow: aligned ? '0 0 40px rgba(0,255,136,0.4)' : '0 0 20px rgba(212,175,55,0.3)',
                transition: 'border-color 0.3s, box-shadow 0.3s'
              }}
            >
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                <div
                  key={deg}
                  className="absolute text-xs font-bold"
                  style={{
                    color: '#D4AF37',
                    transform: `rotate(${deg}deg) translateY(-120px) rotate(-${deg}deg)`,
                    transformOrigin: 'center',
                  }}
                >
                  {deg === 0 ? 'ش' : deg === 90 ? 'غ' : deg === 180 ? 'ج' : deg === 270 ? 'ق' : '·'}
                </div>
              ))}

              <div
                className="w-2 h-36 rounded-full absolute"
                style={{
                  background: 'linear-gradient(to top, transparent 0%, #D4AF37 50%, #ff4444 100%)',
                  transformOrigin: 'center bottom',
                  transform: `rotate(${needleRotation}deg)`,
                  transition: 'transform 0.3s ease-out',
                  bottom: '50%'
                }}
              />

              <div className="w-4 h-4 rounded-full z-10" style={{ background: '#D4AF37' }} />

              <div className="absolute top-4 flex flex-col items-center">
                <span className="text-xl">🕋</span>
                <span className="text-xs text-gray-500">القبلة</span>
              </div>
            </div>

            {aligned ? (
              <div className="p-4 rounded-2xl text-center" style={{ background: 'rgba(0,255,136,0.1)', border: '2px solid #00ff88' }}>
                <p className="text-2xl mb-1">✅</p>
                <p className="font-bold text-green-400">أنت تواجه القبلة!</p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl text-center" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)' }}>
                <p className="text-gray-400 text-sm">دوّر حتى تصطف السهم مع</p>
                <p className="font-bold" style={{ color: '#D4AF37' }}>🕋 القبلة</p>
                <p className="text-gray-500 text-xs mt-1">الزاوية: {Math.round(qiblaAngle)}°</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
              <div className="p-3 rounded-xl text-center" style={{ background: '#1E1E1E', border: '1px solid rgba(212,175,55,0.2)' }}>
                <p className="text-xs text-gray-500">اتجاه القبلة</p>
                <p className="font-bold text-lg" style={{ color: '#D4AF37' }}>{Math.round(qiblaAngle)}°</p>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: '#1E1E1E', border: '1px solid rgba(212,175,55,0.2)' }}>
                <p className="text-xs text-gray-500">المسافة</p>
                <p className="font-bold text-lg" style={{ color: '#D4AF37' }}>{distance?.toLocaleString()} كم</p>
              </div>
            </div>
          </>
        )}

        {!qiblaAngle && !loading && !error && (
          <p className="text-gray-400 text-center">لم يتم تحديد الموقع بعد</p>
        )}
      </div>
    </div>
  );
};

export default QiblaScreen;
