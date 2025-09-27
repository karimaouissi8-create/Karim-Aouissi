import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-900 p-3 shadow-lg flex items-center justify-between z-10">
      <div className="flex items-center space-x-2 rtl:space-x-reverse">
         <img src="https://flagcdn.com/w40/ps.png" width="30" alt="Palestine Flag" />
         <span className="text-sm font-semibold text-white">فلسطين حرة</span>
      </div>
      <h1 className="text-lg font-bold text-white">المساعد الإسلامي الذكي</h1>
      <div className="w-20"></div>
    </header>
  );
};

export default Header;