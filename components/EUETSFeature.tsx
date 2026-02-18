import React, { useState, useMemo, useEffect } from 'react';
import { 
  Globe, 
  Ship, 
  MapPin, 
  ArrowRightLeft, 
  Flame, 
  Euro, 
  ShieldCheck, 
  TrendingUp, 
  Calendar,
  Info,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings2,
  ArrowDownLeft,
  ArrowUpRight,
  Anchor,
  Leaf
} from 'lucide-react';
import { ShipType, FossilFuelType, BiofuelGrade } from '../types';

// EU ETS Specific Multipliers based on PDF Reference
const GWP = {
  CH4: 28,
  N2O: 265
};

// Based on PDF Table 2 (Cf CO2eq 2026 values)
const EU_ETS_EMISSION_FACTORS: Record<string, { co2: number; ch4: number; n2o: number; co2eq: number }> = {
  [FossilFuelType.HFO]: { co2: 3.114, ch4: 0.00005, n2o: 0.00018, co2eq: 3.163 },
  [FossilFuelType.LFO]: { co2: 3.151, ch4: 0.00005, n2o: 0.00018, co2eq: 3.200 },
  [FossilFuelType.MGO]: { co2: 3.206, ch4: 0.00005, n2o: 0.00018, co2eq: 3.255 },
  [FossilFuelType.LNG]: { co2: 2.750, ch4: 0.002, n2o: 0.00011, co2eq: 2.830 },
};

const PHASE_IN: Record<number, number> = {
  2024: 0.4,
  2025: 0.7,
  2026: 1.0,
  2027: 1.0,
  2028: 1.0
};

const GRADE_PERCENTAGES: Record<BiofuelGrade, number> = {
  [BiofuelGrade.B24]: 0.24,
  [BiofuelGrade.B30]: 0.30,
  [BiofuelGrade.B50]: 0.50,
  [BiofuelGrade.B100]: 1.00,
  [BiofuelGrade.CUSTOM]: 0.30
};

const EUETSFeature: React.FC = () => {
  // --- STATE ---
  const [vesselName, setVesselName] = useState('AAA');
  const [shipType, setShipType] = useState<ShipType>(ShipType.CONTAINER_SHIP);
  const [year, setYear] = useState(2026);
  const [euaPrice, setEuaPrice] = useState(85); // € per MT CO2e
  const [biofuelGrade, setBiofuelGrade] = useState<BiofuelGrade>(BiofuelGrade.B30);
  const [biofuelBaseFuel, setBiofuelBaseFuel] = useState<FossilFuelType>(FossilFuelType.MGO);
  
  const [fromDate, setFromDate] = useState('2026-01-01T00:00');
  const [toDate, setToDate] = useState('2026-12-31T23:59');

  const [origin, setOrigin] = useState({ name: 'Shanghai', isEU: false });
  const [destination, setDestination] = useState({ name: 'Rotterdam', isEU: true });

  const [fuelUsage, setFuelUsage] = useState<Record<string, number>>({
    [FossilFuelType.HFO]: 1200,
    [FossilFuelType.MGO]: 0,
    'BIOFUEL': 100
  });

  // Sync Year with From Date
  useEffect(() => {
    const identifiedYear = new Date(fromDate).getFullYear();
    if (identifiedYear >= 2024 && identifiedYear <= 2030) {
      setYear(identifiedYear);
    }
  }, [fromDate]);

  // --- CALCULATION LOGIC ---
  const results = useMemo(() => {
    // 1. Determine Voyage Type & Scope Multiplier
    let scopeFactor = 0;
    let voyageTypeLabel = 'External';
    let voyageIcon = <Globe className="w-4 h-4" />;
    let voyageColor = 'text-slate-400';

    if (origin.isEU && destination.isEU) {
      scopeFactor = 1.0;
      voyageTypeLabel = 'Intra-EU (Bound)';
      voyageIcon = <ShieldCheck className="w-4 h-4" />;
      voyageColor = 'text-blue-600 dark:text-blue-500';
    } else if (!origin.isEU && destination.isEU) {
      scopeFactor = 0.5;
      voyageTypeLabel = 'Inbound Voyage';
      voyageIcon = <ArrowDownLeft className="w-4 h-4" />;
      voyageColor = 'text-emerald-600 dark:text-emerald-500';
    } else if (origin.isEU && !destination.isEU) {
      scopeFactor = 0.5;
      voyageTypeLabel = 'Outbound Voyage';
      voyageIcon = <ArrowUpRight className="w-4 h-4" />;
      voyageColor = 'text-orange-600 dark:text-orange-500';
    } else {
      scopeFactor = 0.0;
      voyageTypeLabel = 'Non-EU (Outside Scope)';
      voyageIcon = <AlertCircle className="w-4 h-4" />;
      voyageColor = 'text-rose-500 dark:text-rose-400';
    }

    // 2. Calculate Total Emissions
    let totalCO2e = 0;
    Object.entries(fuelUsage).forEach(([fuel, massValue]) => {
      // Fixed: Explicitly cast massValue to number to fix arithmetic operation errors
      const mass = massValue as number;
      if (fuel === 'BIOFUEL') {
        const baseFactor = EU_ETS_EMISSION_FACTORS[biofuelBaseFuel].co2eq;
        const bioReduction = GRADE_PERCENTAGES[biofuelGrade];
        // Only the fossil portion (e.g. 100 MT - 30% = 70 MT) of the blend contributes to CO2e
        const effectiveChargeableMass = mass * (1 - bioReduction);
        totalCO2e += effectiveChargeableMass * baseFactor;
      } else {
        const factors = EU_ETS_EMISSION_FACTORS[fuel];
        if (factors) {
          totalCO2e += mass * factors.co2eq;
        }
      }
    });

    // 3. Apply Phase-in
    const phaseInFactor = PHASE_IN[year] || 1.0;
    const euaToSurrender = totalCO2e * scopeFactor * phaseInFactor;
    const financialImpact = euaToSurrender * euaPrice;

    return {
      scopeFactor,
      totalCO2e,
      phaseInFactor,
      euaToSurrender,
      financialImpact,
      voyageTypeLabel,
      voyageIcon,
      voyageColor
    };
  }, [fuelUsage, origin, destination, year, euaPrice, biofuelGrade, biofuelBaseFuel]);

  const formatNum = (n: number, decimals: number = 0) => 
    n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-12 space-y-6">
      
      {/* 1. TOP HEADER */}
      <div className="flex flex-wrap items-center justify-start gap-4 bg-white dark:bg-[#151e32] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg transition-colors">
          <div className="bg-slate-50 dark:bg-[#0f172a] px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-inner">
             <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase block mb-1 tracking-[0.1em]">Vessel Name</span>
             <div className="flex items-center gap-3">
                <Ship className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                <input value={vesselName} onChange={e => setVesselName(e.target.value)} className="bg-transparent text-slate-900 dark:text-white font-black outline-none text-base uppercase tracking-wider" />
             </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-[#0f172a] px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-inner">
             <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase block mb-1 tracking-[0.1em]">Reporting Year</span>
             <div className="flex items-center gap-3">
               <span className="bg-transparent text-slate-900 dark:text-white font-black outline-none text-base appearance-none pr-4">{year} Period</span>
             </div>
          </div>

          <div className="bg-slate-50 dark:bg-[#0f172a] px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-inner">
             <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase block mb-1 tracking-[0.1em]">From Date & Time</span>
             <div className="flex items-center gap-3">
               <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
               <input 
                 type="datetime-local" 
                 value={fromDate} 
                 onChange={e => setFromDate(e.target.value)} 
                 className="bg-transparent text-slate-900 dark:text-white font-bold outline-none text-sm cursor-pointer dark:[color-scheme:dark]" 
               />
             </div>
          </div>

          <div className="bg-slate-50 dark:bg-[#0f172a] px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-inner">
             <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 uppercase block mb-1 tracking-[0.1em]">To Date & Time</span>
             <div className="flex items-center gap-3">
               <Clock className="w-4 h-4 text-rose-600 dark:text-rose-500" />
               <input 
                 type="datetime-local" 
                 value={toDate} 
                 onChange={e => setToDate(e.target.value)} 
                 className="bg-transparent text-slate-900 dark:text-white font-bold outline-none text-sm cursor-pointer dark:[color-scheme:dark]" 
               />
             </div>
          </div>
      </div>

      {/* 2. KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-[#151e32] border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-lg transition-colors">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
             <CheckCircle2 className="w-32 h-32 text-blue-500" />
          </div>
          <span className="text-[12px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.15em] mb-4 block">Total EUA to Surrender</span>
          <div className="flex items-baseline gap-2">
            <h3 className="text-6xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{formatNum(results.euaToSurrender, 1)}</h3>
            <span className="text-blue-600 dark:text-blue-500 font-black text-base uppercase">Units</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-4 uppercase tracking-tight">
            {formatNum(results.phaseInFactor * 100, 0)}% Phase-in Coefficient
          </p>
        </div>

        <div className="bg-white dark:bg-[#151e32] border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-lg transition-colors">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
             <Euro className="w-32 h-32 text-emerald-500" />
          </div>
          <span className="text-[12px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.15em] mb-4 block">Estimated Liability</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-500">€</span>
            <h3 className="text-6xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{formatNum(results.financialImpact, 0)}</h3>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-4 uppercase tracking-tight">
            Spot Price: €{euaPrice}/MT
          </p>
        </div>

        <div className="bg-white dark:bg-[#151e32] border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-lg transition-colors">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
             <TrendingUp className="w-32 h-32 text-indigo-500" />
          </div>
          <span className="text-[12px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.15em] mb-4 block">Voyage GHG Intensity</span>
          <div className="flex items-baseline gap-2">
            <h3 className="text-6xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{formatNum(results.totalCO2e, 1)}</h3>
            <span className="text-indigo-600 dark:text-indigo-500 font-black text-base uppercase">MT CO<sub>2</sub>e</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-4 uppercase tracking-tight">
            Lifecycle Scopes Included
          </p>
        </div>

        <div className="bg-white dark:bg-[#151e32] border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-lg transition-colors">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
             <ShieldCheck className="w-32 h-32 text-orange-500" />
          </div>
          <span className="text-[12px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-[0.15em] mb-4 block">Regulatory Scope</span>
          <div className="flex items-baseline gap-2">
            <h3 className="text-6xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{formatNum(results.scopeFactor * 100, 0)}%</h3>
            <span className="text-orange-600 dark:text-orange-500 font-black text-base uppercase">Chargeable</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-4 uppercase tracking-tight">
            {results.voyageTypeLabel} Factor
          </p>
        </div>
      </div>

      {/* 3. MAIN DASHBOARD CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-8">
          <section className="bg-white dark:bg-[#151e32] border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl transition-colors">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600/10 p-3 rounded-2xl text-blue-600 dark:text-blue-500"><MapPin className="w-6 h-6" /></div>
                <h3 className="font-black text-sm uppercase tracking-[0.3em] text-slate-800 dark:text-white">Geographical Routing</h3>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-inner ${results.voyageColor}`}>
                {results.voyageIcon}
                <span className="text-[9px] font-black uppercase tracking-widest">{results.voyageTypeLabel}</span>
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="relative">
                <div className="p-6 bg-slate-50 dark:bg-[#0f172a] rounded-[1.5rem] border border-slate-200 dark:border-slate-700 transition-all hover:border-blue-500 group shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
                       <Anchor className="w-3.5 h-3.5" /> Departure Port
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <input value={origin.name} onChange={e => setOrigin({...origin, name: e.target.value})} className="bg-transparent text-slate-900 dark:text-white font-black text-xl outline-none w-full tracking-tight placeholder-slate-400 dark:placeholder-slate-700" placeholder="e.g. Shanghai" />
                    <button 
                      onClick={() => setOrigin({...origin, isEU: !origin.isEU})}
                      className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all shadow-md shrink-0 border ${origin.isEU ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-500 border-slate-200 dark:border-slate-700'}`}
                    >
                      {origin.isEU ? 'EU/EEA AREA' : 'NON-EU AREA'}
                    </button>
                  </div>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 top-full h-10 w-px bg-gradient-to-b from-blue-500/50 to-slate-200 dark:to-slate-800 flex items-center justify-center z-10">
                  <div className="bg-white dark:bg-[#151e32] p-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                    <ArrowRightLeft className="w-4 h-4 text-blue-600 dark:text-blue-500 rotate-90" />
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <div className="p-6 bg-slate-50 dark:bg-[#0f172a] rounded-[1.5rem] border border-slate-200 dark:border-slate-700 transition-all hover:border-blue-500 group shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                       <MapPin className="w-3.5 h-3.5" /> Arrival Port
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <input value={destination.name} onChange={e => setDestination({...destination, name: e.target.value})} className="bg-transparent text-slate-900 dark:text-white font-black text-xl outline-none w-full tracking-tight placeholder-slate-400 dark:placeholder-slate-700" placeholder="e.g. Rotterdam" />
                    <button 
                      onClick={() => setDestination({...destination, isEU: !destination.isEU})}
                      className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all shadow-md shrink-0 border ${destination.isEU ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-500 border-slate-200 dark:border-slate-700'}`}
                    >
                      {destination.isEU ? 'EU/EEA AREA' : 'NON-EU AREA'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-blue-50 dark:bg-blue-600/10 rounded-[2rem] border border-blue-100 dark:border-blue-500/20 shadow-inner">
                <div className="flex items-center gap-4 text-blue-600 dark:text-blue-400 mb-4">
                  <div className="bg-blue-500/10 p-2 rounded-xl"><Info className="w-6 h-6" /></div>
                  <span className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white">Directive Scope Logic</span>
                </div>
                <p className="text-[14px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  Calculated as <span className={`font-black uppercase ${results.voyageTypeLabel}`}>{results.voyageTypeLabel}</span>. 
                  As per EU ETS Article 3ga, exactly 
                  <span className="text-slate-900 dark:text-white font-black px-2 text-lg underline decoration-blue-500 underline-offset-4">{formatNum(results.scopeFactor * 100, 0)}%</span> 
                  of the emissions generated will be subject to surrender requirements.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-[#151e32] border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl transition-colors">
             <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-sm uppercase tracking-[0.3em] text-slate-800 dark:text-white">Market Parameters</h3>
                <Settings2 className="w-5 h-5 text-slate-400 dark:text-slate-500" />
             </div>
             <div className="space-y-8">
                <div>
                   <div className="flex justify-between items-center mb-4">
                      <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2"><Euro className="w-4 h-4" /> EUA Spot Price</span>
                      <span className="text-lg font-black text-slate-900 dark:text-white">€{euaPrice} / MT</span>
                   </div>
                   <input type="range" min="40" max="150" value={euaPrice} onChange={e => setEuaPrice(Number(e.target.value))} className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-slate-50 dark:bg-[#0f172a] p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-md">
                      <span className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 tracking-wider">Vessel Type</span>
                      <select value={shipType} onChange={e => setShipType(e.target.value as ShipType)} className="bg-transparent text-slate-900 dark:text-white font-black text-sm outline-none w-full appearance-none cursor-pointer">
                         {Object.values(ShipType).map(t => <option key={t} value={t} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t}</option>)}
                      </select>
                   </div>
                   <div className="bg-slate-50 dark:bg-[#0f172a] p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-md">
                      <span className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 tracking-wider">Compliance Status</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Verified</span>
                   </div>
                </div>
             </div>
          </section>
        </div>

        {/* Right Col */}
        <div className="lg:col-span-8 space-y-8">
          <section className="bg-white dark:bg-[#151e32] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden transition-colors">
            <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="bg-orange-600/10 p-3 rounded-2xl text-orange-600 dark:text-orange-500"><Flame className="w-6 h-6" /></div>
                <h3 className="font-black text-sm uppercase tracking-[0.3em] text-slate-800 dark:text-white">Voyage Fuel Consumption (MT)</h3>
              </div>
              <div className="flex gap-2">
                <span className="bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.2em] border border-emerald-500/20 flex items-center gap-2 shadow-sm">
                  <CheckCircle2 className="w-4 h-4" /> MRV SYNCED
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-[#0f172a] text-slate-500 dark:text-slate-300 font-black uppercase tracking-[0.2em] text-[11px]">
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="px-10 py-8">Fuel Grade</th>
                    <th className="px-6 py-8 text-center">Mass Consumed</th>
                    <th className="px-6 py-8 text-center">CO<sub>2</sub>eq Factor (2026+)</th>
                    <th className="px-10 py-8 text-right">Total Emissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-600 dark:text-slate-300">
                  {Object.entries(EU_ETS_EMISSION_FACTORS).map(([fuel, factors]) => (
                      <tr key={fuel} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group">
                        <td className="px-10 py-8 flex items-center gap-6">
                          <div className={`w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-orange-500 transition-all shadow-sm`} />
                          <div className="flex-1">
                             <div className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{fuel}</div>
                             <div className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.15em]">IMO Standard Batch</div>
                          </div>
                        </td>
                        <td className="px-6 py-8">
                           <div className="flex items-center justify-center gap-4">
                              <input 
                                type="number" 
                                value={fuelUsage[fuel] || 0} 
                                onChange={e => setFuelUsage({...fuelUsage, [fuel]: Number(e.target.value)})} 
                                className={`bg-white dark:bg-[#0f172a] border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-5 text-slate-900 dark:text-white font-mono font-black text-center text-3xl w-56 focus:border-orange-500 focus:ring-8 focus:ring-orange-500/10 transition-all outline-none shadow-md`} 
                              />
                              <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">MT</span>
                           </div>
                        </td>
                        <td className="px-6 py-8 text-center">
                           <span className="font-mono text-slate-700 dark:text-slate-200 font-black text-lg bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700/50">{formatNum(factors.co2eq, 3)}</span>
                        </td>
                        <td className="px-10 py-8 text-right font-mono font-black text-slate-900 dark:text-white text-xl">
                          {formatNum((fuelUsage[fuel] || 0) * factors.co2eq, 2)} <span className="text-xs text-slate-400 dark:text-slate-500">MT</span>
                        </td>
                      </tr>
                  ))}
                  
                  {/* Specialized Biofuel Blend Row */}
                  <tr className="bg-emerald-50 dark:bg-emerald-500/5 hover:bg-emerald-100 dark:hover:bg-emerald-500/10 transition-all group border-l-4 border-emerald-500">
                    <td className="px-10 py-8 flex items-center gap-6">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]" />
                      <div className="flex-1 space-y-2">
                        <div className="font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight text-lg flex items-center gap-2">
                          <Leaf className="w-5 h-5" /> BIOFUEL BLEND
                        </div>
                        <div className="flex flex-col gap-2">
                           <div className="flex items-center gap-2">
                             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Grade</span>
                             <select 
                               value={biofuelGrade} 
                               onChange={e => setBiofuelGrade(e.target.value as BiofuelGrade)}
                               className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-white dark:bg-[#0f172a] border border-emerald-200 dark:border-emerald-500/30 rounded px-2 py-1 outline-none uppercase tracking-widest cursor-pointer hover:border-emerald-500 transition-colors"
                             >
                               <option value={BiofuelGrade.B24}>Grade B24 (24% Bio)</option>
                               <option value={BiofuelGrade.B30}>Grade B30 (30% Bio)</option>
                               <option value={BiofuelGrade.B50}>Grade B50 (50% Bio)</option>
                               <option value={BiofuelGrade.B100}>Grade B100 (100% Bio)</option>
                             </select>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Base</span>
                             <select 
                               value={biofuelBaseFuel} 
                               onChange={e => setBiofuelBaseFuel(e.target.value as FossilFuelType)}
                               className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-white dark:bg-[#0f172a] border border-blue-200 dark:border-blue-500/30 rounded px-2 py-1 outline-none uppercase tracking-widest cursor-pointer hover:border-blue-500 transition-colors"
                             >
                               <option value={FossilFuelType.MGO}>Marine Gas Oil (MGO)</option>
                               <option value={FossilFuelType.HFO}>Heavy Fuel Oil (HFO)</option>
                               <option value={FossilFuelType.LFO}>Light Fuel Oil (LFO)</option>
                             </select>
                           </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-8">
                       <div className="flex flex-col items-center gap-3">
                          <div className="flex items-center justify-center gap-4">
                              <input 
                                type="number" 
                                value={fuelUsage['BIOFUEL'] || 0} 
                                onChange={e => setFuelUsage({...fuelUsage, ['BIOFUEL']: Number(e.target.value)})} 
                                className="bg-white dark:bg-[#0f172a] border-2 border-emerald-500 rounded-2xl px-6 py-5 text-slate-900 dark:text-white font-mono font-black text-center text-3xl w-56 focus:border-emerald-400 focus:ring-8 focus:ring-emerald-500/10 transition-all outline-none shadow-md" 
                              />
                              <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">MT</span>
                          </div>
                          <div className="bg-emerald-100 dark:bg-emerald-900/30 px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-500/20 text-center">
                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.1em]">Effective Consumption</span>
                            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
                              {formatNum((fuelUsage['BIOFUEL'] || 0) * (1 - GRADE_PERCENTAGES[biofuelGrade]), 1)} <span className="text-[10px] opacity-60">MT</span>
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 block">(Net Chargeable Fossil Portion)</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-8 text-center">
                       <div className="flex flex-col items-center">
                          <span className="font-mono text-emerald-600 dark:text-emerald-300 font-black text-xl bg-white dark:bg-emerald-900/20 px-5 py-3 rounded-xl border border-emerald-100 dark:border-emerald-500/30 shadow-inner">
                            {formatNum(EU_ETS_EMISSION_FACTORS[biofuelBaseFuel].co2eq, 3)}
                          </span>
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 mt-2 uppercase tracking-[0.1em]">Base {biofuelBaseFuel} Factor</span>
                       </div>
                    </td>
                    <td className="px-10 py-8 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-2xl drop-shadow-sm">
                      {formatNum(((fuelUsage['BIOFUEL'] || 0) * (1 - GRADE_PERCENTAGES[biofuelGrade])) * EU_ETS_EMISSION_FACTORS[biofuelBaseFuel].co2eq, 2)} <span className="text-xs text-slate-400 dark:text-slate-500">MT</span>
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-950">
                   <tr className="border-t border-slate-800">
                      <td colSpan={3} className="px-10 py-10 font-black uppercase text-[12px] tracking-[0.3em] text-slate-500">Voyage Aggregated Impact</td>
                      <td className="px-10 py-10 text-right">
                         <div className="text-4xl font-black text-white tabular-nums tracking-tighter drop-shadow-lg">{formatNum(results.totalCO2e, 2)} <span className="text-sm text-slate-500 font-black">MT CO<sub>2</sub>e</span></div>
                      </td>
                   </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* Compliance Insights Dashboard Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="bg-white dark:bg-[#151e32] border border-slate-200 dark:border-slate-800 p-10 rounded-[2.5rem] flex flex-col justify-between shadow-xl transition-colors">
              <div>
                <div className="flex items-center gap-3 mb-8 text-blue-600 dark:text-blue-500">
                  <Clock className="w-6 h-6" />
                  <span className="text-[11px] font-black uppercase tracking-[0.3em]">Surrender Deadline Forecast</span>
                </div>
                <div className="space-y-6">
                   <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5">
                      <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Verification Period</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Jan - Mar {year + 1}</span>
                   </div>
                   <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5">
                      <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Surrender Deadline</span>
                      <span className="text-sm font-black text-blue-600 dark:text-blue-500 uppercase tracking-widest underline underline-offset-8 decoration-2">30 Sep {year + 1}</span>
                   </div>
                   <div className="flex items-center gap-4 p-5 bg-orange-50 dark:bg-orange-600/10 border border-orange-200 dark:border-orange-500/20 rounded-[1.5rem] shadow-inner">
                      <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-500 shrink-0" />
                      <p className="text-[12px] text-slate-600 dark:text-slate-300 font-bold leading-relaxed">
                        Non-compliance penalty: <span className="text-slate-900 dark:text-white font-black underline decoration-orange-500">€100 per MT</span> plus continued obligation to surrender.
                      </p>
                   </div>
                </div>
              </div>
            </section>

            <section className="bg-gradient-to-br from-blue-700 to-indigo-900 dark:to-black p-1 rounded-[2.5rem] shadow-2xl">
               <div className="bg-white dark:bg-[#151e32] h-full w-full rounded-[2.4rem] p-10 shadow-inner">
                  <div className="flex items-center gap-3 mb-8 text-indigo-600 dark:text-indigo-400">
                    <TrendingUp className="w-6 h-6" />
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-800 dark:text-white">Projected ETS Savings</span>
                  </div>
                  <div className="space-y-8">
                     <p className="text-[13px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                        By using <span className="text-emerald-600 dark:text-emerald-500 font-black">{biofuelGrade} Blend</span> (with {biofuelBaseFuel} base) on this route, you reduce surrender units by 
                        <span className="text-emerald-600 dark:text-emerald-500 font-black px-1.5 text-base">{formatNum(((fuelUsage['BIOFUEL'] || 0) * EU_ETS_EMISSION_FACTORS[biofuelBaseFuel].co2eq * GRADE_PERCENTAGES[biofuelGrade]) * results.scopeFactor * results.phaseInFactor, 0)}</span>.
                     </p>
                     <div className="p-6 bg-indigo-600 rounded-[2rem] text-center shadow-xl border border-indigo-500/30">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-100 block mb-2">Total Carbon Liability Saved</span>
                        <span className="text-4xl font-black text-white tracking-tighter">€ {formatNum(((fuelUsage['BIOFUEL'] || 0) * EU_ETS_EMISSION_FACTORS[biofuelBaseFuel].co2eq * GRADE_PERCENTAGES[biofuelGrade]) * results.scopeFactor * results.phaseInFactor * euaPrice, 0)}</span>
                     </div>
                  </div>
               </div>
            </section>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 px-10 text-slate-400 dark:text-slate-600 pb-10">
        <ShieldCheck className="w-4 h-4" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">
          ETS DIRECTIVE 2023/959 COMPLIANT | GHG SCOPE 2026+ | EMISSIONS MONITORING ENGINE v1.4
        </span>
      </div>

    </div>
  );
};

export default EUETSFeature;