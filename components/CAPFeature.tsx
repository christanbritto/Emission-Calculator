import React, { useState, useMemo } from 'react';
import { 
  Ship, 
  Clock,
  CheckCircle2,
  AlertTriangle,
  Waves,
  Flame,
  Droplets,
  Calendar,
  BarChart3,
  ArrowRightLeft,
  ShieldCheck,
  Target,
  Plus,
  Trash2,
  FileText,
  Activity,
  Gauge,
  Wrench,
  Zap,
  TrendingUp,
  Maximize2,
  X
} from 'lucide-react';
import { ShipType, FossilFuelType } from '../types';
import { FOSSIL_FUEL_STANDARDS, CII_COEFFICIENTS, CII_REDUCTION_FACTORS } from '../constants';

interface FuelItem {
  id: string;
  type: string;
  mass: number;
  cf: number;
}

interface MonthlyLog {
  seaDays: number;
  portDays: number;
  anchorageDays: number;
  seaCons: number;
  portCons: number;
  distance: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CAPFeature: React.FC = () => {
  // --- STATE ---
  const [vesselName, setVesselName] = useState('Seaways Eagle');
  const [shipType, setShipType] = useState<ShipType>(ShipType.TANKER);
  const [year, setYear] = useState(2025);
  const [dwt, setDwt] = useState(74996);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  
  // --- ANNUAL OPERATIONAL BASELINE ---
  const [annualInputs, setAnnualInputs] = useState({
    seaDays: 156,
    portDays: 144,
    anchorageDays: 65,
    seaConsMT: 4450,
    portConsMT: 1200,
    distance: 35839
  });

  const round1 = (val: number) => Math.round(val * 10) / 10;
  const format = (n: number, d = 2) => n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

  // --- MONTHLY LOGS ---
  const [monthlyLogs, setMonthlyLogs] = useState<MonthlyLog[]>(
    MONTHS.map((_, idx) => ({
      seaDays: round1(156 / 12),
      portDays: round1(144 / 12),
      anchorageDays: round1(65 / 12),
      seaCons: round1(4450 / 12),
      portCons: round1(1200 / 12),
      distance: round1(35839 / 12)
    }))
  );

  const syncAnnualToMonthly = () => {
    setMonthlyLogs(MONTHS.map(() => ({
      seaDays: round1(annualInputs.seaDays / 12),
      portDays: round1(annualInputs.portDays / 12),
      anchorageDays: round1(annualInputs.anchorageDays / 12),
      seaCons: round1(annualInputs.seaConsMT / 12),
      portCons: round1(annualInputs.portConsMT / 12),
      distance: round1(annualInputs.distance / 12)
    })));
  };

  const [inventoryItems, setInventoryItems] = useState<FuelItem[]>([
    { id: '1', type: FossilFuelType.HFO, mass: 4350, cf: FOSSIL_FUEL_STANDARDS[FossilFuelType.HFO].cf },
    { id: '2', type: FossilFuelType.MGO, mass: 1282, cf: FOSSIL_FUEL_STANDARDS[FossilFuelType.MGO].cf }
  ]);

  const [capMeasures, setCapMeasures] = useState({
    speedReduction: 0, 
    increasedSeaTime: 0, 
    hullCleaning: false,
    antifoulingCoating: false,
    mewisDuct: false,
    biofuelMT: 0, 
    biofuelSimCf: 2.4 
  });

  const results = useMemo(() => {
    const totalSeaDays = monthlyLogs.reduce((a, b) => a + b.seaDays, 0);
    const totalPortDays = monthlyLogs.reduce((a, b) => a + b.portDays, 0);
    const totalSeaCons = monthlyLogs.reduce((a, b) => a + b.seaCons, 0);
    const totalPortCons = monthlyLogs.reduce((a, b) => a + b.portCons, 0);
    const totalDistance = monthlyLogs.reduce((a, b) => a + b.distance, 0);
    const totalAnnualFuelMass = totalSeaCons + totalPortCons;
    const ledgerTotalMass = inventoryItems.reduce((acc, curr) => acc + curr.mass, 0);
    const ledgerTotalCO2 = inventoryItems.reduce((acc, curr) => acc + (curr.mass * curr.cf), 0);
    const effectiveBaseCf = ledgerTotalMass > 0 ? ledgerTotalCO2 / ledgerTotalMass : 3.151;
    const annualBaselineCO2 = totalAnnualFuelMass * effectiveBaseCf;
    const attainedCII = totalDistance > 0 ? (annualBaselineCO2 * 1_000_000) / (dwt * totalDistance) : 0;
    const coeffs = CII_COEFFICIENTS[shipType] || CII_COEFFICIENTS[ShipType.BULK_CARRIER];
    const refCII = coeffs.a * Math.pow(dwt, -coeffs.c);
    const reductionFactor = CII_REDUCTION_FACTORS[year] || 0;
    const requiredCII = refCII * ((100 - reductionFactor) / 100);
    const targetC = requiredCII * coeffs.d3; 

    const trajectoryYears = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];
    const trajectoryData = trajectoryYears.map(y => {
      const z = CII_REDUCTION_FACTORS[y] || 19;
      const req = refCII * ((100 - z) / 100);
      return { year: y, required: req, A: req * coeffs.d1, B: req * coeffs.d2, C: req * coeffs.d3, D: req * coeffs.d4 };
    });

    const getRating = (cii: number) => {
      if (cii === 0) return 'N/A';
      const ratio = cii / requiredCII;
      if (ratio <= coeffs.d1) return 'A';
      if (ratio <= coeffs.d2) return 'B';
      if (ratio <= coeffs.d3) return 'C';
      if (ratio <= coeffs.d4) return 'D';
      return 'E';
    };

    return {
      attainedCII,
      requiredCII,
      targetC,
      attainedRating: getRating(attainedCII),
      trajectoryData,
      excessPct: targetC > 0 ? ((attainedCII - targetC) / targetC) * 100 : 0,
      monthlyAverages: {
        seaDays: totalSeaDays / 12,
        portDays: totalPortDays / 12,
        anchorageDays: monthlyLogs.reduce((a, b) => a + b.anchorageDays, 0) / 12,
        distance: totalDistance / 12,
        consumption: totalAnnualFuelMass / 12
      }
    };
  }, [shipType, dwt, monthlyLogs, year, inventoryItems]);

  const handleMonthlyLogChange = (index: number, field: keyof MonthlyLog, value: number) => {
    const updated = [...monthlyLogs];
    updated[index] = { ...updated[index], [field]: value };
    setMonthlyLogs(updated);
  };

  const getRatingColor = (r: string) => {
    switch (r) {
      case 'A': return 'bg-[#00b050] shadow-emerald-500/20';
      case 'B': return 'bg-[#92d050] shadow-emerald-400/20';
      case 'C': return 'bg-[#ffff00] shadow-yellow-400/20';
      case 'D': return 'bg-[#ffc000] shadow-orange-500/20';
      case 'E': return 'bg-[#ff0000] shadow-rose-500/20';
      default: return 'bg-slate-500 shadow-slate-500/20';
    }
  };

  // --- GRAPH COMPONENTS ---
  
  const DaysSplitGraph = ({ isExpanded = false }: { isExpanded?: boolean }) => {
    const maxDays = 31;
    const chartHeight = isExpanded ? 400 : 150;
    return (
      <div className="space-y-4">
        <div className={`flex justify-between items-end px-2 gap-1`} style={{ height: `${chartHeight + 20}px` }}>
          {monthlyLogs.map((log, i) => (
            <div key={i} className="flex-1 flex flex-col gap-0.5 group relative">
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none">
                 <span className="bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded shadow-lg">{log.anchorageDays+log.portDays+log.seaDays} Total</span>
              </div>
              <div className="bg-emerald-300 dark:bg-emerald-600 rounded-sm w-full transition-all hover:brightness-110 flex items-center justify-center overflow-hidden" style={{ height: `${(log.anchorageDays / maxDays) * chartHeight}px` }}>
                {log.anchorageDays > 2 && <span className="text-[8px] font-black text-emerald-800 pointer-events-none">{log.anchorageDays}</span>}
              </div>
              <div className="bg-blue-300 dark:bg-blue-600 w-full flex items-center justify-center overflow-hidden" style={{ height: `${(log.portDays / maxDays) * chartHeight}px` }}>
                {log.portDays > 2 && <span className="text-[8px] font-black text-blue-800 pointer-events-none">{log.portDays}</span>}
              </div>
              <div className="bg-blue-500 dark:bg-blue-400 rounded-sm w-full flex items-center justify-center overflow-hidden" style={{ height: `${(log.seaDays / maxDays) * chartHeight}px` }}>
                {log.seaDays > 2 && <span className="text-[8px] font-black text-blue-50 pointer-events-none">{log.seaDays}</span>}
              </div>
              <span className={`text-[9px] font-bold text-slate-400 mt-2 text-center uppercase ${isExpanded ? 'text-[12px]' : ''}`}>{MONTHS[i][0]}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-6 pt-2 border-t border-slate-100 dark:border-slate-800">
           <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[9px] font-bold text-slate-500 uppercase">Sailing</span></div>
           <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-300" /><span className="text-[9px] font-bold text-slate-500 uppercase">Port Stay</span></div>
           <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-300" /><span className="text-[9px] font-bold text-slate-500 uppercase">Anchorage</span></div>
        </div>
      </div>
    );
  };

  const DistanceConsumptionGraph = ({ isExpanded = false }: { isExpanded?: boolean }) => {
    const maxDist = Math.max(...monthlyLogs.map(l => l.distance)) * 1.2 || 5000;
    const maxCons = Math.max(...monthlyLogs.map(l => l.seaCons + l.portCons)) * 1.2 || 600;
    const chartHeight = isExpanded ? 400 : 150;
    const chartWidth = 400;

    return (
      <div className="relative">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`} className="w-full h-auto">
          {monthlyLogs.map((log, i) => {
            const barH = (log.distance / maxDist) * chartHeight;
            const barX = 10 + i * 32.5;
            const barY = chartHeight - barH + 20;
            return (
              <g key={i} className="group/bar">
                <rect x={barX} y={barY} width="15" height={barH} fill="#6366f1" opacity="0.2" className="rounded-t-sm transition-opacity hover:opacity-40" />
                <text x={barX + 7.5} y={barY - 5} textAnchor="middle" className="text-[7px] font-black fill-slate-500 opacity-0 group-hover/bar:opacity-100 transition-opacity">{format(log.distance, 0)}</text>
              </g>
            );
          })}
          <path d={monthlyLogs.map((log, i) => `${i === 0 ? 'M' : 'L'} ${17.5 + i * 32.5} ${chartHeight - ((log.seaCons + log.portCons) / maxCons) * chartHeight + 20}`).join(' ')} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
          {monthlyLogs.map((log, i) => {
            const cx = 17.5 + i * 32.5;
            const cy = chartHeight - ((log.seaCons + log.portCons) / maxCons) * chartHeight + 20;
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r="3" fill="#6366f1" className="hover:scale-150 transition-transform cursor-crosshair" />
                <text x={cx} y={cy - 8} textAnchor="middle" className="text-[7px] font-black fill-indigo-600">{format(log.seaCons + log.portCons, 1)}</text>
              </g>
            );
          })}
          {MONTHS.map((m, i) => (
            <text key={m} x={17.5 + i * 32.5} y={chartHeight + 35} textAnchor="middle" className="text-[8px] font-bold fill-slate-400 uppercase">{m[0]}</text>
          ))}
        </svg>
        <div className="flex justify-center gap-6 mt-2">
           <div className="flex items-center gap-1.5"><div className="w-3 h-1 bg-indigo-200" /><span className="text-[9px] font-bold text-slate-500 uppercase">Distance</span></div>
           <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-indigo-600" /><span className="text-[9px] font-bold text-slate-500 uppercase">Consumption</span></div>
        </div>
      </div>
    );
  };

  const CIITrajectoryGraph = ({ isExpanded = false }: { isExpanded?: boolean }) => {
    const chartHeight = isExpanded ? 400 : 150;
    const chartWidth = 400;
    const minCII = 4;
    const maxCII = 8;
    const getY = (val: number) => chartHeight - ((val - minCII) / (maxCII - minCII)) * (chartHeight - 40) + 20;

    return (
      <div className="relative">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`} className="w-full h-auto">
          {/* Background Bands - Bright Colors as per ref */}
          {results.trajectoryData.map((d, i) => {
            if (i === results.trajectoryData.length - 1) return null;
            const next = results.trajectoryData[i+1];
            const x1 = 30 + i * 50;
            const x2 = 30 + (i + 1) * 50;
            return (
              <g key={i}>
                <polygon points={`${x1},${getY(d.A)} ${x2},${getY(next.A)} ${x2},${chartHeight + 20} ${x1},${chartHeight + 20}`} fill="#00b050" />
                <polygon points={`${x1},${getY(d.B)} ${x2},${getY(next.B)} ${x2},${getY(next.A)} ${x1},${getY(d.A)}`} fill="#92d050" />
                <polygon points={`${x1},${getY(d.C)} ${x2},${getY(next.C)} ${x2},${getY(next.B)} ${x1},${getY(d.B)}`} fill="#ffff00" />
                <polygon points={`${x1},${getY(d.D)} ${x2},${getY(next.D)} ${x2},${getY(next.C)} ${x1},${getY(d.C)}`} fill="#ffc000" />
                <polygon points={`${x1},20 ${x2},20 ${x2},${getY(next.D)} ${x1},${getY(d.D)}`} fill="#ff0000" />
              </g>
            );
          })}
          
          {/* Required Line - Dashed Grey */}
          <path d={results.trajectoryData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${30 + i * 50} ${getY(d.required)}`).join(' ')} fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="6 4" />
          
          {/* Always display Required CII labels */}
          {results.trajectoryData.map((d, i) => (
             <text key={i} x={30 + i * 50} y={getY(d.required) - 4} textAnchor="middle" className="text-[7px] font-black fill-slate-700">{format(d.required)}</text>
          ))}

          {/* Attained Point - High Insight Data Label */}
          <g>
            <circle cx={30 + results.trajectoryData.findIndex(d => d.year === year) * 50} cy={getY(results.attainedCII)} r="6" fill="#000" stroke="#fff" strokeWidth="2" />
            <rect x={30 + results.trajectoryData.findIndex(d => d.year === year) * 50 - 18} y={getY(results.attainedCII) - 30} width="36" height="18" rx="4" fill="black" />
            <text x={30 + results.trajectoryData.findIndex(d => d.year === year) * 50} y={getY(results.attainedCII) - 17} textAnchor="middle" className="text-[10px] font-black fill-white">{format(results.attainedCII)}</text>
          </g>

          {results.trajectoryData.map((d, i) => (
            <text key={d.year} x={30 + i * 50} y={chartHeight + 35} textAnchor="middle" className="text-[8px] font-bold fill-slate-400">{d.year}</text>
          ))}
        </svg>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mt-4">
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#00b050] rounded-sm" /><span className="text-[8px] uppercase font-black text-slate-500">Rating A</span></div>
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#92d050] rounded-sm" /><span className="text-[8px] uppercase font-black text-slate-500">Rating B</span></div>
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#ffff00] rounded-sm" /><span className="text-[8px] uppercase font-black text-slate-500">Rating C</span></div>
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#ffc000] rounded-sm" /><span className="text-[8px] uppercase font-black text-slate-500">Rating D</span></div>
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#ff0000] rounded-sm" /><span className="text-[8px] uppercase font-black text-slate-500">Rating E</span></div>
        </div>
      </div>
    );
  };

  const FuelSplitGraph = ({ isExpanded = false }: { isExpanded?: boolean }) => {
    const chartHeight = isExpanded ? 400 : 150;
    const ledger = inventoryItems;
    const hfoMass = ledger.filter(i => i.type === FossilFuelType.HFO).reduce((a, b) => a + b.mass, 0);
    const gasMass = ledger.filter(i => i.type !== FossilFuelType.HFO).reduce((a, b) => a + b.mass, 0);
    const totalMass = hfoMass + gasMass;
    const hfoRatio = totalMass > 0 ? hfoMass / totalMass : 0.7;
    const gasRatio = 1 - hfoRatio;

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-end px-2 gap-2" style={{ height: `${chartHeight + 20}px` }}>
          {monthlyLogs.map((log, i) => {
            const mCons = log.seaCons + log.portCons;
            const maxM = 600;
            const h = (mCons * hfoRatio) / maxM * chartHeight;
            const g = (mCons * gasRatio) / maxM * chartHeight;
            return (
              <div key={i} className="flex-1 flex flex-col gap-0.5 group relative">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                   <span className="bg-slate-900 text-white text-[8px] px-1 py-0.5 rounded">{format(mCons, 1)}</span>
                </div>
                <div className="bg-slate-400 dark:bg-slate-500 rounded-sm w-full flex items-center justify-center overflow-hidden" style={{ height: `${h}px` }}>
                   {h > 15 && <span className="text-[7px] font-black text-white pointer-events-none rotate-90">{format(mCons * hfoRatio, 0)}</span>}
                </div>
                <div className="bg-orange-300 dark:bg-orange-600 rounded-sm w-full flex items-center justify-center overflow-hidden" style={{ height: `${g}px` }}>
                   {g > 15 && <span className="text-[7px] font-black text-orange-900 pointer-events-none rotate-90">{format(mCons * gasRatio, 0)}</span>}
                </div>
                <span className="text-[9px] font-bold text-slate-400 mt-2 text-center uppercase">{MONTHS[i][0]}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center gap-6 pt-2 border-t border-slate-100 dark:border-slate-800">
           <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-400" /><span className="text-[9px] font-bold text-slate-500 uppercase">Heavy Fuel Oil</span></div>
           <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-400" /><span className="text-[9px] font-bold text-slate-500 uppercase">Gas / Diesel Oil</span></div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-20 space-y-8">
      
      {/* VESSEL IDENTITY CARD */}
      <div className="flex flex-col lg:flex-row items-stretch gap-8 bg-white dark:bg-[#151e32] p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden transition-all">
        <div className="absolute top-0 right-0 p-8 opacity-5"><Ship className="w-48 h-48 text-blue-500" /></div>
        <div className="flex-[1.5] space-y-6 z-10">
          <div className="flex items-center gap-4">
             <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-500/20"><Ship className="w-6 h-6" /></div>
             <input value={vesselName} onChange={e => setVesselName(e.target.value)} className="text-2xl font-black bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white uppercase tracking-tight w-full" placeholder="Enter Vessel Name..." />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Ship Type</label>
               <select value={shipType} onChange={e => setShipType(e.target.value as ShipType)} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-sm text-slate-900 dark:text-white outline-none cursor-pointer">
                 {Object.values(ShipType).map(t => <option key={t} value={t}>{t}</option>)}
               </select>
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">DWT Capacity</label>
               <input type="number" value={dwt} onChange={e => setDwt(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-sm text-slate-900 dark:text-white outline-none" />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Analysis Period</label>
               <select value={year} onChange={e => setYear(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-sm text-blue-600 outline-none cursor-pointer">
                 {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y} Compliance Cycle</option>)}
               </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Projected Bio Cf</label>
              <input type="number" step="0.01" value={capMeasures.biofuelSimCf} onChange={e => setCapMeasures({...capMeasures, biofuelSimCf: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-sm text-emerald-600 outline-none" />
            </div>
          </div>
        </div>
        <div className="flex-1 z-10 p-6 bg-slate-50 dark:bg-[#0f172a] rounded-[2rem] border border-slate-100 dark:border-slate-700/50 flex flex-col justify-between shadow-inner">
           <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-600/10 p-2 rounded-xl text-indigo-600"><Gauge className="w-4 h-4" /></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Compliance Benchmarks</span>
           </div>
           <div className="space-y-5">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Required CII</span>
                 <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums font-mono">{format(results.requiredCII, 2)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attained CII</span>
                 <span className="text-xl font-black text-blue-600 tabular-nums font-mono">{format(results.attainedCII, 2)}</span>
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Difference (%)</span>
                 <div className="flex items-center gap-2">
                    {results.excessPct > 0 ? <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
                    <span className={`text-xl font-black tabular-nums font-mono ${results.excessPct > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {results.excessPct > 0 ? '+' : ''}{format(results.excessPct, 1)}%
                    </span>
                 </div>
              </div>
           </div>
        </div>
        <div className="flex flex-row lg:flex-col justify-center gap-8 lg:px-6 z-10 min-w-[200px]">
           <div className="text-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Current Rating</span>
              <div className={`${getRatingColor(results.attainedRating)} w-20 h-20 rounded-[1.5rem] flex items-center justify-center text-white text-4xl font-black shadow-2xl mx-auto ring-8 ring-white dark:ring-slate-800`}>{results.attainedRating}</div>
           </div>
        </div>
      </div>

      {/* 3. DYNAMIC FUEL INVENTORY */}
      <section className="bg-white dark:bg-[#151e32] border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl relative group">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
             <div className="bg-orange-500/10 p-2.5 rounded-xl text-orange-500"><Flame className="w-5 h-5" /></div>
             <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-800 dark:text-white uppercase tracking-widest">Inventory Ledger (BDN Sync)</h3>
          </div>
          <button onClick={() => setInventoryItems([...inventoryItems, { id: Date.now().toString(), type: FossilFuelType.VLSFO, mass: 0, cf: 3.151 }])} className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95">
             <Plus className="w-4 h-4" /> Add Fuel Row
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {inventoryItems.map((item) => (
            <div key={item.id} className="p-6 bg-slate-50 dark:bg-[#0f172a] rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-5 shadow-sm relative group/row hover:border-orange-500/50 transition-all">
               <button onClick={() => setInventoryItems(inventoryItems.filter(i => i.id !== item.id))} className="absolute right-4 top-4 p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-full transition-all shadow-sm">
                 <Trash2 className="w-4 h-4" />
               </button>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fuel Type</label>
                     <select value={item.type} onChange={e => {
                        const val = e.target.value;
                        setInventoryItems(inventoryItems.map(i => i.id === item.id ? { ...i, type: val, cf: val === 'BIOFUEL' ? 2.4 : (FOSSIL_FUEL_STANDARDS[val as FossilFuelType]?.cf || 3.15) } : i))
                     }} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-xs text-slate-900 dark:text-white outline-none">
                        {Object.values(FossilFuelType).map(f => <option key={f} value={f}>{f}</option>)}
                        <option value="BIOFUEL">BIOFUEL Grade</option>
                     </select>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mass (MT)</label>
                     <input type="number" value={item.mass} onChange={e => setInventoryItems(inventoryItems.map(i => i.id === item.id ? { ...i, mass: Number(e.target.value) } : i))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-mono font-black text-sm text-slate-900 dark:text-white outline-none" />
                  </div>
               </div>
            </div>
          ))}
          <div className="p-8 bg-slate-900 rounded-[2rem] border border-slate-800 flex flex-col justify-center items-center text-center shadow-2xl relative overflow-hidden group/summary">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3 relative z-10">Total Validated Mass</span>
             <div className="text-5xl font-black text-white font-mono relative z-10">
               {format(inventoryItems.reduce((a, b) => a + b.mass, 0), 0)} <span className="text-xl text-slate-500 uppercase">MT</span>
             </div>
          </div>
        </div>
      </section>

      {/* 4. ANNUAL BASELINE PARAMETERS */}
      <section className="bg-white dark:bg-[#151e32] border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600/10 p-2.5 rounded-xl text-indigo-600"><Waves className="w-5 h-5" /></div>
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-800 dark:text-white uppercase tracking-widest">Annual Operational Baseline Parameters</h3>
          </div>
          <button onClick={syncAnnualToMonthly} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95">
             <ArrowRightLeft className="w-3.5 h-3.5" /> Distribute to Journal
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
           {['seaDays', 'portDays', 'anchorageDays', 'seaConsMT', 'portConsMT', 'distance'].map(field => (
             <div key={field} className="p-6 bg-slate-50 dark:bg-[#0f172a] rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm transition-all focus-within:border-blue-500">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{field.replace(/([A-Z])/g, ' $1').trim()}</label>
                <input type="number" value={annualInputs[field as keyof typeof annualInputs]} onChange={e => setAnnualInputs({...annualInputs, [field]: Number(e.target.value)})} className="bg-transparent text-2xl font-black text-slate-900 dark:text-white font-mono w-full outline-none" />
             </div>
           ))}
        </div>
      </section>

      {/* 5. MONTHLY PERFORMANCE JOURNAL (EDITABLE) */}
      <section className="bg-white dark:bg-[#151e32] border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600/10 p-2.5 rounded-xl text-indigo-600"><Calendar className="w-5 h-5" /></div>
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-800 dark:text-white uppercase tracking-widest">Monthly Operational Performance Journal</h3>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {monthlyLogs.map((log, idx) => (
            <div key={MONTHS[idx]} className="bg-slate-50 dark:bg-[#0f172a] p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4 hover:border-indigo-400 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                 <span className="text-sm font-black text-indigo-600 uppercase tracking-[0.2em]">{MONTHS[idx]} Log</span>
                 <FileText className="w-3.5 h-3.5 text-slate-300" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase block tracking-tighter">Sailing</label>
                    <input type="number" value={log.seaDays} onChange={e => handleMonthlyLogChange(idx, 'seaDays', parseFloat(e.target.value) || 0)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-black text-slate-900 dark:text-white text-xs outline-none" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase block tracking-tighter">Port</label>
                    <input type="number" value={log.portDays} onChange={e => handleMonthlyLogChange(idx, 'portDays', parseFloat(e.target.value) || 0)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-black text-slate-900 dark:text-white text-xs outline-none" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-emerald-500 uppercase block tracking-tighter">Anch.</label>
                    <input type="number" value={log.anchorageDays} onChange={e => handleMonthlyLogChange(idx, 'anchorageDays', parseFloat(e.target.value) || 0)} className="w-full bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/30 rounded-lg px-2 py-1 text-center font-black text-emerald-600 text-xs outline-none" />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase block tracking-tighter">Sea MT</label>
                    <input type="number" value={log.seaCons} onChange={e => handleMonthlyLogChange(idx, 'seaCons', parseFloat(e.target.value) || 0)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-black text-slate-900 dark:text-white text-xs outline-none" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase block tracking-tighter">Dist NM</label>
                    <input type="number" value={log.distance} onChange={e => handleMonthlyLogChange(idx, 'distance', parseFloat(e.target.value) || 0)} className="w-full bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 rounded-lg px-2 py-1 text-center font-black text-blue-600 text-xs outline-none" />
                 </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. TRENDS & ANALYTICS */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-4">
           <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg"><TrendingUp className="w-5 h-5" /></div>
           <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">Performance Trends & Analytics</h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Chart 1: Days in Sea vs Port */}
           <div className="bg-white dark:bg-[#151e32] p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 relative group/card">
              <div className="flex justify-between items-center">
                 <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Days in Sea Vs Port - YTD</h4>
                 <button onClick={() => setExpandedChart('days')} className="p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 rounded-xl transition-all shadow-sm">
                   <Maximize2 className="w-4 h-4" />
                 </button>
              </div>
              <DaysSplitGraph />
           </div>

           {/* Chart 2: Distance & Consumption */}
           <div className="bg-white dark:bg-[#151e32] p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 relative group/card">
              <div className="flex justify-between items-center">
                 <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Distance Covered and Consumption</h4>
                 <button onClick={() => setExpandedChart('distance')} className="p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 rounded-xl transition-all shadow-sm">
                   <Maximize2 className="w-4 h-4" />
                 </button>
              </div>
              <DistanceConsumptionGraph />
           </div>

           {/* Chart 3: CII Trend Projected (UPDATED COLORS) */}
           <div className="bg-white dark:bg-[#151e32] p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 relative group/card">
              <div className="flex justify-between items-center">
                 <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">CII Trend Projected (2023-2030)</h4>
                 <button onClick={() => setExpandedChart('cii')} className="p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 rounded-xl transition-all shadow-sm">
                   <Maximize2 className="w-4 h-4" />
                 </button>
              </div>
              <CIITrajectoryGraph />
           </div>

           {/* Chart 4: Fuel Type Split */}
           <div className="bg-white dark:bg-[#151e32] p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 relative group/card">
              <div className="flex justify-between items-center">
                 <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Fuel Type Consumed - YTD</h4>
                 <button onClick={() => setExpandedChart('fuel')} className="p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 rounded-xl transition-all shadow-sm">
                   <Maximize2 className="w-4 h-4" />
                 </button>
              </div>
              <FuelSplitGraph />
           </div>
        </div>
      </section>

      {/* FINAL PROJECTED RESULT CARD */}
      <div className="bg-slate-950 dark:bg-black rounded-[3.5rem] p-12 shadow-2xl border border-slate-800 relative overflow-hidden flex flex-col xl:flex-row items-center justify-between gap-12 group">
        <div className="absolute inset-0 opacity-5 pointer-events-none group-hover:scale-105 transition-transform duration-1000"><Waves className="w-full h-full text-blue-500" /></div>
        <div className="text-center xl:text-left z-10 space-y-6">
           <div>
              <span className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.4em] block mb-4">Projected Corrective Rating ({year})</span>
              <div className="flex flex-wrap items-center justify-center xl:justify-start gap-12">
                 <h2 className="text-[160px] font-black text-white leading-none tracking-tighter drop-shadow-2xl">{results.attainedRating}</h2>
                 <div className="bg-white/5 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/10 space-y-8 min-w-[260px] shadow-2xl">
                    <div>
                       <span className="text-[10px] font-black text-slate-500 uppercase block mb-1 tracking-widest">Attained CII (YTD)</span>
                       <span className="text-4xl font-black text-white tabular-nums">{format(results.attainedCII)}</span>
                       <span className="text-[10px] text-slate-500 block uppercase font-bold mt-1">gCO2/t-nm</span>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div>
                       <span className="text-[10px] font-black text-slate-500 uppercase block mb-1 tracking-widest">Regulatory Goal</span>
                       <span className="text-4xl font-black text-emerald-400 tracking-tighter">{format(results.requiredCII)}</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>
        <div className="z-10 flex flex-col items-center gap-10 px-12">
           <div className={`w-40 h-40 rounded-[3rem] flex items-center justify-center shadow-2xl transition-all duration-1000 ${['A', 'B', 'C'].includes(results.attainedRating) ? 'bg-emerald-50 shadow-emerald-500/20' : 'bg-rose-50 shadow-rose-500/20'}`}>
              {['A', 'B', 'C'].includes(results.attainedRating) ? <CheckCircle2 className="w-20 h-20 text-white" /> : <AlertTriangle className="w-20 h-20 text-white" />}
           </div>
           <span className={`text-sm font-black uppercase tracking-[0.4em] ${['A', 'B', 'C'].includes(results.attainedRating) ? 'text-emerald-400' : 'text-rose-400'}`}>
              {['A', 'B', 'C'].includes(results.attainedRating) ? 'COMPLIANCE OPTIMUM' : 'CORRECTION REQUIRED'}
           </span>
        </div>
      </div>

      {/* EXPANDED MODAL */}
      {expandedChart && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-[#0f172a] w-full max-w-6xl rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {expandedChart === 'days' && 'Days in Sea Vs Port Breakdown'}
                    {expandedChart === 'distance' && 'Distance & Consumption Correlation'}
                    {expandedChart === 'cii' && 'CII Trajectory Projection'}
                    {expandedChart === 'fuel' && 'Monthly Fuel Type Distribution'}
                 </h3>
                 <button onClick={() => setExpandedChart(null)} className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-full transition-all">
                    <X className="w-8 h-8" />
                 </button>
              </div>
              <div className="flex-1 p-10 overflow-y-auto">
                 {expandedChart === 'days' && <DaysSplitGraph isExpanded />}
                 {expandedChart === 'distance' && <DistanceConsumptionGraph isExpanded />}
                 {expandedChart === 'cii' && <CIITrajectoryGraph isExpanded />}
                 {expandedChart === 'fuel' && <FuelSplitGraph isExpanded />}
              </div>
           </div>
        </div>
      )}

      <div className="flex items-center gap-4 px-10 text-slate-400 dark:text-slate-600 opacity-60">
        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
        <span className="text-[10px] font-black uppercase tracking-[0.5em] whitespace-nowrap">MARITIME REGULATORY COMPLIANCE | SEEMP III | ANNEX VI REVISION 2026</span>
        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
      </div>
    </div>
  );
};

export default CAPFeature;