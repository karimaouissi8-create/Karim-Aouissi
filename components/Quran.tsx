import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Surah, SurahIndex, Ayah, Reciter } from '../types';
import Spinner from './Spinner';
import { generateImage } from '../services/geminiService';
import ImageModal from './ImageModal';
import { ImageIcon, PlayIcon, PauseIcon, NextIcon, PreviousIcon, StopIcon } from './Icons';
import { RECITER_DATA } from '../constants';

const Quran: React.FC = () => {
    const [surahList, setSurahList] = useState<SurahIndex[]>([]);
    const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
    const [tafsir, setTafsir] = useState<{ ayah: number; text: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedReciter, setSelectedReciter] = useState<Reciter>(RECITER_DATA.find(r => r.identifier === 'ar.alafasy') || RECITER_DATA[0]);
    const audioRef = useRef<HTMLAudioElement>(null);
    const ayahRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Player State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [progress, setProgress] = useState(0);


    const [isModalOpen, setIsModalOpen] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);

    // Fetch Surah List on Mount
    useEffect(() => {
        setIsLoading(true);
        const fetchSurahList = async () => {
            try {
                const res = await fetch('https://api.alquran.cloud/v1/surah');
                const data = await res.json();
                setSurahList(data.data);
            } catch (err) {
                setError('فشل في تحميل قائمة السور.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchSurahList();
    }, []);
    
    // Audio Player Event Listeners
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleEnded = () => {
            if (selectedSurah && currentAyahIndex < selectedSurah.ayahs.length - 1) {
                setCurrentAyahIndex(prevIndex => prevIndex + 1);
            } else {
                setIsPlaying(false);
            }
        };

        const handleTimeUpdate = () => {
            if (audio.duration) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };

        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('timeupdate', handleTimeUpdate);

        return () => {
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
        };
    }, [currentAyahIndex, selectedSurah]);

    // Effect to play/pause audio and load new tracks
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying && selectedSurah) {
            const ayah = selectedSurah.ayahs[currentAyahIndex];
            
            const playAudio = async () => {
                try {
                    audio.playbackRate = playbackRate;
                    await audio.play();
                } catch (e) {
                    console.error("Audio play failed:", e);
                }
            };

            if (audio.src !== ayah.audio) {
                audio.src = ayah.audio;
                const loadedDataHandler = () => {
                    playAudio();
                    audio.removeEventListener('loadeddata', loadedDataHandler);
                };
                audio.addEventListener('loadeddata', loadedDataHandler);
                audio.load();
            } else {
                playAudio();
            }
            
            ayahRefs.current[currentAyahIndex]?.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });

        } else {
            audio.pause();
        }
    }, [currentAyahIndex, isPlaying, selectedSurah, playbackRate]);


    const fetchSurah = async (surahNumber: number) => {
        setIsLoading(true);
        setSelectedSurah(null);
        setError(null);
        setTafsir(null);
        handleStop();
        try {
            const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${selectedReciter.identifier}`);
            const data = await res.json();
            setSelectedSurah(data.data);
            ayahRefs.current = new Array(data.data.ayahs.length);
        } catch (err) {
            setError('فشل في تحميل السورة.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const fetchTafsir = async (ayahNumberInQuran: number) => {
        setTafsir({ ayah: ayahNumberInQuran, text: 'جار التحميل...' });
        try {
            const res = await fetch(`https://api.alquran.cloud/v1/ayah/${ayahNumberInQuran}/ar.muyassar`);
            const data = await res.json();
            setTafsir({ ayah: ayahNumberInQuran, text: data.data.text });
        } catch (err) {
            setTafsir({ ayah: ayahNumberInQuran, text: 'فشل في تحميل التفسير.' });
        }
    };

    const handleGenerateImage = async (text: string) => {
        setIsModalOpen(true);
        setIsGenerating(true);
        setGeneratedImage(null);
        setGenerationError(null);
        try {
            const imageBytes = await generateImage(text);
            setGeneratedImage(`data:image/jpeg;base64,${imageBytes}`);
        } catch (error) {
            setGenerationError("فشل في إنشاء الصورة.");
        } finally {
            setIsGenerating(false);
        }
    };
    
    // --- Player Controls (memoized with useCallback) ---
    const handlePlayPause = useCallback(() => {
        if (!selectedSurah) return;
        setIsPlaying(prevIsPlaying => {
            if (!prevIsPlaying && audioRef.current?.paused && currentAyahIndex === 0 && audioRef.current.currentTime === 0) {
                setCurrentAyahIndex(0);
            }
            return !prevIsPlaying;
        });
    }, [selectedSurah, currentAyahIndex]);

    const handleStop = useCallback(() => {
        setIsPlaying(false);
        setCurrentAyahIndex(0);
        setProgress(0);
        if (audioRef.current) {
             audioRef.current.pause();
             audioRef.current.removeAttribute('src');
             audioRef.current.load();
             audioRef.current.currentTime = 0;
        }
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'none';
            navigator.mediaSession.metadata = null;
        }
    }, []);

    const handleNext = useCallback(() => {
        if (selectedSurah && currentAyahIndex < selectedSurah.ayahs.length - 1) {
            setCurrentAyahIndex(prev => prev + 1);
        }
    }, [selectedSurah, currentAyahIndex]);

    const handlePrevious = useCallback(() => {
        if (currentAyahIndex > 0) {
            setCurrentAyahIndex(prev => prev - 1);
        }
    }, [currentAyahIndex]);

    // --- Media Session Integration for Background Playback ---
    useEffect(() => {
        if (!('mediaSession' in navigator)) return;

        navigator.mediaSession.setActionHandler('play', handlePlayPause);
        navigator.mediaSession.setActionHandler('pause', handlePlayPause);
        navigator.mediaSession.setActionHandler('stop', handleStop);
        navigator.mediaSession.setActionHandler('previoustrack', handlePrevious);
        navigator.mediaSession.setActionHandler('nexttrack', handleNext);

        return () => {
            navigator.mediaSession.setActionHandler('play', null);
            navigator.mediaSession.setActionHandler('pause', null);
            navigator.mediaSession.setActionHandler('stop', null);
            navigator.mediaSession.setActionHandler('previoustrack', null);
            navigator.mediaSession.setActionHandler('nexttrack', null);
        };
    }, [handlePlayPause, handleStop, handlePrevious, handleNext]);

    useEffect(() => {
        if (!selectedSurah || !('mediaSession' in navigator)) {
            return;
        }

        const currentAyah = selectedSurah.ayahs[currentAyahIndex];
        const metadata = new MediaMetadata({
            title: `آية ${currentAyah.numberInSurah}`,
            artist: selectedReciter.name,
            album: `سورة ${selectedSurah.name}`,
            artwork: [
                { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Quran_Kareem.svg/512px-Quran_Kareem.svg.png', sizes: '512x512', type: 'image/png' },
            ]
        });

        navigator.mediaSession.metadata = metadata;
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    }, [isPlaying, currentAyahIndex, selectedSurah, selectedReciter]);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'none';
                navigator.mediaSession.metadata = null;
            }
        };
    }, []);
    
    const handleAyahClick = (index: number) => {
        setCurrentAyahIndex(index);
        if (!isPlaying) {
            setIsPlaying(true);
        }
    }
    
    const handleBackToSurahList = () => {
        handleStop();
        setSelectedSurah(null);
    }

    const filteredSurahs = surahList.filter(s => s.name.includes(searchTerm) || s.englishName.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-4 max-w-4xl mx-auto">
            <ImageModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} imageSrc={generatedImage} isLoading={isGenerating} error={generationError} />
            <audio ref={audioRef} />
            <h2 className="text-2xl font-bold mb-4 text-center text-white">القرآن الكريم</h2>
            {!selectedSurah ? (
                <div>
                    <div className="mb-4">
                        <label htmlFor="reciter-select" className="block mb-2 text-sm font-medium text-gray-300">اختر القارئ</label>
                        <select 
                            id="reciter-select" 
                            value={selectedReciter.identifier} 
                            onChange={e => setSelectedReciter(RECITER_DATA.find(r => r.identifier === e.target.value) || RECITER_DATA[0])}
                            className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg focus:ring-gray-500 focus:border-gray-500 block w-full p-2.5"
                        >
                        {RECITER_DATA.map(reciter => <option key={reciter.identifier} value={reciter.identifier}>{reciter.name}</option>)}
                        </select>
                    </div>
                    <input
                        type="text"
                        placeholder="ابحث عن سورة..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-2 mb-4 bg-gray-900 rounded-lg border border-gray-700 focus:outline-none focus:border-gray-500"
                    />
                    {isLoading ? <div className="flex justify-center mt-8"><Spinner/></div> :
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredSurahs.map(surah => (
                            <div key={surah.number} onClick={() => fetchSurah(surah.number)} className="bg-gray-900 p-4 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors border border-gray-800">
                                <p className="font-bold">{surah.number}. {surah.name}</p>
                                <p className="text-sm text-gray-400">{surah.englishName} - {surah.numberOfAyahs} آيات</p>
                            </div>
                        ))}
                    </div>}
                </div>
            ) : (
                <div>
                    <button onClick={handleBackToSurahList} className="mb-4 bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-600">العودة للسور</button>
                    <div className="text-center mb-4">
                        <h3 className="text-3xl font-bold">{selectedSurah.name}</h3>
                        <p className="text-gray-400">القارئ: {selectedReciter.name}</p>
                    </div>
                    
                    {/* Speed Controls */}
                    <div className="flex justify-center items-center space-x-2 rtl:space-x-reverse my-4">
                        <span className="text-sm text-gray-400">السرعة:</span>
                        {[0.75, 1, 1.25].map(speed => (
                            <button key={speed} onClick={() => setPlaybackRate(speed)} className={`px-3 py-1 text-xs rounded-full ${playbackRate === speed ? 'bg-white text-black' : 'bg-gray-700 text-white'}`}>
                                {speed === 1 ? 'عادي' : speed < 1 ? 'بطيء' : 'سريع'}
                            </button>
                        ))}
                    </div>
                    
                    {isLoading ? <Spinner /> : (
                        <div className="space-y-6 pb-28"> {/* Padding bottom for player */}
                            {selectedSurah.ayahs.map((ayah, index) => (
                                <div 
                                    key={ayah.number} 
                                    ref={el => { ayahRefs.current[index] = el; }}
                                    onClick={() => handleAyahClick(index)}
                                    className={`p-4 rounded-lg transition-all duration-300 border cursor-pointer ${currentAyahIndex === index && isPlaying ? 'bg-gray-800/80 border-white/50' : 'bg-gray-900 border-gray-800 hover:bg-gray-800'}`}
                                >
                                    <p className="text-xl leading-relaxed font-serif">{ayah.text} ({ayah.numberInSurah})</p>
                                    <div className="flex space-x-4 rtl:space-x-reverse mt-2">
                                        <button onClick={(e) => { e.stopPropagation(); fetchTafsir(ayah.number); }} className="text-gray-400 hover:text-white">تفسير</button>
                                        <button onClick={(e) => { e.stopPropagation(); handleGenerateImage(ayah.text); }} className="text-gray-400 hover:text-white flex items-center space-x-1 rtl:space-x-reverse">
                                            <ImageIcon />
                                            <span>صورة</span>
                                        </button>
                                    </div>
                                    {tafsir && tafsir.ayah === ayah.number && (
                                        <div className="mt-2 p-3 bg-gray-800 rounded">
                                            <h4 className="font-bold mb-1">تفسير الميسر</h4>
                                            <p className="text-sm text-gray-300">{tafsir.text}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Player Controls */}
                    <div className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-2xl bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-xl shadow-lg p-3 z-20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 rtl:space-x-reverse">
                                <button onClick={handlePrevious} className="text-white disabled:opacity-50" disabled={currentAyahIndex === 0}><PreviousIcon /></button>
                                <button onClick={handlePlayPause} className="w-10 h-10 flex items-center justify-center bg-white text-black rounded-full">
                                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                                </button>
                                <button onClick={handleNext} className="text-white disabled:opacity-50" disabled={!selectedSurah || currentAyahIndex === selectedSurah.ayahs.length - 1}><NextIcon /></button>
                            </div>
                            <div className="flex-grow mx-4">
                                <p className="text-sm text-white truncate">{selectedSurah.name} - آية {selectedSurah.ayahs[currentAyahIndex]?.numberInSurah || ''}</p>
                                <div className="bg-gray-600 rounded-full h-1 mt-1">
                                    <div className="bg-white h-1 rounded-full" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                            <button onClick={handleStop} className="text-white"><StopIcon/></button>
                        </div>
                    </div>
                </div>
            )}
            {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        </div>
    );
};

export default Quran;