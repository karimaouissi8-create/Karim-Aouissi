import React from 'react';
import { Tab } from '../types';
import { AssistantIcon, AdhkarIcon, QuranIcon, PrayerTimesIcon, HadithIcon, StoriesIcon } from './Icons';

interface NavigationBarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { tab: Tab.ASSISTANT, label: 'المساعد', icon: <AssistantIcon /> },
    { tab: Tab.QURAN, label: 'القرآن', icon: <QuranIcon /> },
    { tab: Tab.HADITH, label: 'الحديث', icon: <HadithIcon /> },
    { tab: Tab.STORIES, label: 'قصص', icon: <StoriesIcon /> },
    { tab: Tab.ADHKAR, label: 'الأذكار', icon: <AdhkarIcon /> },
    { tab: Tab.PRAYER_TIMES, label: 'الصلاة', icon: <PrayerTimesIcon /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 shadow-lg z-10 border-t border-gray-700">
      <div className="flex justify-around max-w-lg mx-auto">
        {navItems.map(({ tab, label, icon }) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${
              activeTab === tab ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
            aria-label={label}
          >
            <div className="w-6 h-6">{icon}</div>
            <span className="text-xs mt-1">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default NavigationBar;