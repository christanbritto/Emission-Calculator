
export enum FossilFuelType {
  HFO = 'HFO',
  LFO = 'LFO',
  MGO = 'MGO',
  VLSFO = 'VLSFO',
  LNG = 'LNG'
}

export enum BlendMode {
  GRADE = 'GRADE',
  MANUAL = 'MANUAL'
}

export enum BiofuelGrade {
  B24 = 'B24',
  B30 = 'B30',
  B50 = 'B50',
  B100 = 'B100',
  CUSTOM = 'CUSTOM'
}

// Added missing ShipType enum required for CII calculation and dashboard
export enum ShipType {
  BULK_CARRIER = 'Bulk carrier',
  GAS_CARRIER = 'Gas carrier',
  TANKER = 'Tanker',
  CONTAINER_SHIP = 'Container ship',
  GENERAL_CARGO_SHIP = 'General cargo ship',
  REFRIGERATED_CARGO_CARRIER = 'Refrigerated cargo carrier',
  COMBINATION_CARRIER = 'Combination carrier',
  LNG_CARRIER = 'LNG carrier',
  RO_RO_CARGO_SHIP_VEHICLE_CARRIER = 'Ro-ro cargo ship (vehicle carrier)',
  RO_RO_CARGO_SHIP = 'Ro-ro cargo ship',
  RO_RO_PASSENGER_SHIP = 'Ro-ro passenger ship',
  CRUISE_PASSENGER_SHIP = 'Cruise passenger ship'
}

export interface FossilFuelConfig {
  name: string;
  lcv: number; // MJ/g
  cf: number; // gCO2/gFuel
}

export interface BiofuelData {
  mass: number; // MT
  lcv_kg: number; // MJ/kg
  ghgIntensity: number; // gCO2e/MJ
  isCertified: boolean;
}

export interface FossilData {
  type: FossilFuelType;
  mass: number; // MT
}

export interface CalculationResult {
  biofuel: {
    lcv: number; // MJ/g
    massG: number; // g
    energy: number; // MJ
    cf: number;
    ratio: number;
    contribution: number;
    isSustainabilityCompliant: boolean;
  };
  fossil: {
    type: FossilFuelType;
    lcv: number; // MJ/g
    massG: number; // g
    energy: number; // MJ
    cf: number;
    ratio: number;
    contribution: number;
  };
  total: {
    massG: number;
    energy: number;
    blendedCf: number;
  };
}
