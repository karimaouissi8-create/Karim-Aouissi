import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob, Chat } from "@google/genai";
import { systemInstruction } from '../services/geminiService';
import { Message } from '../types';
import { MicIcon, SendIcon } from './Icons';
import Spinner from './Spinner';

// Helper functions for audio encoding/decoding
const decode = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const encode = (bytes: Uint8Array) => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const createBlob = (data: Float32Array): Blob => {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
};


const Assistant: React.FC = () => {
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  
  // Shared state
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'السلام عليكم، اختر وضع المحادثة.', sender: 'ai', isFinal: true },
  ]);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Voice Chat State
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'connecting' | 'connected' | 'recording' | 'error'>('idle');
  const sessionPromiseRef = useRef<any | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sources = useRef(new Set<AudioBufferSourceNode>()).current;
  const nextStartTime = useRef(0);

  // Text Chat State
  const [textInput, setTextInput] = useState('');
  const [isTextLoading, setIsTextLoading] = useState(false);
  const chatRef = useRef<Chat | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(scrollToBottom, [messages]);

  // --- Voice Chat Logic ---
  const connect = async () => {
    setVoiceStatus('connecting');
    setError(null);
    setMessages([{ id: '1', text: 'جاري الاتصال...', sender: 'ai', isFinal: true }]);
    try {
      if (!process.env.API_KEY) throw new Error("API_KEY is not set.");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: async () => {
            setVoiceStatus('connected');
            setMessages([{ id: '1', text: 'تم الاتصال. اضغط باستمرار على الميكروفون للتحدث.', sender: 'ai', isFinal: true }]);
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = inputAudioContextRef.current!.createMediaStreamSource(streamRef.current);
            audioProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            audioProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromiseRef.current?.then((session: any) => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(audioProcessorRef.current);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle transcriptions and audio playback
            handleLiveMessage(message);
          },
          onerror: (e: ErrorEvent) => {
            setError('حدث خطأ في الاتصال.');
            setVoiceStatus('error');
            disconnect();
          },
          onclose: (e: CloseEvent) => { disconnect(); },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: {prebuiltVoiceConfig: {voiceName: 'Zephyr'}}},
          systemInstruction: systemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      });

    } catch (err: any) {
      setError(err.message || 'فشل في بدء الجلسة.');
      setVoiceStatus('error');
    }
  };
  
  const handleLiveMessage = async (message: LiveServerMessage) => {
      if (message.serverContent?.inputTranscription) {
          const text = message.serverContent.inputTranscription.text;
          setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last && last.sender === 'user' && !last.isFinal) {
                  last.text += text;
                  return [...prev.slice(0, -1), last];
              }
              return [...prev, { id: `user-${Date.now()}`, text, sender: 'user', isFinal: false }];
          });
      } else if (message.serverContent?.outputTranscription) {
          const text = message.serverContent.outputTranscription.text;
          setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last && last.sender === 'ai' && !last.isFinal) {
                  last.text += text;
                  return [...prev.slice(0, -1), last];
              }
              return [...prev, { id: `ai-${Date.now()}`, text, sender: 'ai', isFinal: false }];
          });
      }

      if (message.serverContent?.turnComplete) {
          setMessages(prev => prev.map(m => ({ ...m, isFinal: true })));
      }
      
      const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
      if (audio && outputAudioContextRef.current) {
          nextStartTime.current = Math.max(nextStartTime.current, outputAudioContextRef.current.currentTime);
          const audioBuffer = await decodeAudioData(decode(audio), outputAudioContextRef.current, 24000, 1);
          const source = outputAudioContextRef.current.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(outputAudioContextRef.current.destination);
          source.addEventListener('ended', () => sources.delete(source));
          source.start(nextStartTime.current);
          nextStartTime.current += audioBuffer.duration;
          sources.add(source);
      }
  };

  const disconnect = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    audioProcessorRef.current?.disconnect();
    if (inputAudioContextRef.current?.state !== 'closed') inputAudioContextRef.current?.close();
    if (outputAudioContextRef.current?.state !== 'closed') outputAudioContextRef.current?.close();
    sessionPromiseRef.current?.then((session: any) => session?.close());
    
    streamRef.current = null;
    audioProcessorRef.current = null;
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    sessionPromiseRef.current = null;

    setVoiceStatus('idle');
  };

  const handleMicPress = () => {
      if (audioProcessorRef.current && inputAudioContextRef.current) {
        audioProcessorRef.current.connect(inputAudioContextRef.current.destination);
        setVoiceStatus('recording');
      }
  };

  const handleMicRelease = () => {
      if (audioProcessorRef.current) {
        audioProcessorRef.current.disconnect();
        setVoiceStatus('connected');
      }
  };
  
  useEffect(() => {
    return () => disconnect();
  }, []);
  
  // --- Text Chat Logic ---
  const handleSendText = async () => {
    if (!textInput.trim() || isTextLoading) return;

    const newMessages: Message[] = [...messages, { id: `user-${Date.now()}`, text: textInput, sender: 'user', isFinal: true }];
    setMessages(newMessages);
    setTextInput('');
    setIsTextLoading(true);

    try {
        if (!process.env.API_KEY) throw new Error("API_KEY is not set.");

        if (!chatRef.current) {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            chatRef.current = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: { systemInstruction: systemInstruction },
            });
        }
        
        const response = await chatRef.current.sendMessage({ message: textInput });
        
        setMessages(prev => [...prev, { id: `ai-${Date.now()}`, text: response.text, sender: 'ai', isFinal: true }]);

    } catch (err: any) {
        setError(err.message || "فشل في إرسال الرسالة.");
    } finally {
        setIsTextLoading(false);
    }
  };
  
  const switchMode = (newMode: 'voice' | 'text') => {
      disconnect();
      setMode(newMode);
      setError(null);
      setMessages([
          { id: '1', text: newMode === 'voice' ? 'اضغط لبدء المحادثة الصوتية.' : 'اكتب سؤالك في الأسفل.', sender: 'ai', isFinal: true },
      ]);
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
       <div className="flex justify-center p-2 mb-4 bg-gray-900 rounded-lg">
            <button onClick={() => switchMode('voice')} className={`px-4 py-2 text-sm font-medium rounded-md ${mode === 'voice' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}>
                محادثة صوتية
            </button>
            <button onClick={() => switchMode('text')} className={`px-4 py-2 text-sm font-medium rounded-md ${mode === 'text' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}>
                محادثة نصية
            </button>
        </div>

      <div className="flex-grow overflow-y-auto space-y-4 p-4 rounded-lg">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-md p-3 rounded-xl ${msg.sender === 'user' ? 'bg-gray-600' : 'bg-gray-800'}`}>
              <p className={`whitespace-pre-wrap ${!msg.isFinal ? 'opacity-70' : ''}`}>{msg.text}</p>
            </div>
          </div>
        ))}
        {isTextLoading && mode === 'text' && (
            <div className="flex justify-start"><div className="max-w-md p-3 rounded-xl bg-gray-800"><Spinner/></div></div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-black/50 backdrop-blur-sm sticky bottom-20 sm:bottom-0 left-0 right-0 flex flex-col items-center justify-center">
        {error && <p className="text-red-500 mb-2">{error}</p>}
        
        {mode === 'voice' && (
            <>
              {voiceStatus === 'idle' || voiceStatus === 'error' ? 
                <button onClick={connect} className="bg-gray-700 rounded-full px-8 py-4 text-white hover:bg-gray-600 transition-colors">ابدأ المحادثة الصوتية</button> : null}
              {voiceStatus === 'connecting' && <div className="flex items-center space-x-2 rtl:space-x-reverse"><Spinner /><span>جارِ الاتصال...</span></div>}
              {voiceStatus === 'connected' || voiceStatus === 'recording' ? 
                <button onMouseDown={handleMicPress} onMouseUp={handleMicRelease} onTouchStart={handleMicPress} onTouchEnd={handleMicRelease} className={`rounded-full p-6 text-white transition-colors ${voiceStatus === 'recording' ? 'bg-red-600 animate-pulse' : 'bg-gray-700'}`}><MicIcon /></button> : null}
              {voiceStatus === 'connected' && <p className="text-sm text-gray-400 mt-2">اضغط باستمرار للتحدث</p>}
            </>
        )}
        
        {mode === 'text' && (
            <div className="flex w-full items-center space-x-2 rtl:space-x-reverse">
                <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendText()}
                    placeholder="اكتب رسالتك..."
                    className="flex-grow p-3 bg-gray-800 rounded-full border border-gray-700 focus:outline-none focus:border-gray-500"
                    disabled={isTextLoading}
                />
                <button onClick={handleSendText} disabled={isTextLoading} className="p-3 bg-gray-700 rounded-full text-white disabled:opacity-50">
                    <SendIcon />
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default Assistant;
