import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Anchor, 
  Droplets, 
  Flame, 
  ShieldCheck, 
  ShieldAlert, 
  Info, 
  Calculator as CalcIcon,
  Layers,
  Settings2,
  Sun,
  Moon,
  TrendingDown,
  LineChart as LineChartIcon,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  X,
  Zap,
  Leaf,
  FileDown,
  Loader2,
  LayoutDashboard,
  Ship,
  Globe,
  Waves,
  Calendar,
  Building2,
  Copyright,
  Sparkles
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { FossilFuelType, BiofuelData, FossilData, BiofuelGrade } from './types';
import { FOSSIL_FUEL_STANDARDS } from './constants';
import { calculateBlendedCf } from './services/calculator';

type NavigationTab = 'biofuel' | 'cii' | 'eu-ets' | 'fueleu' | 'imo-gfi';

const App: React.FC = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<NavigationTab>('biofuel');

  // Theme & PDF State
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // Ref for the content to capture (Hidden Report Template)
  const reportTemplateRef = useRef<HTMLDivElement>(null);

  // Graph & Simulation Display State
  const [isGraphMinimized, setIsGraphMinimized] = useState(false);
  const [isGraphMaximized, setIsGraphMaximized] = useState(false);

  // Main Fuel Component State
  const [energyMJ, setEnergyMJ] = useState<number>(809930);
  const [biofuel, setBiofuel] = useState<BiofuelData>({
    mass: 21.890,
    lcv_kg: 37,
    ghgIntensity: 14.9,
    isCertified: true
  });

  const [fossil, setFossil] = useState<FossilData>({
    type: FossilFuelType.VLSFO,
    mass: 53.110,
  });

  // What-If Simulation State (Matching image: HFO=100, LFO=50, MGO=25)
  const [simHFO, setSimHFO] = useState(100);
  const [simLFO, setSimLFO] = useState(50);
  const [simMGO, setSimMGO] = useState(25);
  const [simBioPercent, setSimBioPercent] = useState(24);

  // Effect to handle dark mode class on root
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Sync LCV when Mass or Energy changes
  useEffect(() => {
    if (biofuel.mass > 0) {
      const calculatedLcv = energyMJ / (biofuel.mass * 1000);
      setBiofuel(prev => ({
        ...prev,
        lcv_kg: calculatedLcv
      }));
    }
  }, [biofuel.mass, energyMJ]);

  // Derived Values
  const totalMass = biofuel.mass + fossil.mass;
  const effectiveGrade = totalMass > 0 ? (biofuel.mass / totalMass) * 100 : 0;

  // Calculation Hook
  const results = useMemo(() => calculateBlendedCf(biofuel, fossil), [biofuel, fossil]);

  // Simulation Calculations
  const simResults = useMemo(() => {
    const hfoCf = FOSSIL_FUEL_STANDARDS[FossilFuelType.HFO].cf;
    const lfoCf = FOSSIL_FUEL_STANDARDS[FossilFuelType.VLSFO].cf;
    const mgoCf = FOSSIL_FUEL_STANDARDS[FossilFuelType.MGO].cf;

    const baselineCO2 = 
      (simHFO * hfoCf) +
      (simLFO * lfoCf) +
      (simMGO * mgoCf);
    
    const totalSimMass = simHFO + simLFO + simMGO;
    const simBioMass = totalSimMass * (simBioPercent / 100);
    const simFossilMass = totalSimMass - simBioMass;
    
    // Average baseline properties for the fossil part
    const avgFossilCf = totalSimMass > 0 ? baselineCO2 / totalSimMass : 0;
    
    // Energy weightings
    const bioLcv_g = biofuel.lcv_kg / 1000;
    const bioEnergy = (simBioMass * 1_000_000) * bioLcv_g;
    const fossilEnergy = (simFossilMass * 1_000_000) * 0.041; // Avg fossil LCV ~41 MJ/kg
    const totalEnergy = bioEnergy + fossilEnergy;
    
    const bioRatio = totalEnergy > 0 ? bioEnergy / totalEnergy : 0;
    const fossilRatio = totalEnergy > 0 ? fossilEnergy / totalEnergy : 0;
    
    // Blended Cf for simulation
    const simBlendedCf = (bioRatio * results.biofuel.cf) + (fossilRatio * avgFossilCf);
    const scenarioCO2 = simBlendedCf * totalSimMass;
    
    return {
      baselineCO2,
      scenarioCO2,
      savings: baselineCO2 - scenarioCO2,
      totalMass: totalSimMass,
      reductionPercent: baselineCO2 > 0 ? ((baselineCO2 - scenarioCO2) / baselineCO2) * 100 : 0
    };
  }, [simHFO, simLFO, simMGO, simBioPercent, biofuel, results.biofuel.cf]);

  // Comparison Data for Graph
  const comparisonData = useMemo(() => {
    const scenarios = [
      { name: 'HFO', cf: FOSSIL_FUEL_STANDARDS[FossilFuelType.HFO].cf, color: '#ef4444' },
      { name: 'LFO/VLSFO', cf: FOSSIL_FUEL_STANDARDS[FossilFuelType.VLSFO].cf, color: '#f97316' },
      { name: 'MGO', cf: FOSSIL_FUEL_STANDARDS[FossilFuelType.MGO].cf, color: '#eab308' },
      { name: 'Calculated Blend', cf: results.total.blendedCf, color: '#3b82f6', isCurrent: true }
    ];
    
    return scenarios.map(s => ({
      ...s,
      totalCO2: s.cf * totalMass, 
      deviation: s.name === 'Calculated Blend' ? 0 : ((results.total.blendedCf - s.cf) / s.cf) * 100
    }));
  }, [results, totalMass]);

  // Insight Calculations
  const insights = useMemo(() => {
    const mgoCf = FOSSIL_FUEL_STANDARDS[FossilFuelType.MGO].cf;
    const currentCf = results.total.blendedCf;
    
    const reductionVsMGO = mgoCf > 0 ? ((mgoCf - currentCf) / mgoCf) * 100 : 0;
    const co2SavedVsMGO = (mgoCf * totalMass) - (currentCf * totalMass);
    
    return {
      reductionVsMGO,
      co2SavedVsMGO,
      intensity: currentCf
    };
  }, [results.total.blendedCf, totalMass]);

  // Graph Calculations
  const chartHeight = 320;
  const chartWidth = 850;
  const paddingX = 80;
  const paddingY = 60;
  const availableHeight = chartHeight - paddingY * 2;
  const availableWidth = chartWidth - paddingX * 2;
  
  const allCfs = comparisonData.map(d => d.cf);
  const minCf = Math.min(...allCfs) * 0.95;
  const maxCf = Math.max(...allCfs) * 1.05;

  const getY = (cf: number) => chartHeight - paddingY - ((cf - minCf) / (maxCf - minCf)) * availableHeight;
  const getX = (index: number) => paddingX + (index * (availableWidth / (comparisonData.length - 1)));

  const linePath = useMemo(() => comparisonData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.cf)}`).join(' '), [comparisonData, minCf, maxCf]);
  const areaPath = useMemo(() => {
    const points = comparisonData.map((d, i) => `L ${getX(i)} ${getY(d.cf)}`).join(' ');
    return `M ${getX(0)} ${chartHeight - paddingY} ${points} L ${getX(comparisonData.length - 1)} ${chartHeight - paddingY} Z`;
  }, [comparisonData, minCf, maxCf]);

  // Handlers
  const handleBioChange = (field: keyof BiofuelData, value: string | boolean) => {
    setBiofuel(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? parseFloat(value) || 0 : value
    }));
  };

  const handleFossilChange = (field: keyof FossilData, value: string) => {
    setFossil(prev => ({
      ...prev,
      [field]: field === 'mass' ? parseFloat(value) || 0 : value
    }));
  };

  const handleTotalMassChange = (newTotalStr: string) => {
    const newTotal = parseFloat(newTotalStr) || 0;
    if (newTotal === 0) {
      setBiofuel(prev => ({ ...prev, mass: 0 }));
      setFossil(prev => ({ ...prev, mass: 0 }));
      return;
    }
    const currentRatio = totalMass > 0 ? biofuel.mass / totalMass : 0;
    setBiofuel(prev => ({ ...prev, mass: newTotal * currentRatio }));
    setFossil(prev => ({ ...prev, mass: newTotal - (newTotal * currentRatio) }));
  };

  const applyGradePreset = (grade: BiofuelGrade) => {
    let percentage = 0;
    switch (grade) {
      case BiofuelGrade.B24: percentage = 0.24; break;
      case BiofuelGrade.B30: percentage = 0.30; break;
      case BiofuelGrade.B50: percentage = 0.50; break;
      case BiofuelGrade.B100: percentage = 1.00; break;
    }
    const currentTotal = totalMass || 100;
    setBiofuel(prev => ({ ...prev, mass: currentTotal * percentage }));
    setFossil(prev => ({ ...prev, mass: currentTotal - (currentTotal * percentage) }));
  };

  const formatNum = (num: number, minDecimals: number, maxDecimals: number) => {
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: minDecimals, 
      maximumFractionDigits: maxDecimals 
    });
  };

  const downloadReport = async () => {
    if (!reportTemplateRef.current) return;
    
    setIsGeneratingPDF(true);
    const reportEl = reportTemplateRef.current;
    reportEl.style.display = 'block';
    
    try {
      const canvas = await html2canvas(reportEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Maritime_Biofuel_Compliance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      reportEl.style.display = 'none';
      setIsGeneratingPDF(false);
    }
  };

  const EmissionGraph = ({ isFull = false, isReport = false }) => (
    <svg 
      viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
      className={`w-full overflow-visible ${isFull ? 'h-full max-h-[70vh]' : 'mx-auto'}`}
    >
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>

      {[0, 0.25, 0.5, 0.75, 1].map(v => {
        const y = paddingY + v * availableHeight;
        return (
          <g key={v}>
            <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="currentColor" className={isReport ? "text-slate-200" : "text-slate-100 dark:text-slate-800"} strokeWidth="1" />
            <text x={paddingX - 15} y={y + 4} textAnchor="end" className="fill-slate-400 text-[9px] font-mono">
              {(maxCf - v * (maxCf - minCf)).toFixed(2)}
            </text>
          </g>
        );
      })}

      <path d={areaPath} fill="url(#areaGradient)" />
      <path d={linePath} fill="none" stroke="url(#lineGradient)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm" />

      {comparisonData.map((d, i) => {
        const x = getX(i);
        const y = getY(d.cf);
        return (
          <g key={d.name} className="group/point">
            <line x1={x} y1={paddingY} x2={x} y2={chartHeight - paddingY} stroke="currentColor" className={isReport ? "text-slate-100" : "text-slate-100 dark:text-slate-800"} strokeWidth="1" strokeDasharray="4 4" />
            <circle cx={x} cy={y} r={d.isCurrent ? "10" : "7"} fill={d.color} stroke="#fff" strokeWidth="2" className="shadow-xl" />
            <text x={x} y={y - 25} textAnchor="middle" className={`text-[14px] font-black font-mono transition-all ${d.isCurrent ? 'fill-blue-600' : 'fill-slate-900'}`}>
              {formatNum(d.totalCO2, 1, 1)}
            </text>
            <text x={x} y={y - 12} textAnchor="middle" className="text-[8px] font-black uppercase tracking-widest fill-slate-400">
              MT CO<sub>2</sub>
            </text>
            <text x={x} y={chartHeight - paddingY + 30} textAnchor="middle" className={`text-[10px] font-black uppercase tracking-[0.1em] ${d.isCurrent ? 'fill-blue-600' : 'fill-slate-500'}`}>
              {d.name}
            </text>
          </g>
        );
      })}
    </svg>
  );

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
          {[
            { id: 'biofuel', label: 'Biofuel', icon: Droplets },
            { id: 'cii', label: 'CII', icon: Ship },
            { id: 'eu-ets', label: 'EU ETS', icon: Globe },
            { id: 'fueleu', label: 'FuelEU', icon: Waves },
            { id: 'imo-gfi', label: 'IMO GFI', icon: LayoutDashboard },
          ].map(item => (
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
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* TOP CONTEXT BAR */}
        <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-900 py-4 px-8 flex items-center justify-between z-40 sticky top-0">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              {activeTab === 'biofuel' && <><Droplets className="w-5 h-5 text-blue-500" /> Biofuel Calculator</>}
              {activeTab === 'cii' && <><Ship className="w-5 h-5 text-blue-500" /> CII Calculator</>}
              {activeTab === 'eu-ets' && <><Globe className="w-5 h-5 text-blue-500" /> EU ETS Emissions</>}
              {activeTab === 'fueleu' && <><Waves className="w-5 h-5 text-blue-500" /> FuelEU Compliance</>}
              {activeTab === 'imo-gfi' && <><LayoutDashboard className="w-5 h-5 text-blue-500" /> IMO GFI Reporting</>}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {activeTab === 'biofuel' ? 'MEPC.1/Circ.905 Compliant' : 'Advanced Maritime Analysis'}
            </p>
          </div>

          {activeTab === 'biofuel' && (
            <button 
              onClick={downloadReport} 
              disabled={isGeneratingPDF}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-xl transition-all shadow-lg font-bold uppercase text-[10px] tracking-widest"
            >
              {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              {isGeneratingPDF ? 'Generating...' : 'Download Report'}
            </button>
          )}
        </header>

        {/* VIEW RENDERER */}
        <main className="flex-1 overflow-y-auto p-8">
          
          {activeTab === 'biofuel' ? (
            <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Sidebar Inputs */}
              <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-bold text-lg dark:text-white">Grade Presets</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[BiofuelGrade.B24, BiofuelGrade.B30, BiofuelGrade.B50, BiofuelGrade.B100].map(grade => (
                      <button key={grade} onClick={() => applyGradePreset(grade)} className="py-2.5 px-3 text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:border-blue-400 hover:text-blue-600 transition-all">
                        Apply {grade}
                      </button>
                    ))}
                  </div>
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                    <span className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Current Effective Grade</span>
                    <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300">B{formatNum(effectiveGrade, 1, 1)}</span>
                  </div>
                </section>

                <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-slate-600 dark:text-slate-400">
                    <CalcIcon className="w-5 h-5" />
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">Delivery Volume</h3>
                  </div>
                  <div className="p-5 bg-slate-100 dark:bg-slate-800 rounded-2xl flex flex-col gap-2 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-500 uppercase">Total Delivered Mass</span>
                    <div className="flex items-center gap-2">
                      <input type="number" step="0.001" value={totalMass} onChange={(e) => handleTotalMassChange(e.target.value)} className="w-full text-3xl font-mono font-bold bg-transparent focus:outline-none text-slate-800 dark:text-slate-100" />
                      <span className="text-xl font-black text-slate-400">MT</span>
                    </div>
                  </div>
                </section>

                <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-2 mb-6 text-slate-600 dark:text-slate-400">
                    <Settings2 className="w-5 h-5" />
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white uppercase tracking-tighter">Mass Components</h3>
                  </div>
                  <div className="space-y-6">
                    <div className="relative p-5 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                      <div className="mb-4">
                        <label className="block text-[11px] text-blue-500 font-bold uppercase mb-2 flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5" />Biofuel Mass [MT]</label>
                        <input type="number" step="0.001" value={biofuel.mass} onChange={(e) => handleBioChange('mass', e.target.value)} className="w-full text-4xl font-mono font-bold bg-transparent border-b-4 border-blue-200 dark:border-blue-800 rounded-t-xl py-4 focus:border-blue-500 focus:outline-none transition-all dark:text-blue-100" />
                      </div>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-[11px] text-blue-500 font-bold uppercase mb-2">Energy Content [MJ]</label>
                          <input type="number" value={energyMJ} onChange={(e) => setEnergyMJ(parseFloat(e.target.value) || 0)} className="w-full text-3xl font-mono font-bold border-b-4 border-blue-200 dark:border-blue-800 bg-slate-100/40 dark:bg-slate-800/40 rounded-t-xl py-3 focus:border-blue-500 focus:outline-none transition-all dark:text-blue-100" />
                        </div>
                        <div>
                          <span className="block text-[11px] text-blue-500 font-bold uppercase mb-2">LCV [MJ/kg]</span>
                          <div className="w-full text-3xl font-mono font-bold border-b-4 border-blue-200 dark:border-blue-800 bg-slate-200/50 dark:bg-slate-800/20 rounded-t-xl py-3 dark:text-blue-300">{formatNum(biofuel.lcv_kg, 1, 1)}</div>
                        </div>
                        <div>
                          <span className="block text-[11px] text-blue-500 font-bold uppercase mb-2">GHG Intensity [gCO2e/MJ]</span>
                          <input type="number" value={biofuel.ghgIntensity} onChange={(e) => handleBioChange('ghgIntensity', e.target.value)} className="w-full text-3xl font-mono font-bold border-b-4 border-blue-200 dark:border-blue-800 bg-slate-100/40 dark:bg-slate-800/40 rounded-t-xl py-3 focus:border-blue-500 focus:outline-none transition-all dark:text-blue-100" />
                        </div>
                      </div>
                    </div>
                    <div className="relative p-5 bg-orange-50/50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/50">
                      <label className="block text-[11px] text-orange-600 font-bold uppercase mb-2 flex items-center gap-1.5"><Flame className="w-3.5 h-3.5" />Fossil Base Mass [MT]</label>
                      <input type="number" step="0.001" value={fossil.mass} onChange={(e) => handleFossilChange('mass', e.target.value)} className="w-full text-3xl font-mono font-bold bg-transparent focus:outline-none text-orange-900 dark:text-orange-100" />
                      <div className="mt-4">
                        <span className="block text-[10px] text-orange-400 font-bold uppercase mb-1">Standard Fuel Type</span>
                        <select value={fossil.type} onChange={(e) => handleFossilChange('type', e.target.value)} className="w-full text-base bg-transparent font-bold border-b border-orange-200 dark:border-orange-800 py-2 focus:outline-none text-slate-800 dark:text-slate-100 cursor-pointer">
                          {Object.values(FossilFuelType).map(type => (
                            <option key={type} value={type} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">{FOSSIL_FUEL_STANDARDS[type].name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Main Analytics Dashboard */}
              <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900 dark:bg-black text-white p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
                    <span className="text-blue-400 text-[10px] font-black uppercase mb-4 block tracking-[0.3em]">Blended Emission Factor (C<sub>f</sub>)</span>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-8xl font-black mb-1 tracking-tighter tabular-nums text-white">{formatNum(results.total.blendedCf, 3, 3)}</h3>
                      <span className="text-xl opacity-60 font-medium text-slate-400 font-mono">gCO<sub>2</sub>eq/g</span>
                    </div>
                    <div className="mt-8 flex items-center gap-2 text-[11px] font-black text-blue-300 bg-blue-500/10 px-5 py-2.5 rounded-xl border border-blue-500/20 w-fit uppercase tracking-widest shadow-inner">
                        <ShieldCheck className="w-4 h-4" /> Valid for CII Reporting
                    </div>
                  </div>

                  <div className={`p-10 rounded-[2.5rem] border shadow-lg flex flex-col justify-between transition-all ${results.biofuel.isSustainabilityCompliant ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50' : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'}`}>
                    <div>
                      <div className="flex items-center justify-between mb-6 text-[11px] font-black uppercase tracking-[0.2em]">
                        <span className={results.biofuel.isSustainabilityCompliant ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>IMO Compliance Status</span>
                        {results.biofuel.isSustainabilityCompliant ? <ShieldCheck className="w-10 h-10 text-emerald-600" /> : <ShieldAlert className="w-10 h-10 text-rose-600" />}
                      </div>
                      <h4 className="text-3xl font-black mb-3 text-slate-800 dark:text-slate-100 tracking-tight">
                        {results.biofuel.isSustainabilityCompliant ? 'Verified Compliant' : 'Non-Compliant Batch'}
                      </h4>
                      <p className="text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                        {results.biofuel.isSustainabilityCompliant 
                          ? `Calculation follows GHG intensity correction guidelines. Corrected C_f: ${formatNum(results.biofuel.cf, 3, 3)}`
                          : `Threshold exceeded. Biofuel emissions default to Fossil C_f: ${formatNum(results.fossil.cf, 3, 3)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 mt-8 pt-6 border-t border-slate-200/50 dark:border-slate-800/50">
                       <input type="checkbox" checked={biofuel.isCertified} onChange={(e) => handleBioChange('isCertified', e.target.checked)} className="w-6 h-6 rounded-lg border-slate-300 text-blue-600 cursor-pointer" />
                       <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Sustainability Proof Provided</span>
                    </div>
                  </div>
                </div>

                {/* Technical Table */}
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
                  <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base flex items-center gap-3">
                      <Settings2 className="w-5 h-5 text-indigo-500" />
                      Technical Reporting Ledger
                    </h3>
                  </div>
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-xs xl:text-sm text-left border-collapse table-fixed min-w-[800px]">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                          <tr className="border-b border-slate-100 dark:border-slate-800">
                            <th className="px-8 py-5">Component</th>
                            <th className="px-4 py-5 text-center">Energy [MJ]</th>
                            <th className="px-4 py-5 text-center">Energy %</th>
                            <th className="px-4 py-5 text-center">C<sub>f</sub></th>
                            <th className="px-8 py-5 text-right">Contribution</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-slate-600">
                          <tr className="dark:text-slate-300 hover:bg-blue-50/20 transition-colors">
                            <td className="px-8 py-6 font-sans font-black text-slate-800 dark:text-slate-100 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" />Biofuel</td>
                            <td className="px-4 py-6 text-center">{results.biofuel.energy.toLocaleString()}</td>
                            <td className="px-4 py-6 text-center">{(results.biofuel.ratio * 100).toFixed(1)}%</td>
                            <td className="px-4 py-6 text-center text-blue-600 font-bold">{formatNum(results.biofuel.cf, 3, 3)}</td>
                            <td className="px-8 py-6 text-right text-slate-400">{formatNum(results.biofuel.contribution, 3, 3)}</td>
                          </tr>
                          <tr className="dark:text-slate-300 hover:bg-orange-50/20 transition-colors">
                            <td className="px-8 py-6 font-sans font-black text-slate-800 dark:text-slate-100 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500" />{fossil.type}</td>
                            <td className="px-4 py-6 text-center">{results.fossil.energy.toLocaleString()}</td>
                            <td className="px-4 py-6 text-center">{(results.fossil.ratio * 100).toFixed(1)}%</td>
                            <td className="px-4 py-6 text-center text-orange-600 font-bold">{formatNum(results.fossil.cf, 3, 3)}</td>
                            <td className="px-8 py-6 text-right text-slate-400">{formatNum(results.fossil.contribution, 3, 3)}</td>
                          </tr>
                        </tbody>
                        <tfoot className="bg-slate-900 dark:bg-black text-white font-bold border-t border-slate-800">
                          <tr>
                            <td className="px-8 py-8 text-sm uppercase tracking-widest">Total Weighted Blend</td>
                            <td colSpan={3}></td>
                            <td className="px-8 py-8 text-right text-3xl font-black text-blue-400 tabular-nums">{formatNum(results.total.blendedCf, 3, 3)}</td>
                          </tr>
                        </tfoot>
                    </table>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Benchmark Analysis */}
                  <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm p-8 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3"><LineChartIcon className="w-5 h-5 text-blue-500" />Benchmark Analysis</h3>
                      <button onClick={() => setIsGraphMaximized(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"><Maximize2 className="w-4 h-4" /></button>
                    </div>
                    <div className="relative w-full h-[250px] mb-8"><EmissionGraph /></div>
                    
                    {/* Verbal Insights Box */}
                    <div className="mt-auto p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                      <div className="flex items-start gap-4">
                        <div className="bg-blue-600 p-2 rounded-lg mt-1 shrink-0">
                          <TrendingDown className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h4 className="font-black text-[10px] text-blue-600 uppercase tracking-[0.2em] mb-2">Impact Analysis</h4>
                          <p className="text-xs xl:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                            Current blend achieves a <span className="text-blue-600 font-bold">{formatNum(insights.reductionVsMGO, 1, 1)}%</span> reduction in CO<sub>2</sub> intensity ($C_f$: {formatNum(insights.intensity, 3, 3)}) compared to standard Marine Gas Oil. 
                            At this delivery volume ({formatNum(totalMass, 1, 1)} MT), the optimized bunker prevents 
                            <span className="text-blue-600 font-bold"> {formatNum(insights.co2SavedVsMGO, 1, 1)} MT </span> 
                            of total carbon emissions relative to a distillate benchmark.
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>
                  
                  {/* What-If Simulation (Recreated from image) */}
                  <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm flex flex-col justify-between transition-all">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3 uppercase tracking-tight">
                        <Sparkles className="w-5 h-5 text-indigo-500" /> WHAT-IF SIMULATION
                      </h3>
                      <span className="bg-indigo-600 text-[10px] font-black text-white px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-indigo-500/30">Fleet Scale-Up</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">HFO (MT)</label>
                        <input type="number" value={simHFO} onChange={(e) => setSimHFO(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-mono font-bold text-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LFO (MT)</label>
                        <input type="number" value={simLFO} onChange={(e) => setSimLFO(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-mono font-bold text-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MGO (MT)</label>
                        <input type="number" value={simMGO} onChange={(e) => setSimMGO(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-mono font-bold text-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none" />
                      </div>
                    </div>

                    <div className="mb-8 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-indigo-500 uppercase flex items-center gap-2 tracking-widest">
                          <Droplets className="w-4 h-4" /> Biofuel Displacement
                        </span>
                        <span className="text-xl font-black font-mono text-slate-800 dark:text-white">{simBioPercent}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={simBioPercent} onChange={(e) => setSimBioPercent(parseInt(e.target.value))} className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      <div className="grid grid-cols-4 gap-2">
                        {[24, 30, 50, 100].map(val => (
                          <button key={val} onClick={() => setSimBioPercent(val)} className={`py-2 px-1 text-[10px] font-black rounded-lg border transition-all ${simBioPercent === val ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-400'}`}>
                            B{val}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Baseline CO2</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black font-mono text-slate-800 dark:text-white">{formatNum(simResults.baselineCO2, 1, 1)}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">MT</span>
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Scenario CO2</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black font-mono text-slate-800 dark:text-white">{formatNum(simResults.scenarioCO2, 1, 1)}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">MT</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-emerald-500 p-8 rounded-[2rem] text-white shadow-2xl shadow-emerald-500/30 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-black uppercase opacity-80 block mb-1 tracking-widest">Total Carbon Savings</span>
                        <span className="text-4xl font-black font-mono">-{formatNum(simResults.savings, 1, 1)} <span className="text-lg opacity-60">MT</span></span>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-black block leading-none">{simResults.reductionPercent.toFixed(1)}%</span>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Reduction</span>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          ) : (
            /* PLACEHOLDER VIEWS */
            <div className="h-full flex flex-col items-center justify-center p-12 text-center">
              <div className="bg-blue-600/10 p-10 rounded-full mb-8">
                {activeTab === 'cii' && <Ship className="w-16 h-16 text-blue-600" />}
                {activeTab === 'eu-ets' && <Globe className="w-16 h-16 text-blue-600" />}
                {activeTab === 'fueleu' && <Waves className="w-16 h-16 text-blue-600" />}
                {activeTab === 'imo-gfi' && <LayoutDashboard className="w-16 h-16 text-blue-600" />}
              </div>
              <h2 className="text-4xl font-black uppercase tracking-tight mb-4">
                {activeTab === 'cii' && 'CII Calculator'}
                {activeTab === 'eu-ets' && 'EU ETS Emissions'}
                {activeTab === 'fueleu' && 'FuelEU Compliance'}
                {activeTab === 'imo-gfi' && 'IMO GFI Reporting'}
                <span className="block text-blue-600 text-lg mt-2 tracking-widest">Coming Soon</span>
              </h2>
              <p className="text-slate-500 max-w-md font-medium leading-relaxed">
                We are currently integrating the latest regulatory updates into this module. 
                Stay tuned for automated carbon intensity and regulatory cost modeling.
              </p>
            </div>
          )}

          {/* SHARED FOOTER */}
          <footer className="max-w-7xl mx-auto mt-16 text-center pb-12 transition-colors">
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-3 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
                <span className="bg-slate-200 dark:bg-slate-800 p-1.5 rounded-md"><Droplets className="w-3.5 h-3.5" /></span>
                <span>© 2026 EmissionCalculator.in</span>
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <p className="text-[9px] text-slate-400 max-w-2xl leading-relaxed opacity-60 px-4">
                  DISCLAIMER: This tool is for estimation purposes only. Results should be verified against official bunker delivery notes and statutory reporting guidelines before final submission to flag states or classification societies.
                </p>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* HIDDEN REPORT TEMPLATE (FOR PDF GENERATION) */}
      <div 
        ref={reportTemplateRef} 
        style={{ display: 'none', width: '1200px', padding: '60px', backgroundColor: '#ffffff', color: '#0f172a' }}
        className="font-['Inter']"
      >
        <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10 mb-10">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-blue-600 p-3 rounded-xl"><Anchor className="w-10 h-10 text-white" /></div>
              <h1 className="text-5xl font-black tracking-tighter uppercase">MARITIME COMPLIANCE REPORT</h1>
            </div>
            <p className="text-slate-400 text-lg font-bold uppercase tracking-widest">Emission Factor Verification • MEPC.1/Circ.905</p>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 text-slate-500 font-bold mb-2 uppercase text-sm">
              <Calendar className="w-4 h-4" /> {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div className="flex items-center justify-end gap-2 text-slate-900 font-black uppercase text-base">
              <Building2 className="w-5 h-5" /> COMPLIANCE DEPT
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-10 mb-12">
          <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white">
            <h2 className="text-blue-400 text-sm font-black uppercase tracking-widest mb-6 border-b border-blue-400/20 pb-4">Consolidated Result</h2>
            <div className="flex items-baseline gap-4">
              <span className="text-[120px] font-black leading-none">{formatNum(results.total.blendedCf, 3, 3)}</span>
              <span className="text-2xl text-slate-400 font-mono">gCO<sub>2</sub>eq/g</span>
            </div>
          </div>
          
          <div className="bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-10 flex flex-col justify-between">
            <div>
              <h2 className="text-slate-500 text-sm font-black uppercase tracking-widest mb-6 border-b border-slate-200 pb-4">Sustainability Assessment</h2>
              <div className="flex items-center gap-6 mb-4">
                {results.biofuel.isSustainabilityCompliant ? <ShieldCheck className="w-16 h-16 text-emerald-600" /> : <ShieldAlert className="w-16 h-16 text-rose-600" />}
                <h3 className="text-4xl font-black uppercase tracking-tight">{results.biofuel.isSustainabilityCompliant ? 'VERIFIED COMPLIANT' : 'NON-COMPLIANT'}</h3>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-slate-900 text-2xl font-black uppercase tracking-tighter mb-6 flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-indigo-600" /> Technical Data Ledger
          </h2>
          <table className="w-full text-lg border-collapse rounded-3xl overflow-hidden shadow-sm">
            <thead>
              <tr className="bg-slate-900 text-white text-left uppercase text-xs font-black tracking-widest">
                <th className="p-8 border-r border-slate-800">Source Component</th>
                <th className="p-8 border-r border-slate-800 text-center">Energy [MJ]</th>
                <th className="p-8 border-r border-slate-800 text-center">Mass [MT]</th>
                <th className="p-8 text-right">Component C<sub>f</sub></th>
              </tr>
            </thead>
            <tbody className="bg-white border-2 border-slate-100">
              <tr className="border-b-2 border-slate-50">
                <td className="p-8 font-black flex items-center gap-3"><Droplets className="w-6 h-6 text-blue-500" /> BIOFUEL</td>
                <td className="p-8 text-center font-mono">{formatNum(results.biofuel.energy, 0, 0)}</td>
                <td className="p-8 text-center font-mono">{formatNum(biofuel.mass, 3, 3)}</td>
                <td className="p-8 text-right font-black text-blue-600 font-mono">{formatNum(results.biofuel.cf, 3, 3)}</td>
              </tr>
              <tr>
                <td className="p-8 font-black flex items-center gap-3"><Flame className="w-6 h-6 text-orange-500" /> {fossil.type} (BASE)</td>
                <td className="p-8 text-center font-mono">{formatNum(results.fossil.energy, 0, 0)}</td>
                <td className="p-8 text-center font-mono">{formatNum(fossil.mass, 3, 3)}</td>
                <td className="p-8 text-right font-black text-orange-600 font-mono">{formatNum(results.fossil.cf, 3, 3)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mb-12">
          <h2 className="text-slate-900 text-2xl font-black uppercase tracking-tighter mb-6 flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-blue-600" /> Emissions Benchmark
          </h2>
          <div className="bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-12">
             <div className="relative h-[400px]">
                <EmissionGraph isReport />
             </div>
          </div>
        </div>

        <div className="mt-auto border-t-2 border-slate-200 pt-10 text-slate-400 text-sm italic">
          <p className="mb-6">This report represents an energy-weighted calculation of the blended emission factor (Cf) based on MEPC.1/Circ.905 guidelines.</p>
          <div className="flex justify-between items-center mt-10">
            <span className="font-black text-xs opacity-40 uppercase tracking-widest flex items-center gap-1.5">
              <Copyright className="w-3.5 h-3.5" /> © 2026 emissioncalculator.in
            </span>
            <div className="flex items-center gap-2">
              <Anchor className="w-5 h-5 opacity-30" />
              <span className="font-black text-xs opacity-30 uppercase">EMISSIONCALCULATOR.IN</span>
            </div>
          </div>
        </div>
      </div>

      {/* GRAPH FULLSCREEN MODAL */}
      {isGraphMaximized && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 bg-slate-900/90 backdrop-blur-md transition-all duration-300">
          <div className="bg-white dark:bg-slate-900 w-full h-full max-w-7xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Full Scenario Comparison</h2>
              </div>
              <button onClick={() => setIsGraphMaximized(false)} className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-full transition-all"><X className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 p-12 overflow-y-auto">
              <EmissionGraph isFull />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;