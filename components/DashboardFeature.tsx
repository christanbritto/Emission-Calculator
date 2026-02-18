import React from 'react';
import { 
  Activity, 
  ShieldCheck, 
  AlertCircle, 
  TrendingDown, 
  Euro, 
  Zap, 
  Ship, 
  Globe, 
  Waves, 
  Droplets
} from 'lucide-react';

const DashboardFeature: React.FC = () => {
  // Mock data representing the consolidated state of the fleet's compliance
  const fleetStats = {
    overallReadiness: 84,
    ciiRating: 'C',
    ciiActual: 4.82,
    ciiRequired: 5.15,
    etsLiability: 245000,
    etsEmissions: 2880,
    fuelEuBalance: 1450, // Metric Tonnes CO2eq Surplus
    fuelEuIntensity: 88.42,
    fuelEuTarget: 89.34,
    biofuelSavings: 420, // MT CO2 saved
    nextDeadline: '31 March 2026'
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'A': return 'bg-emerald-500 shadow-emerald-500/30 text-white';
      case 'B': return 'bg-lime-500 shadow-lime-500/30 text-white';
      case 'C': return 'bg-yellow-400 shadow-yellow-400/40 text-slate-900 ring-2 ring-yellow-400/20';
      case 'D': return 'bg-orange-500 shadow-orange-500/30 text-white';
      case 'E': return 'bg-rose-600 shadow-rose-600/30 text-white';
      default: return 'bg-slate-500 shadow-slate-500/30 text-white';
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-700 space-y-8 pb-12">
      
      {/* 1. EXECUTIVE SUMMARY KPI BAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
            <Activity className="w-40 h-40 text-white" />
          </div>
          <span className="text-[11px] font-black text-blue-100 uppercase tracking-[0.2em] mb-4 block">Fleet Readiness Score</span>
          <div className="flex items-baseline gap-2">
            <h3 className="text-7xl font-black text-white tabular-nums tracking-tighter">{fleetStats.overallReadiness}</h3>
            <span className="text-blue-100 font-black text-xl">%</span>
          </div>
          <p className="text-[10px] text-blue-200 font-bold mt-4 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5" /> High Compliance Confidence
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
          <span className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-4 block opacity-60">Total GHG Liability</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-500">€</span>
            <h3 className="text-6xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{(fleetStats.etsLiability / 1000).toFixed(0)}k</h3>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-4 uppercase tracking-wider">
            Combined EU ETS Exposure
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
          <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 block opacity-60">FuelEU Status</span>
          <div className="flex items-baseline gap-2">
            <h3 className="text-6xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">+{fleetStats.fuelEuBalance}</h3>
            <span className="text-indigo-400 font-black text-xl uppercase">t</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-4 uppercase tracking-wider">
            Bankable Energy Surplus
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group text-center">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] mb-4 block text-slate-500">Current Rating</span>
          <div className="flex justify-center">
             <div className={`w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg transition-all duration-500 ${getRatingColor(fleetStats.ciiRating)}`}>
               <span className="text-6xl font-black">{fleetStats.ciiRating}</span>
             </div>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-4 uppercase tracking-wider">
            Consolidated CII Average
          </p>
        </div>
      </div>

      {/* 2. REGULATORY BREAKDOWN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Col: Regulation Cards */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* CII SECTION */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-xl">
             <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600/10 p-3 rounded-2xl text-blue-500"><Ship className="w-6 h-6" /></div>
                  <h3 className="font-black text-sm uppercase tracking-[0.3em] text-slate-800 dark:text-white">Carbon Intensity Indicator (CII)</h3>
                </div>
                <button className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest border-b border-blue-400/50 pb-0.5 hover:text-blue-500 dark:hover:text-white hover:border-blue-500 dark:hover:border-white transition-all">View Full Analysis</button>
             </div>
             <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                   <div className="flex justify-between items-end">
                      <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Attained vs Required</span>
                      <span className="text-2xl font-black text-slate-800 dark:text-white">{fleetStats.ciiActual} / {fleetStats.ciiRequired}</span>
                   </div>
                   <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner border border-slate-200 dark:border-slate-700">
                      <div className="h-full bg-emerald-500" style={{ width: '30%' }} />
                      <div className="h-full bg-lime-500" style={{ width: '20%' }} />
                      <div className="h-full bg-yellow-400 border-x border-slate-100 dark:border-slate-900" style={{ width: '15%' }} />
                      <div className="h-full bg-orange-500" style={{ width: '20%' }} />
                      <div className="h-full bg-rose-500" style={{ width: '15%' }} />
                   </div>
                   <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      Your fleet is currently tracking in the <span className="text-emerald-500 dark:text-emerald-400 font-bold uppercase tracking-widest">Healthy Zone</span>. Compliance margin is approximately <span className="text-slate-900 dark:text-white font-black">6.4%</span> for the current 2024 reporting period.
                   </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-slate-50 dark:bg-slate-950/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                      <Zap className="w-5 h-5 text-indigo-500 mb-3" />
                      <span className="text-3xl font-black text-slate-900 dark:text-white block mb-1">9.2%</span>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">EEXI Reduction</span>
                   </div>
                   <div className="bg-slate-50 dark:bg-slate-950/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                      <Waves className="w-5 h-5 text-blue-500 mb-3" />
                      <span className="text-3xl font-black text-slate-900 dark:text-white block mb-1">2.4kt</span>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Fuel Saved (Annual)</span>
                   </div>
                </div>
             </div>
          </section>

          {/* EU ETS & FuelEU TWIN DASH */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5"><Globe className="w-32 h-32 text-emerald-500" /></div>
                <div className="flex items-center gap-3 mb-10 text-emerald-600 dark:text-emerald-500">
                  <Globe className="w-5 h-5" />
                  <span className="text-[11px] font-black uppercase tracking-[0.3em]">EU Emissions Trading System</span>
                </div>
                <div className="space-y-8">
                   <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1 tracking-widest">Projected Emissions</span>
                      <div className="flex items-baseline gap-2">
                         <span className="text-5xl font-black text-slate-900 dark:text-white">{fleetStats.etsEmissions}</span>
                         <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">MT CO2</span>
                      </div>
                   </div>
                   <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-800">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Euro className="w-3 h-3" /> Market Price</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">€85.00 / MT</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: '70%' }} />
                      </div>
                   </div>
                </div>
             </section>

             <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5"><Waves className="w-32 h-32 text-indigo-500" /></div>
                <div className="flex items-center gap-3 mb-10 text-indigo-600 dark:text-indigo-500">
                  <Waves className="w-5 h-5" />
                  <span className="text-[11px] font-black uppercase tracking-[0.3em]">FuelEU Maritime</span>
                </div>
                <div className="space-y-8">
                   <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1 tracking-widest">Fleet GHG Intensity</span>
                      <div className="flex items-baseline gap-2">
                         <span className="text-5xl font-black text-slate-900 dark:text-white">{fleetStats.fuelEuIntensity}</span>
                         <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">gCO2e/MJ</span>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 text-center">
                         <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 block tracking-tight">SURPLUS</span>
                         <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Active Status</span>
                      </div>
                      <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-200 dark:border-indigo-500/20 text-center">
                         <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 block tracking-tight">1.0%</span>
                         <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Intensity Margin</span>
                      </div>
                   </div>
                </div>
             </section>
          </div>
        </div>

        {/* Right Col: Insights & Deadlines */}
        <div className="lg:col-span-4 space-y-8">
           <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
              <h3 className="font-black text-xs uppercase tracking-[0.3em] text-slate-800 dark:text-white mb-8 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500" /> Critical Milestones
              </h3>
              <div className="space-y-6">
                 <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[1.5rem] border-l-4 border-orange-500">
                    <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest block mb-1">Upcoming Deadline</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white block mb-2">{fleetStats.nextDeadline}</span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Verification of the annual EU ETS emission report by accredited verifier.</p>
                 </div>
                 <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[1.5rem] border-l-4 border-blue-500">
                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-1">FuelEU Phase 1</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white block mb-2">01 Jan 2025</span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Regulation (EU) 2023/1805 compliance monitoring starts for all fleet units.</p>
                 </div>
              </div>
           </section>

           {/* SMALLER BIOFUEL IMPACT CARD */}
           <section className="bg-gradient-to-br from-indigo-700 to-indigo-900 dark:to-black p-1 rounded-[2.5rem] shadow-2xl overflow-hidden h-fit">
              <div className="bg-white dark:bg-slate-900 rounded-[2.4rem] p-6 space-y-6">
                 <div className="space-y-1">
                    <h3 className="font-black text-xs uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400 flex items-center gap-3">
                      <Droplets className="w-5 h-5" /> Biofuel Impact
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                       Adoption of <span className="text-emerald-600 dark:text-emerald-400 font-bold">B30 Blend</span> successfully verified.
                    </p>
                 </div>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">MT Saved</span>
                       <span className="text-xl font-black">{fleetStats.biofuelSavings} t</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Tax Relief</span>
                       <span className="text-xl font-black">+ €35.7k</span>
                    </div>
                 </div>
              </div>
           </section>
        </div>
      </div>

      {/* 3. FOOTER REGULATORY SEAL */}
      <div className="flex items-center gap-4 px-10 text-slate-400 dark:text-slate-600 opacity-80">
        <ShieldCheck className="w-4 h-4" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">
          FLEETWIDE MONITORING SYSTEM | MARPOL ANNEX VI | EU 2023/1805 | MRV 2015/757
        </span>
      </div>

    </div>
  );
};

export default DashboardFeature;