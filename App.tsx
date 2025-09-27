import React, { useState } from 'react';
import Header from './components/Header';
import NavigationBar from './components/NavigationBar';
import Assistant from './components/Assistant';
import Adhkar from './components/Adhkar';
import Quran from './components/Quran';
import PrayerTimes from './components/PrayerTimes';
import Hadith from './components/Hadith';
import Stories from './components/Stories';
import { Tab } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.ASSISTANT);

  const renderContent = () => {
    switch (activeTab) {
      case Tab.ASSISTANT:
        return <Assistant />;
      case Tab.QURAN:
        return <Quran />;
      case Tab.HADITH:
        return <Hadith />;
      case Tab.STORIES:
        return <Stories />;
      case Tab.ADHKAR:
        return <Adhkar />;
      case Tab.PRAYER_TIMES:
        return <PrayerTimes />;
      default:
        return <Assistant />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-gray-100">
      <Header />
      <main className="flex-grow overflow-y-auto pb-24 px-4">
        {renderContent()}
      </main>
      <NavigationBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default App;