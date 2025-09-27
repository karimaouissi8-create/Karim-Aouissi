import React, { useState, useEffect } from 'react';
import { STORIES_DATA } from '../constants';
import { Story } from '../types';
import { generateImage } from '../services/geminiService';
import ImageModal from './ImageModal';
// Fix: Import VolumeIcon which will be added to Icons.tsx, and remove the comment.
import { ImageIcon, VolumeIcon } from './Icons';

const Stories: React.FC = () => {
    const [selectedStory, setSelectedStory] = useState<Story | null>(null);
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
            alert('لم يتم العثور على صوت عربي لتشغيل القصة.');
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = arabicVoice;
        utterance.lang = 'ar-SA';
        window.speechSynthesis.speak(utterance);
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

    return (
        <div className="p-4 max-w-3xl mx-auto">
            <ImageModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                imageSrc={generatedImage}
                isLoading={isGenerating}
                error={generationError}
            />
            <h2 className="text-2xl font-bold mb-4 text-center text-white">قصص إسلامية</h2>

            {selectedStory ? (
                <div>
                    <button onClick={() => setSelectedStory(null)} className="mb-4 bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-600">العودة للقصص</button>
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                        <h3 className="text-xl font-bold mb-2">{selectedStory.title}</h3>
                        <p className="text-sm text-gray-400 mb-4">{selectedStory.source}</p>
                        <p className="whitespace-pre-wrap leading-relaxed text-gray-300">{selectedStory.content}</p>
                         <div className="flex space-x-4 rtl:space-x-reverse mt-4 pt-4 border-t border-gray-700">
                            {/* Fix: Add VolumeIcon to the listen button for UI consistency. */}
                            <button onClick={() => speak(`${selectedStory.title}. ${selectedStory.content}`)} className="text-gray-300 hover:text-white flex items-center space-x-1 rtl:space-x-reverse">
                                <VolumeIcon />
                                <span>استماع</span>
                            </button>
                            <button onClick={() => handleGenerateImage(selectedStory.content)} className="text-gray-300 hover:text-white flex items-center space-x-1 rtl:space-x-reverse">
                               <ImageIcon />
                               <span>صورة</span>
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {STORIES_DATA.map(story => (
                        <div key={story.id} onClick={() => setSelectedStory(story)} className="bg-gray-900 p-4 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors border border-gray-800">
                            <h3 className="text-lg font-bold text-white">{story.title}</h3>
                            <p className="text-sm text-gray-400 truncate">{story.content}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Stories;