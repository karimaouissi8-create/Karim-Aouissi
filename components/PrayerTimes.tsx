import React, { useState, useEffect, useRef } from 'react';
import { PrayerTimesData } from '../types';
import Spinner from './Spinner';

const MUEZZINS = [
    { name: 'عبد الباسط عبد الصمد', url: 'https://www.islamcan.com/audio/adhan/azan1.mp3' },
    { name: 'علي بن أحمد ملا', url: 'https://www.islamcan.com/audio/adhan/azan2.mp3' },
    { name: 'محمد علي البنا', url: 'https://www.islamcan.com/audio/adhan/azan16.mp3' },
];

const PrayerTimes: React.FC = () => {
    const [prayerTimes, setPrayerTimes] = useState<PrayerTimesData | null>(null);
    const [nextPrayer, setNextPrayer] = useState<{ name: string; time: Date } | null>(null);
    const [countdown, setCountdown] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [muezzin, setMuezzin] = useState(MUEZZINS[0].url);
    const adhanAudio = useRef<HTMLAudioElement | null>(null);

    const prayerNames: { [key: string]: string } = {
        Fajr: 'الفجر',
        Sunrise: 'الشروق',
        Dhuhr: 'الظهر',
        Asr: 'العصر',
        Sunset: 'الغروب',
        Maghrib: 'المغرب',
        Isha: 'العشاء',
    };
    
    useEffect(() => {
        adhanAudio.current = new Audio(muezzin);
    }, [muezzin]);

    useEffect(() => {
        const fetchPrayerTimes = (latitude: number, longitude: number) => {
            const date = new Date();
            const method = 2; // ISNA
            setIsLoading(true);
            fetch(`https://api.aladhan.com/v1/timings/${date.getTime()/1000}?latitude=${latitude}&longitude=${longitude}&method=${method}`)
                .then(res => res.json())
                .then(data => {
                    if (data.code === 200) {
                        setPrayerTimes(data.data.timings);
                        setError(null);
                    } else {
                        setError('لم يتم العثور على مواقيت الصلاة لهذه المنطقة.');
                    }
                })
                .catch(() => setError('فشل في تحميل مواقيت الصلاة. تحقق من اتصالك بالإنترنت.'))
                .finally(() => setIsLoading(false));
        };

        navigator.geolocation.getCurrentPosition(
            position => {
                fetchPrayerTimes(position.coords.latitude, position.coords.longitude);
            },
            () => {
                setError('يرجى تمكين الوصول إلى الموقع لعرض مواقيت الصلاة. سيتم استخدام موقع افتراضي.');
                // Fallback to a default location (Gaza)
                fetchPrayerTimes(31.5204, 34.4533);
            }
        );
    }, []);

    useEffect(() => {
      const calculateNextPrayer = () => {
          if (!prayerTimes) return;

          const now = new Date();
          const prayers = Object.entries(prayerTimes)
              .map(([name, time]) => ({ name, time: new Date(`${now.toDateString()} ${time}`) }))
              .filter(p => prayerNames[p.name] && !['Sunrise', 'Sunset'].includes(p.name))
              .sort((a, b) => a.time.getTime() - b.time.getTime());

          let next = prayers.find(p => p.time > now);

          if (!next) {
              const tomorrow = new Date(now);
              tomorrow.setDate(tomorrow.getDate() + 1);
              next = { name: 'Fajr', time: new Date(`${tomorrow.toDateString()} ${prayerTimes.Fajr}`) };
          }
          
          setNextPrayer(next);
      };

      calculateNextPrayer();
      const interval = setInterval(calculateNextPrayer, 60000); // Recalculate every minute
      return () => clearInterval(interval);

    }, [prayerTimes]);

    useEffect(() => {
      if (!nextPrayer) return;

      const interval = setInterval(() => {
          const diff = nextPrayer.time.getTime() - new Date().getTime();
          if (diff <= 1000) {
              if (Notification.permission === 'granted') {
                new Notification(`حان الآن موعد أذان ${prayerNames[nextPrayer.name]}`);
              }
              const audio = adhanAudio.current;
              if (audio) {
                  audio.currentTime = 0;
                  const playPromise = audio.play();
                  if (playPromise !== undefined) {
                      playPromise.catch(error => {
                          console.error("Adhan play failed:", error);
                          if (error.name === 'NotSupportedError') {
                              audio.addEventListener('canplaythrough', () => {
                                  audio.play().catch(e => console.error("Adhan play retry failed:", e));
                              }, { once: true });
                          }
                      });
                  }
              }
              setCountdown('00:00:00');
              // The main useEffect for nextPrayer will handle recalculation
          } else {
              const hours = Math.floor(diff / (1000 * 60 * 60));
              const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = Math.floor((diff % (1000 * 60)) / 1000);
              setCountdown(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
          }
      }, 1000);

      return () => clearInterval(interval);

    }, [nextPrayer]);
    
    const requestNotificationPermission = () => {
        if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
    };

    if (isLoading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    
    return (
        <div className="p-4 max-w-md mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4 text-white">مواقيت الصلاة</h2>
            {error && <p className="text-red-500 text-center mb-4">{error}</p>}
            
            {nextPrayer && (
                <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg mb-6 shadow-lg">
                    <p className="text-lg text-gray-300">الصلاة القادمة</p>
                    <p className="text-3xl font-bold text-white my-2">{prayerNames[nextPrayer.name]}</p>
                    <p className="text-4xl font-mono tracking-widest text-white">{countdown}</p>
                </div>
            )}
            <div className="bg-gray-900 border border-gray-700 p-4 rounded-lg space-y-2 mb-6">
                {prayerTimes && Object.entries(prayerTimes).map(([name, time]) => (
                    prayerNames[name] && <div key={name} className="flex justify-between items-center p-2 bg-gray-800 rounded">
                        <span className="font-bold">{prayerNames[name]}</span>
                        <span className="font-mono text-lg">{new Date(`1/1/2024 ${time}`).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                ))}
            </div>
             <div className="mb-4">
                <label htmlFor="muezzin-select" className="block mb-2 text-sm font-medium text-gray-300">اختر المؤذن</label>
                <select 
                    id="muezzin-select" 
                    value={muezzin} 
                    onChange={e => setMuezzin(e.target.value)}
                    className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg focus:ring-gray-500 focus:border-gray-500 block w-full p-2.5"
                >
                   {MUEZZINS.map(m => <option key={m.url} value={m.url}>{m.name}</option>)}
                </select>
            </div>
            <div className="mt-4">
                <button onClick={requestNotificationPermission} className="text-sm text-gray-400 hover:underline">
                  تفعيل إشعارات الأذان
                </button>
            </div>
        </div>
    );
};

export default PrayerTimes;