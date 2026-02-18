
import React, { useState, useEffect } from 'react';
import { 
  Anchor, 
  Droplets, 
  Sun, 
  Moon, 
  LayoutDashboard, 
  Ship, 
  Globe, 
  Waves, 
  Copyright,
  BarChart3,
  ClipboardList
} from 'lucide-react';
import BiofuelFeature from './components/BiofuelFeature';
import CIIFeature from './components/CIIFeature';
import EUETSFeature from './components/EUETSFeature';
import FuelEUFeature from './components/FuelEUFeature';
import IMOGFIFeature from './components/IMOGFIFeature';
import CAPFeature from './components/CAPFeature';
import DashboardFeature from './components/DashboardFeature';

type NavigationTab = 'dashboard' | 'biofuel' | 'cii' | 'eu-ets' | 'fueleu' | 'imo-gfi' | 'cap';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cii', label: 'CII', icon: Ship },
    { id: 'eu-ets', label: 'EU ETS', icon: Globe },
    { id: 'fueleu', label: 'FuelEU', icon: Waves },
    { id: 'imo-gfi', label: 'IMO GFI', icon: BarChart3 },
    { id: 'cap', label: 'CAP (Corrective)', icon: ClipboardList },
    { id: 'biofuel', label: 'Biofuel', icon: Droplets },
  ];

  const activeNavItem = navItems.find(i => i.id === activeTab);
  const ActiveIcon = activeNavItem?.icon;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-['Inter']">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-slate-900 dark:bg-black border-r border-slate-800 sticky top-0 h-screen flex flex-col p-6 z-50">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Anchor className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white uppercase">emissioncalculator.in</h1>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as NavigationTab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
           <button 
             onClick={() => setIsDarkMode(!isDarkMode)} 
             className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
           >
             {isDarkMode ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
             {isDarkMode ? 'Light Mode' : 'Dark Mode'}
           </button>
           <div className="mt-4 px-4 flex items-center gap-2 opacity-30">
             <Copyright className="w-3.5 h-3.5" />
             <span className="text-[10px] font-black uppercase tracking-widest">2026 Calculator.in</span>
           </div>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* SHARED HEADER */}
        <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-900 py-4 px-8 flex items-center justify-between z-40 sticky top-0">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              {ActiveIcon && <ActiveIcon className="w-5 h-5 text-blue-500" />}
              {activeNavItem?.label} Overview
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Regulatory Compliance Engine v1.4
            </p>
          </div>
        </header>

        {/* FEATURE CONTAINER */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'dashboard' && <DashboardFeature />}
          {activeTab === 'biofuel' && <BiofuelFeature />}
          {activeTab === 'cii' && <CIIFeature />}
          {activeTab === 'eu-ets' && <EUETSFeature />}
          {activeTab === 'fueleu' && <FuelEUFeature />}
          {activeTab === 'imo-gfi' && <IMOGFIFeature />}
          {activeTab === 'cap' && <CAPFeature />}
        </main>
      </div>
    </div>
  );
};

export default App;
