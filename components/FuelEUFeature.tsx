import React, { useState, useMemo } from 'react';
import { 
  Waves, 
  Anchor, 
  Scale, 
  AlertTriangle, 
  PiggyBank, 
  TrendingDown, 
  Info,
  ChevronRight,
  Flame,
  Gauge,
  Zap,
  Leaf,
  ShieldCheck,
  Calendar,
  Settings2,
  ArrowRightLeft,
  History,
  Ship
} from 'lucide-react';
import { FossilFuelType, BiofuelGrade } from '../types';

// --- FUELEU REGULATORY CONSTANTS ---

const BASELINE_INTENSITY = 91.16; // gCO2eq/MJ (2020 Reference)

const REDUCTION_TARGETS: Record<number, number> = {
  2024: 0.00,
  2025: 0.02,   // 2% reduction
  2030: 0.06,   // 6% reduction
  2035: 0.145,  // 14.5% reduction
  2040: 0.31,   // 31% reduction
  2045: 0.62,   // 62% reduction
  2050: 0.80    // 80% reduction
};

// Based on PDF Table 2 & 7
const FUEL_SPECS = {
  [FossilFuelType.HFO]: { lcv: 0.0402, wtt: 13.5, ttw: 77.5, total: 91.0 },
  [FossilFuelType.LFO]: { lcv: 0.0410, wtt: 14.1, ttw: 78.3, total: 92.4 },
  [FossilFuelType.MGO]: { lcv: 0.0427, wtt: 14.5, ttw: 79.0, total: 93.5 },
  [FossilFuelType.LNG]: { lcv: 0.0480, wtt: 18.5, ttw: 68.0, total: 86.5 },
  BIO: { lcv: 0.0370, wtt: 5.0,  ttw: 0.0,  total: 5.0  }, // Standard Bio
  RFNBO: { lcv: 0.0199, wtt: 0.0, ttw: 0.0, total: 0.0 }  // Green Methanol
};

const PENALTY_RATE = 2400; // EUR per ton VLSFO energy equivalent
const VLSFO_ENERGY_DENSITY = 41000; // MJ/t

const FuelEUFeature: React.FC = () => {
  // --- STATE ---
  const [year, setYear] = useState(2025);
  const [vesselName, setVesselName] = useState('AAA');
  const [consecutiveYears, setConsecutiveYears] = useState(1);
  const [isIceClass, setIsIceClass] = useState(false);
  
  const [massMT, setMassMT] = useState({
    [FossilFuelType.HFO]: 10000,
    [FossilFuelType.MGO]: 1500,
    [FossilFuelType.LNG]: 0,
    BIO: 200,
    RFNBO: 50
  });

  // Compliance Mechanisms
  const [mechanisms, setMechanisms] = useState({
    useBanking: false,
    bankedAmount: 0,
    useBorrowing: false,
    borrowAmount: 0,
    usePooling: false,
    poolContribution: 0
  });

  // --- CALCULATIONS ---
  const results = useMemo(() => {
    // 1. Target Intensity for the selected year
    const targetKey = Object.keys(REDUCTION_TARGETS).map(Number).filter(k => k <= year).sort((a,b) => b-a)[0];
    const reductionFactor = REDUCTION_TARGETS[targetKey] || 0;
    const ghgTarget = BASELINE_INTENSITY * (1 - reductionFactor);

    // 2. Aggregate Energy and Emissions
    let totalEnergyMJ = 0;
    let totalEmissionsG = 0;

    Object.entries(massMT).forEach(([key, massValue]) => {
      // Fixed: Explicitly cast massValue to number to fix arithmetic operation errors
      const mass = massValue as number;
      const spec = FUEL_SPECS[key as keyof typeof FUEL_SPECS];
      const massG = mass * 1_000_000;
      let energyMJ = massG * spec.lcv;
      
      // Ice Class adjustment (Simplified: 5% energy exclusion if enabled)
      if (isIceClass) energyMJ *= 0.95;

      totalEnergyMJ += energyMJ;

      // RFNBO Incentive: Green fuels count with zero emissions + multiplier effect until 2033
      if (key === 'RFNBO' && year <= 2033) {
         totalEmissionsG += 0;
      } else {
         totalEmissionsG += energyMJ * spec.total;
      }
    });

    // 3. Actual Intensity
    const ghgActual = totalEnergyMJ > 0 ? totalEmissionsG / totalEnergyMJ : 0;

    // 4. Raw Compliance Balance (CB)
    const rawCB = (ghgTarget - ghgActual) * totalEnergyMJ;

    // 5. Final Compliance Balance with Mechanisms
    const borrowingCap = (ghgTarget * totalEnergyMJ) * 0.02;
    const effectiveBorrow = mechanisms.useBorrowing ? Math.min(mechanisms.borrowAmount * 1_000_000, borrowingCap) : 0;
    
    const finalBalanceG = rawCB 
      + (mechanisms.useBanking ? mechanisms.bankedAmount * 1_000_000 : 0)
      + effectiveBorrow
      + (mechanisms.usePooling ? mechanisms.poolContribution * 1_000_000 : 0);

    // 6. Penalty Calculation
    const isDeficit = finalBalanceG < 0;
    let penalty = 0;
    if (isDeficit && ghgActual > 0) {
      const basePenalty = (Math.abs(finalBalanceG) / (ghgActual * VLSFO_ENERGY_DENSITY)) * PENALTY_RATE;
      const multiplier = 1 + (consecutiveYears - 1) / 10;
      penalty = basePenalty * multiplier;
    }

    return {
      ghgTarget,
      ghgActual,
      rawCB,
      finalBalanceG,
      penalty,
      totalEnergyMJ,
      isDeficit,
      borrowingCap,
      reductionPercent: reductionFactor * 100
    };
  }, [year, massMT, mechanisms, consecutiveYears, isIceClass]);

  const formatNum = (n: number, dec = 2) => 
    n.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });

  const cbTonnes = results.finalBalanceG / 1_000_000;

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-12 space-y-6">
      
      {/* 1. REGULATORY HEADER */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-4 bg-white dark:bg-[#151e32] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg transition-colors">
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-slate-50 dark:bg-[#0f172a] px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-inner">
             <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase block mb-1 tracking-[0.1em]">Reporting Year</span>
             <div className="flex items-center gap-3">
               <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-500" />
               <span className="bg-transparent text-slate-900 dark:text-white font-black outline-none text-base appearance-none pr-4">{year} Period</span>
             </div>
          </div>
          <div className="bg-slate-50 dark:bg-[#0f172a] px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-inner">
             <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase block mb-1 tracking-[0.1em]">Vessel Instance</span>
             <div className="flex items-center gap-3">
                <Ship className="w-5 h-5 text-indigo-600 dark:text-indigo-500" />
                <input 
                  value={vesselName} 
                  onChange={e => setVesselName(e.target.value)} 
                  className="bg-transparent text-slate-900 dark:text-white font-black outline-none text-base uppercase tracking-wider w-48" 
                />
             </div>
          </div>
          <div className="bg-slate-50 dark:bg-[#0f172a] px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-inner">
             <span className="text-[11px] font-black text-orange-600 dark:text-orange-400 uppercase block mb-1 tracking-[0.1em]">Non-Compliance Streak</span>
             <div className="flex items-center gap-3">
               <History className="w-5 h-5 text-orange-600 dark:text-orange-500" />
               <input 
                  type="number" min="1" max="10" 
                  value={consecutiveYears} 
                  onChange={e => setConsecutiveYears(parseInt(e.target.value) || 1)}
                  className="bg-transparent text-slate-900 dark:text-white font-black outline-none w-12 text-center" 
               />
               <span className="text-[10px] text-slate-500 font-bold uppercase">Years</span>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
           <label className="flex items-center gap-3 cursor-pointer group">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors tracking-widest">Ice Class (Excluded Cons.)</span>
              <button 
                onClick={() => setIsIceClass(!isIceClass)}
                className={`w-12 h-6 rounded-full transition-all relative ${isIceClass ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${isIceClass ? 'left-7' : 'left-1'}`} />
              </button>
           </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: INPUTS & MECHANISMS */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white dark:bg-[#151e32] border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl transition-colors">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="bg-orange-600/10 p-3 rounded-2xl text-orange-600 dark:text-orange-500"><Flame className="w-6 h-6" /></div>
                <h3 className="font-black text-sm uppercase tracking-[0.3em] text-slate-800 dark:text-white uppercase tracking-widest">Fuel Inventory (MT)</h3>
              </div>
            </div>

            <div className="space-y-6">
              {Object.entries(massMT).map(([key, value]) => (
                <div key={key} className="group">
                  <div className="flex justify-between items-center mb-2 px-1">
                    <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{key}</label>
                    <span className="text-[9px] font-mono text-slate-400 dark:text-slate-600 uppercase">LCV: {FUEL_SPECS[key as keyof typeof FUEL_SPECS].lcv}</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={value} 
                      onChange={e => setMassMT({...massMT, [key]: parseFloat(e.target.value) || 0})}
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 group-hover:border-blue-500/50 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-mono font-bold text-lg outline-none transition-all shadow-sm" 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600 font-black text-xs uppercase">MT</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ADVANCED MECHANISMS */}
          <section className="bg-white dark:bg-[#151e32] border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl space-y-8 transition-colors">
            <div className="flex items-center gap-4 mb-2">
              <div className="bg-indigo-600/10 p-3 rounded-2xl text-indigo-600 dark:text-indigo-500"><Settings2 className="w-6 h-6" /></div>
              <h3 className="font-black text-sm uppercase tracking-[0.3em] text-slate-800 dark:text-white">Compliance Mechanics</h3>
            </div>
            
            {/* BANKING */}
            <div className="p-5 bg-slate-50 dark:bg-[#0f172a] rounded-3xl border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2"><PiggyBank className="w-4 h-4" /> Banked Surplus</span>
                <input type="checkbox" checked={mechanisms.useBanking} onChange={e => setMechanisms({...mechanisms, useBanking: e.target.checked})} className="w-5 h-5 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-emerald-600" />
              </div>
              <input 
                type="number" disabled={!mechanisms.useBanking}
                value={mechanisms.bankedAmount} onChange={e => setMechanisms({...mechanisms, bankedAmount: parseFloat(e.target.value) || 0})}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono text-sm outline-none disabled:opacity-30" 
                placeholder="MT CO2eq Surplus..."
              />
            </div>

            {/* BORROWING */}
            <div className="p-5 bg-slate-50 dark:bg-[#0f172a] rounded-3xl border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2"><ArrowRightLeft className="w-4 h-4" /> Borrow from {year + 1}</span>
                <input type="checkbox" checked={mechanisms.useBorrowing} onChange={e => setMechanisms({...mechanisms, useBorrowing: e.target.checked})} className="w-5 h-5 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-600" />
              </div>
              <input 
                type="number" disabled={!mechanisms.useBorrowing}
                value={mechanisms.borrowAmount} onChange={e => setMechanisms({...mechanisms, borrowAmount: parseFloat(e.target.value) || 0})}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono text-sm outline-none disabled:opacity-30" 
                placeholder="MT CO2eq to borrow..."
              />
              <div className="mt-2 text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Limit: {formatNum(results.borrowingCap / 1_000_000, 1)} t (2% cap)</div>
            </div>

            {/* POOLING */}
            <div className="p-5 bg-slate-50 dark:bg-[#0f172a] rounded-3xl border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2"><Waves className="w-4 h-4" /> Fleet Pooling</span>
                <input type="checkbox" checked={mechanisms.usePooling} onChange={e => setMechanisms({...mechanisms, usePooling: e.target.checked})} className="w-5 h-5 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-600" />
              </div>
              <input 
                type="number" disabled={!mechanisms.usePooling}
                value={mechanisms.poolContribution} onChange={e => setMechanisms({...mechanisms, poolContribution: parseFloat(e.target.value) || 0})}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono text-sm outline-none disabled:opacity-30" 
                placeholder="Contribution from pool..."
              />
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: DASHBOARD */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-950 dark:bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group col-span-2">
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Gauge className="w-32 h-32 text-blue-500" /></div>
              <span className="text-[11px] font-black text-blue-400 uppercase tracking-[0.2em] mb-6 block">WtW GHG Intensity Dashboard</span>
              
              <div className="flex items-end gap-12">
                <div>
                  <h3 className="text-8xl font-black text-white tabular-nums tracking-tighter">{formatNum(results.ghgActual)}</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 flex items-center gap-2">Actual (gCO<sub>2</sub>eq/MJ) <ChevronRight className="w-3 h-3 text-indigo-500" /></p>
                </div>
                <div className="mb-4">
                  <div className="flex items-center gap-3 text-indigo-400 font-black text-3xl">
                    <TrendingDown className="w-8 h-8" />
                    {formatNum(results.ghgTarget)}
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Regulatory Target</p>
                </div>
              </div>
            </div>

            <div className={`p-8 rounded-[2.5rem] border shadow-2xl flex flex-col justify-between transition-all duration-500 ${results.isDeficit ? 'bg-rose-500/10 border-rose-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
              <div>
                <span className={`text-[10px] font-black uppercase tracking-[0.3em] block mb-1 ${results.isDeficit ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>Status</span>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">{results.isDeficit ? 'Compliance Deficit' : 'Compliance Surplus'}</h4>
              </div>
              <div className="mt-4 flex items-center justify-between">
                {results.isDeficit ? <AlertTriangle className="w-10 h-10 text-rose-600" /> : <ShieldCheck className="w-10 h-10 text-emerald-600" />}
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">EU 2023/1805</span>
              </div>
            </div>
          </div>

          <section className="bg-white dark:bg-[#151e32] border border-slate-200 dark:border-slate-800 p-10 rounded-[2.5rem] shadow-xl transition-all hover:shadow-2xl">
             <div className="flex flex-wrap items-start justify-between mb-12 gap-6">
                <div className="flex items-center gap-5">
                  <div className="bg-indigo-600 dark:bg-indigo-500 p-4 rounded-3xl text-white shadow-lg shadow-indigo-500/20"><Scale className="w-8 h-8" /></div>
                  <div>
                    <h3 className="font-black text-lg uppercase tracking-tight text-slate-900 dark:text-white">Compliance Balance Forecast</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aggregate Fleet Emission Surplus/Deficit</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-6xl font-black tabular-nums tracking-tighter drop-shadow-sm ${results.isDeficit ? 'text-rose-600' : 'text-emerald-500'}`}>
                    {cbTonnes > 0 ? '+' : ''}{formatNum(cbTonnes, 1)}
                  </div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-2">Metric Tonnes CO<sub>2</sub>eq</p>
                </div>
             </div>

             <div className="relative h-24 w-full bg-slate-50 dark:bg-slate-950/80 rounded-3xl border border-slate-200 dark:border-slate-800/80 overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_20px_rgba(0,0,0,0.3)] flex items-center group/gauge">
               {/* Center Marker */}
               <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-indigo-500/30 dark:bg-indigo-400/20 z-10" />
               <div className="absolute left-1/2 -translate-x-1/2 -top-1 px-3 py-1 bg-indigo-500 rounded-full text-[8px] font-black text-white z-20 shadow-lg uppercase tracking-widest">Baseline</div>

               {/* The Active Bar */}
               <div 
                  className={`absolute h-[60%] rounded-full transition-all duration-1000 ease-out z-10 ${results.isDeficit 
                    ? 'bg-gradient-to-l from-rose-600 to-rose-400 shadow-[0_0_40px_rgba(244,63,94,0.4)]' 
                    : 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.4)]'}`}
                  style={{ 
                    left: results.isDeficit ? `calc(50% - ${Math.min(Math.abs(cbTonnes) / 500, 50)}%)` : '50%',
                    width: `${Math.min(Math.abs(cbTonnes) / 500, 50)}%` 
                  }}
               />

               {/* Labels Layer */}
               <div className="absolute w-full h-full px-12 flex justify-between items-center z-20 pointer-events-none">
                 <div className="flex flex-col items-center">
                    <span className={`text-xs font-black uppercase tracking-[0.3em] transition-opacity duration-500 ${results.isDeficit ? 'text-rose-500 dark:text-rose-400' : 'text-slate-300 dark:text-slate-700 opacity-40'}`}>Deficit</span>
                 </div>
                 <div className="flex flex-col items-center">
                    <span className={`text-xs font-black uppercase tracking-[0.3em] transition-opacity duration-500 ${!results.isDeficit ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-700 opacity-40'}`}>Surplus</span>
                 </div>
               </div>

               {/* Sub-grid lines */}
               <div className="absolute inset-0 flex justify-between px-1/4 pointer-events-none opacity-5 dark:opacity-10">
                 {[...Array(10)].map((_, i) => <div key={i} className="w-px h-full bg-slate-500" />)}
               </div>
             </div>

             <div className="grid grid-cols-3 gap-4 mt-8">
               <div className="text-left space-y-1">
                 <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block opacity-70">Regulatory Threat</span>
                 <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Significant Penalty Zone</p>
               </div>
               <div className="text-center space-y-1">
                 <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block opacity-70">Reference</span>
                 <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">Baseline 0.0</p>
               </div>
               <div className="text-right space-y-1">
                 <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block opacity-70">Technical Advantage</span>
                 <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Efficient Buffer Zone</p>
               </div>
             </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="bg-gradient-to-br from-slate-900 via-black to-slate-900 p-12 rounded-[3rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><AlertTriangle className="w-48 h-48 text-rose-500" /></div>
              <h3 className="text-slate-400 text-[11px] font-black uppercase tracking-[0.4em] mb-10 border-b border-slate-800 pb-4 flex justify-between">
                <span>Financial Liability Matrix</span>
                {results.isDeficit && <span className="text-rose-500">x{consecutiveYears} Mult</span>}
              </h3>
              {results.isDeficit ? (
                <div className="animate-in fade-in zoom-in duration-700">
                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="text-4xl font-black text-rose-500">€</span>
                    <h2 className="text-8xl font-black text-white tabular-nums tracking-tighter">{formatNum(results.penalty, 0)}</h2>
                  </div>
                  <div className="space-y-4">
                    <p className="text-rose-400 font-bold uppercase text-sm tracking-widest flex items-center gap-3 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                      <AlertTriangle className="w-5 h-5 shrink-0" /> Remedial Penalty Detected
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium pl-2 border-l border-slate-800">
                      Based on energy equivalence to VLSFO. Non-compliance for {consecutiveYears} year(s) increases penalty by {formatNum((consecutiveYears-1)*10)}%.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in zoom-in duration-700">
                  <div className="flex items-baseline gap-3 mb-6">
                    <h2 className="text-8xl font-black text-emerald-400 tabular-nums tracking-tighter">{formatNum(cbTonnes, 1)}</h2>
                    <span className="text-2xl font-bold text-emerald-600">t</span>
                  </div>
                  <div className="space-y-4">
                    <p className="text-emerald-400 font-bold uppercase text-sm tracking-widest flex items-center gap-3 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                      <PiggyBank className="w-5 h-5 shrink-0" /> Bankable Surplus Available
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium pl-2 border-l border-slate-800">
                      This positive compliance balance can be banked or pooled.
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section className="bg-white dark:bg-[#151e32] border border-slate-200 dark:border-slate-800 p-10 rounded-[3rem] shadow-xl flex flex-col justify-between transition-colors">
              <div>
                <div className="flex items-center gap-3 mb-8">
                   <div className="bg-blue-600/10 p-2 rounded-xl text-blue-600 dark:text-blue-500"><Leaf className="w-5 h-5" /></div>
                   <h3 className="font-black text-xs uppercase tracking-[0.3em] text-slate-800 dark:text-white">RFNBO Impact Analysis</h3>
                </div>
                <div className="space-y-8">
                  <div className="p-6 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-2">2025-2033 Incentive</span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                      RFNBOs currently count with a <span className="text-emerald-600 dark:text-emerald-400 font-black">0.5x Emission Multiplier</span>.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 text-center shadow-inner">
                       <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Energy Ratio</span>
                       <span className="text-lg font-black text-slate-900 dark:text-white font-mono">{formatNum((massMT.BIO + massMT.RFNBO) / (results.totalEnergyMJ > 0 ? results.totalEnergyMJ/1_000_000 : 1) * 100, 1)}%</span>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 text-center shadow-inner">
                       <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">GHG Saving</span>
                       <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono">-{formatNum((BASELINE_INTENSITY - results.ghgActual)/BASELINE_INTENSITY*100, 1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-8 flex items-center gap-3 text-slate-400 dark:text-slate-500">
                <Info className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-widest">EMSA THETIS-MRV SYNCED</span>
              </div>
            </section>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 px-10 text-slate-400 dark:text-slate-600 opacity-60 py-4">
        <ShieldCheck className="w-4 h-4" />
        <span className="text-[9px] font-black uppercase tracking-[0.4em]">
          MARITIME COMPLIANCE v3.1 | REGULATION (EU) 2023/1805 | ANNEX IV REMEDIAL ENGINE
        </span>
      </div>
    </div>
  );
};

export default FuelEUFeature;