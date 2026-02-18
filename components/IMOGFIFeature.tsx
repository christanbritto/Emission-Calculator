import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Settings2, 
  Flame, 
  Droplets, 
  Zap, 
  ShieldCheck, 
  ShieldAlert, 
  Euro, 
  TrendingDown, 
  Info,
  Layers,
  Activity,
  Calculator,
  Waves
} from 'lucide-react';
import { ShipType, FossilFuelType } from '../types';
import { 
  GFI_2008_BASELINE, 
  GFI_BASE_TARGET_REDUCTIONS, 
  GFI_DIRECT_COMPLIANCE_REDUCTIONS,
  GFI_REMEDIAL_PRICE_T1,
  GFI_REMEDIAL_PRICE_T2
} from '../constants';

// WtW Emission Factors (gCO2eq/g fuel) - High Fidelity Mock based on Appendix 2
const WTW_EF = {
  [FossilFuelType.HFO]: 3.56, // Combined WtT + TtW
  [FossilFuelType.VLSFO]: 3.58,
  [FossilFuelType.MGO]: 3.62,
  [FossilFuelType.LNG]: 3.05,
  BIO_B100: 0.55 // High-quality verified Bio
};

const LCV = {
  [FossilFuelType.HFO]: 0.0405,
  [FossilFuelType.VLSFO]: 0.0410,
  [FossilFuelType.MGO]: 0.0427,
  [FossilFuelType.LNG]: 0.0480,
  BIO: 0.0370
};

const IMOGFIFeature: React.FC = () => {
  // --- STATE ---
  const [year, setYear] = useState(2028);
  const [vesselName, setVesselName] = useState('MV GREEN HORIZON');
  const [shipType, setShipType] = useState<ShipType>(ShipType.BULK_CARRIER);
  
  const [inventory, setInventory] = useState({
    [FossilFuelType.HFO]: 5000,
    [FossilFuelType.VLSFO]: 1000,
    [FossilFuelType.MGO]: 200,
    [FossilFuelType.LNG]: 0
  });

  const [bioSim, setBioSim] = useState({
    blendPercent: 0, // 0 to 100%
    sourceFuel: FossilFuelType.VLSFO
  });

  // --- CALCULATION ENGINE ---
  const results = useMemo(() => {
    let totalEnergyMJ = 0;
    let totalEmissionsG = 0;

    // 1. Process Fossil Inventory
    Object.entries(inventory).forEach(([type, massValue]) => {
      // Fixed: Explicitly cast massValue to number to fix arithmetic operation errors
      const mass = massValue as number;
      const fuelType = type as FossilFuelType;
      let effectiveMass = mass;
      
      // If this is the fuel being blended with Bio, subtract the bio portion
      if (fuelType === bioSim.sourceFuel) {
        effectiveMass = mass * (1 - (bioSim.blendPercent / 100));
      }

      const energy = effectiveMass * LCV[fuelType] * 1_000_000;
      totalEnergyMJ += energy;
      totalEmissionsG += effectiveMass * WTW_EF[fuelType] * 1_000_000;
    });

    // 2. Process Bio Simulation
    if (bioSim.blendPercent > 0) {
      // Fixed: Explicitly cast inventory access to number to fix arithmetic operation errors
      const bioMass = (inventory[bioSim.sourceFuel] as number) * (bioSim.blendPercent / 100);
      const bioEnergy = bioMass * LCV.BIO * 1_000_000;
      totalEnergyMJ += bioEnergy;
      totalEmissionsG += bioMass * WTW_EF.BIO_B100 * 1_000_000;
    }

    const attainedGFI = totalEnergyMJ > 0 ? totalEmissionsG / totalEnergyMJ : 0;
    
    // 3. Targets
    const baseRed = GFI_BASE_TARGET_REDUCTIONS[year] || 0.30;
    const directRed = GFI_DIRECT_COMPLIANCE_REDUCTIONS[year] || 0.43;
    
    const baseTarget = GFI_2008_BASELINE * (1 - baseRed);
    const directTarget = GFI_2008_BASELINE * (1 - directRed);

    // 4. Compliance & Penalties
    let status: 'COMPLIANT' | 'TIER_1_DEFICIT' | 'TIER_2_DEFICIT' = 'COMPLIANT';
    let penalty = 0;
    let t1Tonnage = 0;
    let t2Tonnage = 0;

    if (attainedGFI > directTarget) {
      if (attainedGFI <= baseTarget) {
        status = 'TIER_1_DEFICIT';
        // Deficit = (Attained - Target) * Total Energy / 10^6 (for tons)
        t1Tonnage = (attainedGFI - directTarget) * totalEnergyMJ / 1_000_000;
        penalty = t1Tonnage * GFI_REMEDIAL_PRICE_T1;
      } else {
        status = 'TIER_2_DEFICIT';
        // Tier 2 penalty logic: 
        // 1. T1 part = (BaseTarget - DirectTarget) * Total Energy
        // 2. T2 part = (Attained - BaseTarget) * Total Energy
        t1Tonnage = (baseTarget - directTarget) * totalEnergyMJ / 1_000_000;
        t2Tonnage = (attainedGFI - baseTarget) * totalEnergyMJ / 1_000_000;
        penalty = (t1Tonnage * GFI_REMEDIAL_PRICE_T1) + (t2Tonnage * GFI_REMEDIAL_PRICE_T2);
      }
    }

    const znzEligible = attainedGFI <= (year >= 2035 ? 14.0 : 19.0);

    return {
      attainedGFI,
      baseTarget,
      directTarget,
      status,
      penalty,
      totalEnergyMJ,
      znzEligible,
      t1Tonnage,
      t2Tonnage,
      // Fixed: Explicitly cast Object.values(inventory) to number[] to resolve reduce function errors
      totalMass: (Object.values(inventory) as number[]).reduce((a, b) => a + b, 0)
    };
  }, [inventory, bioSim, year]);

  const format = (n: number, d = 2) => n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-12 space-y-8">
      
      {/* HEADER SECTION */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 bg-white dark:bg-[#151e32] border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl flex flex-wrap items-center gap-10">
          <div className="space-y-2">
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block">Vessel Account</span>
            <input 
              value={vesselName} 
              onChange={e => setVesselName(e.target.value)} 
              className="text-2xl font-black bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white uppercase w-64"
            />
          </div>
          <div className="h-10 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />
          <div className="space-y-2">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block">Regulatory Period</span>
            <select 
              value={year} 
              onChange={e => setYear(Number(e.target.value))}
              className="text-xl font-black bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white cursor-pointer"
            >
              {[2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035].map(y => (
                <option key={y} value={y} className="bg-white dark:bg-slate-900">{y} Compliance Year</option>
              ))}
            </select>
          </div>
          <div className="ml-auto hidden xl:flex items-center gap-4">
             <div className="text-right">
                <span className="text-[9px] font-black text-slate-400 uppercase block tracking-widest">Calculated On</span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">IMO MEPC 83 Framework</span>
             </div>
             <div className="bg-blue-600/10 p-3 rounded-2xl text-blue-600">
               <ShieldCheck className="w-6 h-6" />
             </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Zap className="w-24 h-24" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 block mb-2">ZNZ Reward Eligibility</span>
          <h4 className="text-3xl font-black">{results.znzEligible ? 'QUALIFIED' : 'NOT ELIGIBLE'}</h4>
          <p className="text-[9px] font-bold opacity-60 mt-3 uppercase tracking-wider">
            Threshold: {year >= 2035 ? '14.0' : '19.0'} gCO2e/MJ
          </p>
        </div>
      </div>

      {/* CORE ANALYSIS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* INPUT COLUMN */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white dark:bg-[#151e32] border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
             <div className="flex items-center gap-3 mb-8">
               <div className="bg-orange-500/10 p-2.5 rounded-xl text-orange-500"><Flame className="w-5 h-5" /></div>
               <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-800 dark:text-white">Energy Inventory (MT)</h3>
             </div>
             <div className="space-y-6">
                {Object.keys(inventory).map((fuel) => (
                  <div key={fuel} className="group">
                    <div className="flex justify-between items-center mb-2 px-1">
                      <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{fuel}</label>
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-600 uppercase">WtW EF: {WTW_EF[fuel as FossilFuelType]}</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={inventory[fuel as FossilFuelType]} 
                        onChange={e => setInventory({...inventory, [fuel]: parseFloat(e.target.value) || 0})}
                        className="w-full bg-slate-50 dark:bg-[#0f172a] border-2 border-slate-100 dark:border-slate-700/50 group-hover:border-orange-500/30 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-mono font-bold text-lg outline-none transition-all" 
                      />
                    </div>
                  </div>
                ))}
             </div>
          </section>

          <section className="bg-gradient-to-br from-slate-900 to-black p-8 rounded-[2.5rem] shadow-2xl border border-slate-800 relative overflow-hidden">
             <div className="absolute -bottom-10 -right-10 opacity-5">
               <Droplets className="w-40 h-40 text-emerald-500" />
             </div>
             <div className="flex items-center gap-3 mb-8">
               <div className="bg-emerald-500/20 p-2.5 rounded-xl text-emerald-400"><Calculator className="w-5 h-5" /></div>
               <h3 className="font-black text-xs uppercase tracking-[0.2em] text-white">Biofuel Stimulation</h3>
             </div>
             <div className="space-y-8">
                <div>
                   <div className="flex justify-between items-center mb-4">
                      <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">Blend Intensity</span>
                      <span className="text-xl font-black text-white font-mono">{bioSim.blendPercent}%</span>
                   </div>
                   <input 
                      type="range" min="0" max="100" value={bioSim.blendPercent} 
                      onChange={e => setBioSim({...bioSim, blendPercent: Number(e.target.value)})}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                   />
                </div>
                <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                   <span className="text-[10px] font-black text-slate-500 uppercase block mb-3 tracking-widest">Base Fuel Offset</span>
                   <select 
                      value={bioSim.sourceFuel} 
                      onChange={e => setBioSim({...bioSim, sourceFuel: e.target.value as FossilFuelType})}
                      className="bg-transparent text-white font-black text-sm outline-none w-full cursor-pointer"
                   >
                      <option value={FossilFuelType.VLSFO} className="bg-slate-900">VLSFO Base</option>
                      <option value={FossilFuelType.MGO} className="bg-slate-900">MGO Base</option>
                      <option value={FossilFuelType.HFO} className="bg-slate-900">HFO Base</option>
                   </select>
                </div>
                <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                   <p className="text-[10px] text-emerald-400 font-bold leading-relaxed">
                     Switching to biofuel blends can reduce your GFI by up to <span className="text-white font-black">80%</span> depending on certified lifecycle intensity.
                   </p>
                </div>
             </div>
          </section>
        </div>

        {/* RESULTS COLUMN */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#151e32] border border-slate-200 dark:border-slate-800 p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-5">
                 <BarChart3 className="w-32 h-32 text-indigo-500" />
               </div>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block">Attained GHG Fuel Intensity</span>
               <div className="flex items-baseline gap-3">
                 <h2 className="text-8xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">{format(results.attainedGFI)}</h2>
                 <span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">gCO<sub>2</sub>e/MJ</span>
               </div>
               <div className={`mt-8 px-6 py-2.5 rounded-xl border w-fit font-black text-[11px] uppercase tracking-[0.15em] flex items-center gap-2 ${results.status === 'COMPLIANT' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-rose-500/10 border-rose-500/20 text-rose-600'}`}>
                 {results.status === 'COMPLIANT' ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                 Status: {results.status.replace(/_/g, ' ')}
               </div>
            </div>

            <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl text-white flex flex-col justify-between border border-slate-800">
               <div>
                 <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4 block">Total Remedial Liability</span>
                 <div className="flex items-baseline gap-2">
                   <span className="text-4xl font-black text-blue-400">$</span>
                   <h2 className="text-7xl font-black tracking-tighter tabular-nums">{format(results.penalty, 0)}</h2>
                 </div>
               </div>
               <div className="mt-8 space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest border-b border-white/10 pb-3">
                    <span className="text-slate-500">Tier 1 Units</span>
                    <span className="text-white">{format(results.t1Tonnage, 0)} t</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-500">Tier 2 Units</span>
                    <span className="text-white">{format(results.t2Tonnage, 0)} t</span>
                  </div>
               </div>
            </div>
          </div>

          {/* GFI SPECTRUM GAUGE */}
          <section className="bg-white dark:bg-[#151e32] border border-slate-200 dark:border-slate-800 p-10 rounded-[2.5rem] shadow-xl">
             <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-600/10 p-3 rounded-2xl text-indigo-600"><Waves className="w-6 h-6" /></div>
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-[0.3em] text-slate-800 dark:text-white">GFI Two-Tier Spectrum Analysis</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Attained vs MEPC 83 Benchmarks</p>
                  </div>
                </div>
                <div className="text-right">
                   <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Compliance Year</span>
                   <div className="text-xl font-black text-slate-900 dark:text-white">{year} Period</div>
                </div>
             </div>

             <div className="relative h-24 w-full bg-slate-50 dark:bg-slate-950/50 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center px-4">
                {/* Zones Visualization */}
                <div className="absolute inset-0 flex">
                   <div className="h-full bg-emerald-500/10 border-r border-emerald-500/20 flex-1" /> {/* Compliant Zone */}
                   <div className="h-full bg-orange-500/10 border-r border-orange-500/20 flex-1" /> {/* T1 Zone */}
                   <div className="h-full bg-rose-500/10 flex-1" /> {/* T2 Zone */}
                </div>

                {/* Target Lines */}
                {(() => {
                  const min = results.directTarget * 0.7;
                  const max = results.baseTarget * 1.3;
                  const range = max - min;
                  const getX = (val: number) => ((val - min) / range) * 100;

                  return (
                    <>
                      {/* Direct Target (The Goal) */}
                      <div className="absolute h-full w-[2px] bg-emerald-500 z-10 shadow-[0_0_15px_rgba(16,185,129,0.5)]" style={{ left: `${getX(results.directTarget)}%` }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Direct Target: {format(results.directTarget, 1)}</div>
                      </div>

                      {/* Base Target (The Ceiling) */}
                      <div className="absolute h-full w-[2px] bg-orange-500 z-10 shadow-[0_0_15px_rgba(249,115,22,0.5)]" style={{ left: `${getX(results.baseTarget)}%` }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-black text-orange-600 uppercase tracking-tighter">Base Target: {format(results.baseTarget, 1)}</div>
                      </div>

                      {/* Vessel Position Marker */}
                      <div 
                        className="absolute h-12 w-1.5 bg-slate-900 dark:bg-white rounded-full z-20 shadow-2xl transition-all duration-1000 ease-out flex flex-col items-center" 
                        style={{ left: `${getX(results.attainedGFI)}%` }}
                      >
                         <div className="absolute -bottom-10 whitespace-nowrap bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg">
                           Attained: {format(results.attainedGFI, 2)}
                         </div>
                      </div>
                    </>
                  );
                })()}
             </div>

             <div className="grid grid-cols-3 gap-4 mt-12">
               <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Zone 1: Compliant</span>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">No remedial units required. Eligible for banking surplus into future reporting periods.</p>
               </div>
               <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-2 block">Zone 2: Tier 1 Deficit</span>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">Mandatory purchase of T1 Remedial Units at <span className="text-slate-900 dark:text-white font-bold">$100/tCO2e</span>.</p>
               </div>
               <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-2 block">Zone 3: Tier 2 Deficit</span>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">Significant exposure. Tier 2 Remedial Units priced at <span className="text-slate-900 dark:text-white font-bold">$380/tCO2e</span>.</p>
               </div>
             </div>
          </section>

          {/* INSIGHTS FOOTER */}
          <div className="flex items-center gap-6 p-8 bg-blue-50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-900/50">
             <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-500/20">
               <Info className="w-6 h-6" />
             </div>
             <div>
               <h4 className="font-black text-xs uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-1">Decarbonization Roadmap</h4>
               <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                 To reach compliance for {year}, you require a GFI reduction of <span className="text-slate-900 dark:text-white font-black">{(100 - (results.directTarget/GFI_2008_BASELINE*100)).toFixed(1)}%</span> from the 2008 baseline. 
                 {results.status !== 'COMPLIANT' && ` Current simulation shows a shortfall of ${format(results.attainedGFI - results.directTarget, 2)} gCO2e/MJ.`}
               </p>
             </div>
          </div>
        </div>
      </div>

      {/* REGULATORY SEAL */}
      <div className="flex items-center gap-4 px-10 text-slate-400 dark:text-slate-600 opacity-60 py-6">
        <ShieldCheck className="w-4 h-4" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">
          MARPOL ANNEX VI | MEPC.391(81) LCA GUIDELINES | EMISSIONS TRADING SYSTEM v2.4
        </span>
      </div>
    </div>
  );
};

export default IMOGFIFeature;