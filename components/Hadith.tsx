import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { HADITH_DATA } from '../constants';
import { Hadith as HadithType } from '../types';
import Spinner from './Spinner';

const Hadith: React.FC = () => {
    const [dailyHadith, setDailyHadith] = useState<HadithType | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<HadithType[]>([]);
    const [selectedHadith, setSelectedHadith] = useState<HadithType | null>(null);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Select a random hadith on component mount
        setDailyHadith(HADITH_DATA[Math.floor(Math.random() * HADITH_DATA.length)]);
        setSearchResults(HADITH_DATA);
    }, []);
    
    useEffect(() => {
        if(searchTerm === '') {
            setSearchResults(HADITH_DATA);
        } else {
            setSearchResults(HADITH_DATA.filter(h => h.text.includes(searchTerm)));
        }
    }, [searchTerm]);

    const handleSelectHadith = (hadith: HadithType) => {
        setSelectedHadith(hadith);
        setExplanation(null); // Reset explanation when new hadith is selected
        setError(null);
    };

    const fetchExplanation = async () => {
        if (!selectedHadith) return;
        setIsLoading(true);
        setError(null);
        setExplanation(null);
        
        try {
            if (!process.env.API_KEY) throw new Error("API_KEY is not set.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const prompt = `اشرح الحديث النبوي التالي شرحاً واضحاً وموجزاً مع ذكر الفوائد المستنبطة منه: "${selectedHadith.text}"`;

            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
            });

            setExplanation(response.text);

        } catch (err: any) {
            setError('فشل في جلب الشرح. يرجى المحاولة مرة أخرى.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-center text-white">الحديث الشريف</h2>
            
            {/* Hadith of the Day */}
            {dailyHadith && !selectedHadith && (
                <div className="p-4 mb-6 border border-gray-700 rounded-lg bg-gray-900">
                    <h3 className="font-bold text-md mb-2">حديث اليوم</h3>
                    <p className="text-gray-200 mb-1">"{dailyHadith.text}"</p>
                    <p className="text-xs text-gray-400">{dailyHadith.narrator} - {dailyHadith.source} [{dailyHadith.grade}]</p>
                </div>
            )}
            
            {/* Main Content */}
            {selectedHadith ? (
                // Detail View
                <div>
                    <button onClick={() => setSelectedHadith(null)} className="mb-4 bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-600">عودة</button>
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                        <p className="text-lg leading-relaxed mb-2">"{selectedHadith.text}"</p>
                        <p className="text-sm text-gray-400 mb-4">{selectedHadith.narrator} - {selectedHadith.source} | <span className="font-semibold">{selectedHadith.grade}</span></p>
                        <button onClick={fetchExplanation} disabled={isLoading} className="bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50">
                            {isLoading ? 'جارِ التحميل...' : 'طلب الشرح'}
                        </button>

                        {error && <p className="text-red-500 mt-4">{error}</p>}

                        {explanation && (
                            <div className="mt-4 pt-4 border-t border-gray-700">
                                <h4 className="font-bold mb-2">الشرح:</h4>
                                <p className="whitespace-pre-wrap text-gray-300">{explanation}</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                // List View
                <div>
                    <input
                        type="text"
                        placeholder="ابحث عن حديث أو تحقق من صحته..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-3 mb-4 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:border-gray-500"
                    />
                    <div className="space-y-3">
                        {searchResults.map(hadith => (
                            <div key={hadith.id} onClick={() => handleSelectHadith(hadith)} className="bg-gray-900 p-4 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors border border-gray-800">
                                <p className="truncate text-gray-200 mb-1">{hadith.text}</p>
                                <p className="text-xs text-gray-500">{hadith.source} - <span className="font-semibold">{hadith.grade}</span></p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Hadith;
