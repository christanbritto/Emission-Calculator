
import React, { useState, useMemo } from 'react';
import { 
  Ship, 
  Anchor, 
  Zap, 
  Leaf, 
  Settings2, 
  Waves, 
  Gauge, 
  ShieldCheck, 
  ArrowRight,
  TrendingDown,
  Activity,
  Info
} from 'lucide-react';

// --- MARITIME CONSTANTS ---
const SHIP_COEFFICIENTS: Record<string, { a: number; c: number; d1: number; d2: number; d3: number; d4: number }> = {
  'Bulk Carrier': { a: 4745, c: 0.622, d1: 0.86, d2: 0.94, d3: 1.06, d4: 1.18 },
  'Tanker': { a: 5247, c: 0.610, d1: 0.82, d2: 0.93, d3: 1.08, d4: 1.28 },
  'Container': { a: 1984, c: 0.489, d1: 0.83, d2: 0.94, d3: 1.07, d4: 1.19 }
};

const FUEL_FACTORS = {
  HFO: 3.114,
  LFO: 3.151, // VLSFO/LFO
  MGO: 3.206,
  LNG: 2.750
};

const Z_FACTORS: Record<number, number> = {
  2023: 5,
  2024: 7,
  2025: 9,
  2026: 11
};

const CIIFeature: React.FC = () => {
  // --- STATE ---
  const [vesselName, setVesselName] = useState('MV OCEAN VOYAGER');
  const [shipType, setShipType] = useState('Bulk Carrier');
  const [dwt, setDwt] = useState(62000);
  const [distance, setDistance] = useState(60045);
  const [year, setYear] = useState(2024);
  
  const [fuelMass, setFuelMass] = useState({
    HFO: 4500,
    LFO: 800,
    MGO: 250,
    LNG: 0
  });

  const [sim, setSim] = useState({
    biofuelPercent: 0,
    mewisDuct: false,
    airLubrication: false,
    hullCoating: false,
    powerLimit: 0
  });

  // --- CALCULATION LOGIC ---
  const results = useMemo(() => {
    // 1. Calculate Base CO2
    const baseCO2 = (fuelMass.HFO * FUEL_FACTORS.HFO) + 
                    (fuelMass.LFO * FUEL_FACTORS.LFO) + 
                    (fuelMass.MGO * FUEL_FACTORS.MGO) + 
                    (fuelMass.LNG * FUEL_FACTORS.LNG);

    // 2. Calculate Simulated CO2
    let simCO2 = baseCO2;
    
    // Biofuel Impact (Assuming Biofuel has 80% lower lifecycle CO2 for the replaced portion)
    const bioReduction = (sim.biofuelPercent / 100) * 0.8; 
    simCO2 *= (1 - bioReduction);

    // ESD Reductions
    if (sim.mewisDuct) simCO2 *= 0.97;
    if (sim.airLubrication) simCO2 *= 0.95;
    if (sim.hullCoating) simCO2 *= 0.96;
    
    // Power Limitation
    if (sim.powerLimit > 0) simCO2 *= (1 - (sim.powerLimit / 100) * 0.6);

    // 3. Formula: Attained CII = (CO2 * 10^6) / (DWT * Distance)
    const attainedActual = (baseCO2 * 1_000_000) / (dwt * distance);
    const attainedSim = (simCO2 * 1_000_000) / (dwt * distance);

    // 4. Formula: Reference Line & Required
    const coeffs = SHIP_COEFFICIENTS[shipType];
    const refCII = coeffs.a * Math.pow(dwt, -coeffs.c);
    const z = Z_FACTORS[year] || 0;
    const requiredCII = refCII * ((100 - z) / 100);

    // 5. Rating Logic
    const getRating = (cii: number) => {
      const ratio = cii / requiredCII;
      if (ratio <= coeffs.d1) return 'A';
      if (ratio <= coeffs.d2) return 'B';
      if (ratio <= coeffs.d3) return 'C';
      if (ratio <= coeffs.d4) return 'D';
      return 'E';
    };

    return {
      attainedActual,
      attainedSim,
      requiredCII,
      ratingActual: getRating(attainedActual),
      ratingSim: getRating(attainedSim),
      ratioActual: attainedActual / requiredCII,
      ratioSim: attainedSim / requiredCII,
      boundaries: {
        A: coeffs.d1,
        B: coeffs.d2,
        C: coeffs.d3,
        D: coeffs.d4
      }
    };
  }, [fuelMass, dwt, distance, shipType, year, sim]);

  // --- UI HELPERS ---
  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'A': return 'bg-emerald-500';
      case 'B': return 'bg-emerald-400';
      case 'C': return 'bg-yellow-400';
      case 'D': return 'bg-orange-500';
      case 'E': return 'bg-rose-500';
      default: return 'bg-slate-500';
    }
  };

  const formatNum = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="max-w-[1440px] mx-auto animate-in fade-in duration-500 pb-20 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: INPUTS */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Vessel Profile */}
          <section className="bg-white dark:bg-[#151e32] border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] shadow-xl transition-colors">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-600/10 p-2 rounded-xl text-blue-600 dark:text-blue-500"><Anchor className="w-5 h-5" /></div>
              <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-800 dark:text-white">Vessel Profile</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2 block tracking-widest">Vessel Name</label>
                <input type="text" value={vesselName} onChange={e => setVesselName(e.target.value)} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold focus:border-blue-500 outline-none shadow-sm transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2 block tracking-widest">Ship Type</label>
                <select value={shipType} onChange={e => setShipType(e.target.value)} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold focus:border-blue-500 outline-none cursor-pointer">
                  {Object.keys(SHIP_COEFFICIENTS).map(t => <option key={t} value={t} className="bg-white dark:bg-slate-900">{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2 block tracking-widest">Year</label>
                <select value={year} onChange={e => setYear(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold focus:border-blue-500 outline-none cursor-pointer">
                  {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-white dark:bg-slate-900">{y}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2 block tracking-widest">DWT</label>
                <input type="number" value={dwt} onChange={e => setDwt(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold focus:border-blue-500 outline-none shadow-sm" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2 block tracking-widest">Distance (NM)</label>
                <input type="number" value={distance} onChange={e => setDistance(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold focus:border-blue-500 outline-none shadow-sm" />
              </div>
            </div>
          </section>

          {/* Fuel Consumption */}
          <section className="bg-white dark:bg-[#151e32] border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] shadow-xl transition-colors">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-orange-600/10 p-2 rounded-xl text-orange-600 dark:text-orange-500"><Gauge className="w-5 h-5" /></div>
              <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-800 dark:text-white">Fuel Consumption (MT)</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Object.keys(fuelMass).map((f) => (
                <div key={f}>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2 block tracking-widest">{f}</label>
                  <input 
                    type="number" 
                    value={fuelMass[f as keyof typeof fuelMass]} 
                    onChange={e => setFuelMass({...fuelMass, [f]: Number(e.target.value)})} 
                    className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold focus:border-orange-500 outline-none transition-all shadow-sm" 
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Simulation Engine */}
          <section className="bg-white dark:bg-[#151e32] border border-indigo-500/20 dark:border-indigo-500/30 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Zap className="w-24 h-24 text-indigo-500" />
            </div>
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-indigo-600/10 p-2 rounded-xl text-indigo-600 dark:text-indigo-500"><Activity className="w-5 h-5" /></div>
              <h3 className="font-black text-xs uppercase tracking-[0.3em] text-slate-800 dark:text-white">Compliance Simulation</h3>
            </div>

            <div className="space-y-8">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <Leaf className="w-3.5 h-3.5" /> Biofuel Blend Switch
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">{sim.biofuelPercent}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" value={sim.biofuelPercent} 
                  onChange={e => setSim({...sim, biofuelPercent: Number(e.target.value)})}
                  className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" /> Main Engine Power Limit
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">-{sim.powerLimit}%</span>
                </div>
                <input 
                  type="range" min="0" max="25" value={sim.powerLimit} 
                  onChange={e => setSim({...sim, powerLimit: Number(e.target.value)})}
                  className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
                />
              </div>

              <div className="grid grid-cols-1 gap-3 pt-4">
                {[
                  { id: 'mewisDuct', label: 'Mewis Duct Installation (-3%)' },
                  { id: 'airLubrication', label: 'Air Lubrication System (-5%)' },
                  { id: 'hullCoating', label: 'Premium Silicone Hull Coating (-4%)' }
                ].map(opt => (
                  <label key={opt.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-indigo-500 transition-all shadow-sm">
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{opt.label}</span>
                    <input 
                      type="checkbox" 
                      checked={sim[opt.id as keyof typeof sim] as boolean} 
                      onChange={e => setSim({...sim, [opt.id]: e.target.checked})}
                      className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: RESULTS */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main Rating Card */}
          <div className={`${getRatingColor(sim.biofuelPercent > 0 || sim.powerLimit > 0 || sim.hullCoating || sim.airLubrication || sim.mewisDuct ? results.ratingSim : results.ratingActual)} p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden transition-all duration-700`}>
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Ship className="w-40 h-40 text-white" />
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div>
                <span className="text-[11px] font-black text-white/60 uppercase tracking-[0.4em] block mb-4">Official CII Rating</span>
                <h2 className="text-[140px] font-black leading-none tracking-tighter text-white drop-shadow-2xl">
                  {sim.biofuelPercent > 0 || sim.powerLimit > 0 || sim.hullCoating || sim.airLubrication || sim.mewisDuct ? results.ratingSim : results.ratingActual}
                </h2>
                <div className="flex items-center gap-3 mt-4 text-white/80 font-bold uppercase text-[10px] tracking-widest bg-black/10 w-fit px-4 py-2 rounded-full backdrop-blur-sm">
                  <ShieldCheck className="w-4 h-4" /> MEPC.355(78) Compliant
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2rem] border border-white/20 min-w-[280px]">
                <div className="space-y-6">
                  <div>
                    <span className="block text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Attained CII</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white">{formatNum(results.attainedSim)}</span>
                      <span className="text-[10px] text-white/40 font-mono tracking-tighter uppercase">gCO<sub>2</sub>/dwt-nm</span>
                    </div>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div>
                    <span className="block text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Required CII</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white">{formatNum(results.requiredCII)}</span>
                      <span className="text-[10px] text-white/40 font-mono tracking-tighter uppercase">gCO<sub>2</sub>/dwt-nm</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Spectrum Graph */}
          <section className="bg-white dark:bg-[#151e32] border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl transition-colors">
            <h3 className="font-black text-xs uppercase tracking-[0.3em] text-slate-800 dark:text-white mb-10 flex items-center gap-3">
              <Waves className="w-5 h-5 text-blue-500" /> Compliance Spectrum Analysis
            </h3>

            <div className="relative h-12 w-full flex rounded-full overflow-hidden shadow-inner mb-6">
              <div className="h-full bg-emerald-500 flex-1 border-r border-black/5 dark:border-white/5" />
              <div className="h-full bg-emerald-400 flex-1 border-r border-black/5 dark:border-white/5" />
              <div className="h-full bg-yellow-400 flex-1 border-r border-black/5 dark:border-white/5" />
              <div className="h-full bg-orange-500 flex-1 border-r border-black/5 dark:border-white/5" />
              <div className="h-full bg-rose-500 flex-1" />
              
              {/* Markers */}
              {(() => {
                const getPos = (ratio: number) => Math.min(Math.max(((ratio - 0.7) / (1.3 - 0.7)) * 100, 2), 98);
                const posActual = getPos(results.ratioActual);
                const posSim = getPos(results.ratioSim);
                const isSimulating = sim.biofuelPercent > 0 || sim.powerLimit > 0 || sim.hullCoating || sim.airLubrication || sim.mewisDuct;

                return (
                  <>
                    <div 
                      className="absolute top-0 w-1.5 h-full bg-slate-900 dark:bg-white shadow-[0_0_15px_rgba(0,0,0,0.5)] dark:shadow-[0_0_15px_rgba(255,255,255,0.8)] z-20 transition-all duration-700"
                      style={{ left: `${posActual}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-black text-slate-500 uppercase tracking-widest">Current</div>
                    </div>

                    {isSimulating && (
                      <div 
                        className="absolute top-0 w-1.5 h-full bg-indigo-600 dark:bg-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.5)] dark:shadow-[0_0_15px_rgba(129,140,248,0.8)] z-30 transition-all duration-700 animate-pulse"
                        style={{ left: `${posSim}%` }}
                      >
                         <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Projected</div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="flex justify-between px-2 text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">
              <span>A</span>
              <span>B</span>
              <span>C</span>
              <span>D</span>
              <span>E</span>
            </div>
          </section>

          {/* Stats & Insights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#151e32] border border-slate-200 dark:border-slate-800 p-8 rounded-[2rem] flex flex-col justify-between shadow-lg transition-colors">
              <div>
                <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-500">
                  <TrendingDown className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Efficiency Gap</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-xs font-medium leading-relaxed">
                  To reach an <span className="text-slate-900 dark:text-white font-bold">'A' Rating</span>, you need to reduce emissions by another 
                  <span className="text-emerald-600 dark:text-emerald-500 font-black px-1 text-sm">
                    {formatNum(Math.max(0, (results.attainedSim - (results.requiredCII * results.boundaries.A)) / results.attainedSim * 100))}%
                  </span>.
                </p>
              </div>
              <button className="mt-6 flex items-center gap-2 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest group hover:text-blue-700 dark:hover:text-white transition-colors">
                Full Trajectory Analysis <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="bg-white dark:bg-[#151e32] border border-slate-200 dark:border-slate-800 p-8 rounded-[2rem] shadow-lg transition-colors">
               <div className="flex items-center gap-2 mb-6 text-indigo-600 dark:text-indigo-500">
                  <Info className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Compliance Forecast</span>
                </div>
                <div className="space-y-4">
                  {[2024, 2025, 2026].map(y => {
                    const z = Z_FACTORS[y];
                    const req = (results.requiredCII / (1 - (Z_FACTORS[year]/100))) * (1 - (z/100));
                    const rat = results.attainedSim / req;
                    let r = 'E';
                    if (rat <= results.boundaries.A) r = 'A';
                    else if (rat <= results.boundaries.B) r = 'B';
                    else if (rat <= results.boundaries.C) r = 'C';
                    else if (rat <= results.boundaries.D) r = 'D';

                    return (
                      <div key={y} className="flex items-center justify-between text-xs font-bold border-b border-slate-50 dark:border-slate-800 pb-2 last:border-0">
                        <span className="text-slate-500 dark:text-slate-400">{y} Milestone</span>
                        <div className="flex items-center gap-4">
                          <span className="text-slate-800 dark:text-slate-300 font-mono">{formatNum(req)}</span>
                          <span className={`${getRatingColor(r)} w-6 h-6 rounded flex items-center justify-center text-[10px] font-black text-white shadow-sm`}>{r}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
            </div>
          </div>

        </div>
      </div>
      
      <div className="flex items-center gap-4 px-10 text-slate-400 dark:text-slate-600">
        <ShieldCheck className="w-4 h-4" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">
          MARPOL ANNEX VI REGULATION 28 COMPLIANT | CII REPORTING ENGINE v2.1
        </span>
      </div>
    </div>
  );
};

export default CIIFeature;
