
import { FossilFuelType, FossilFuelConfig, ShipType } from './types';

export const FOSSIL_FUEL_STANDARDS: Record<FossilFuelType, FossilFuelConfig> = {
  [FossilFuelType.HFO]: {
    name: 'Heavy Fuel Oil',
    lcv: 0.0405,
    cf: 3.114
  },
  [FossilFuelType.LFO]: {
    name: 'Light Fuel Oil',
    lcv: 0.0410,
    cf: 3.151
  },
  [FossilFuelType.VLSFO]: {
    name: 'Very Low Sulphur Fuel Oil',
    lcv: 0.0410,
    cf: 3.151
  },
  [FossilFuelType.MGO]: {
    name: 'Marine Gas Oil',
    lcv: 0.0427,
    cf: 3.206
  },
  [FossilFuelType.LNG]: {
    name: 'Liquefied Natural Gas',
    lcv: 0.0480,
    cf: 2.750
  }
};

export const SUSTAINABILITY_THRESHOLD = 33; // gCO2e/MJ

export const CII_REDUCTION_FACTORS: Record<number, number> = {
  2023: 5,
  2024: 7,
  2025: 9,
  2026: 11,
  2027: 13,
  2028: 15,
  2029: 17,
  2030: 19
};

export const CII_COEFFICIENTS: Record<string, { a: number; c: number; d1: number; d2: number; d3: number; d4: number }> = {
  [ShipType.BULK_CARRIER]: { a: 4745, c: 0.622, d1: 0.86, d2: 0.94, d3: 1.06, d4: 1.18 },
  [ShipType.GAS_CARRIER]: { a: 14405, c: 0.71, d1: 0.81, d2: 0.91, d3: 1.09, d4: 1.19 },
  [ShipType.TANKER]: { a: 5247, c: 0.61, d1: 0.82, d2: 0.92, d3: 1.08, d4: 1.18 },
  [ShipType.CONTAINER_SHIP]: { a: 1984, c: 0.489, d1: 0.83, d2: 0.93, d3: 1.07, d4: 1.17 },
  [ShipType.GENERAL_CARGO_SHIP]: { a: 3166, c: 0.439, d1: 0.82, d2: 0.92, d3: 1.08, d4: 1.18 },
  [ShipType.REFRIGERATED_CARGO_CARRIER]: { a: 227, c: 0.233, d1: 0.78, d2: 0.88, d3: 1.12, d4: 1.22 },
  [ShipType.COMBINATION_CARRIER]: { a: 4085, c: 0.553, d1: 0.87, d2: 0.95, d3: 1.05, d4: 1.13 },
  [ShipType.LNG_CARRIER]: { a: 9842, c: 0.597, d1: 0.78, d2: 0.88, d3: 1.12, d4: 1.22 },
  [ShipType.RO_RO_CARGO_SHIP_VEHICLE_CARRIER]: { a: 3627, c: 0.59, d1: 0.77, d2: 0.87, d3: 1.13, d4: 1.23 },
  [ShipType.RO_RO_CARGO_SHIP]: { a: 1594, c: 0.445, d1: 0.76, d2: 0.86, d3: 1.14, d4: 1.24 },
  [ShipType.RO_RO_PASSENGER_SHIP]: { a: 902, c: 0.381, d1: 0.76, d2: 0.86, d3: 1.14, d4: 1.24 },
  [ShipType.CRUISE_PASSENGER_SHIP]: { a: 930, c: 0.383, d1: 0.87, d2: 0.95, d3: 1.05, d4: 1.13 }
};
