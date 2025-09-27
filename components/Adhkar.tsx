import React, { useState, useEffect } from 'react';
import { ADHKAR_DATA } from '../constants';
import { Zikr } from '../types';
import { generateImage } from '../services/geminiService';
import ImageModal from './ImageModal';
import { ImageIcon } from './Icons';

const Adhkar: React.FC = () => {
  const categories = [...new Set(ADHKAR_DATA.map(z => z.category))];
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [counters, setCounters] = useState<{ [key: string]: number }>({});
  const [arabicVoice, setArabicVoice] = useState<SpeechSynthesisVoice | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    const getVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const arVoice = voices.find(voice => voice.lang.startsWith('ar'));
      setArabicVoice(arVoice || null);
    };

    getVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = getVoices;
    }
  }, []);
  
  const speak = (text: string) => {
    if (!arabicVoice) {
      alert('لم يتم العثور على صوت عربي لتشغيل الذكر.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = arabicVoice;
    utterance.lang = 'ar-SA';
    window.speechSynthesis.speak(utterance);
  };
  
  const handleCount = (zikr: Zikr) => {
    const zikrKey = zikr.content;
    const currentCount = counters[zikrKey] || 0;
    const maxCount = parseInt(zikr.count, 10);
    if (currentCount < maxCount) {
      setCounters(prev => ({ ...prev, [zikrKey]: currentCount + 1 }));
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

  const getProgress = (zikr: Zikr) => {
    const currentCount = counters[zikr.content] || 0;
    const maxCount = parseInt(zikr.count, 10);
    return (currentCount / maxCount) * 100;
  };

  const filteredAdhkar = ADHKAR_DATA.filter(z => z.category === activeCategory);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <ImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        imageSrc={generatedImage}
        isLoading={isGenerating}
        error={generationError}
      />
      <h2 className="text-2xl font-bold mb-4 text-center text-white">الأذكار اليومية</h2>
      <div className="flex overflow-x-auto space-x-2 rtl:space-x-reverse pb-2 mb-4">
        {categories.map(category => (
           <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-4 py-2 rounded-full transition-colors whitespace-nowrap text-sm ${activeCategory === category ? 'bg-gray-200 text-black' : 'bg-gray-800 text-gray-300'}`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredAdhkar.map((zikr, index) => (
          <div key={index} className="bg-gray-900 p-4 rounded-lg shadow-md border border-gray-700" onClick={() => handleCount(zikr)}>
             <div className="relative h-2 w-full bg-gray-700 rounded-full overflow-hidden mb-2">
                <div style={{ width: `${getProgress(zikr)}%` }} className="absolute top-0 right-0 h-full bg-white transition-all duration-300"></div>
            </div>
            <p className="text-lg leading-relaxed text-right mb-3">{zikr.content}</p>
            <p className="text-sm text-gray-400 mb-3">{zikr.reference}</p>
            <div className="flex justify-between items-center">
                <div className="flex space-x-4 rtl:space-x-reverse">
                    <button onClick={(e) => { e.stopPropagation(); speak(zikr.content); }} className="text-gray-300 hover:text-white">
                        استماع
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleGenerateImage(zikr.content); }} className="text-gray-300 hover:text-white flex items-center space-x-1 rtl:space-x-reverse">
                       <ImageIcon />
                       <span>صورة</span>
                    </button>
                </div>
                <div className="text-center">
                    <span className="text-lg font-bold text-white">{counters[zikr.content] || 0}</span>
                    <span className="text-sm text-gray-400"> / {zikr.count}</span>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Adhkar;