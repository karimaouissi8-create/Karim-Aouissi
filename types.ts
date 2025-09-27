export enum Tab {
  ASSISTANT = 'assistant',
  QURAN = 'quran',
  HADITH = 'hadith',
  STORIES = 'stories',
  ADHKAR = 'adhkar',
  PRAYER_TIMES = 'prayer_times',
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  isFinal?: boolean;
}

export interface Zikr {
  category: string;
  count: string;
  description: string;
  reference: string;
  content: string;
}

export interface Hadith {
  id: number;
  text: string;
  narrator: string;
  source: string;
  grade: string;
  explanation?: string;
}

export interface Story {
    id: number;
    title: string;
    content: string;
    source?: string;
}

export interface Reciter {
    identifier: string;
    name: string;
}

export interface SurahIndex {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface Ayah {
  number: number;
  audio: string;
  text: string;
  numberInSurah: number;
}

export interface Surah extends SurahIndex {
  ayahs: Ayah[];
}

export interface PrayerTimesData {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Magrib: string;
  Isha: string;
  [key: string]: string;
}