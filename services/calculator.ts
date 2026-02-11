
import { BiofuelData, FossilData, CalculationResult, FossilFuelType, ShipType } from '../types';
import { FOSSIL_FUEL_STANDARDS, SUSTAINABILITY_THRESHOLD, CII_COEFFICIENTS, CII_REDUCTION_FACTORS } from '../constants';

export const calculateBlendedCf = (
  biofuel: BiofuelData,
  fossil: FossilData
): CalculationResult => {
  const fossilStandard = FOSSIL_FUEL_STANDARDS[fossil.type];
  
  // 1. Conversion Units
  const bioLcv_g = biofuel.lcv_kg / 1000; // MJ/kg -> MJ/g
  const bioMass_g = biofuel.mass * 1_000_000; // MT -> g
  const fossilMass_g = fossil.mass * 1_000_000; // MT -> g

  // 2. Sustainability Logic
  const isSustainabilityCompliant = biofuel.isCertified && biofuel.ghgIntensity <= SUSTAINABILITY_THRESHOLD;
  
  // Biofuel Cf calculation
  let bioCf = 0;
  if (isSustainabilityCompliant) {
    // Cf = Intensity [gCO2e/MJ] * LCV [MJ/g]
    bioCf = biofuel.ghgIntensity * bioLcv_g;
  } else {
    // FALLBACK: Default to fossil Cf if not compliant
    bioCf = fossilStandard.cf;
  }
  
  // Constrain Cf >= 0
  bioCf = Math.max(0, bioCf);

  // 3. Energy Calculations
  const bioEnergy = bioMass_g * bioLcv_g;
  const fossilEnergy = fossilMass_g * fossilStandard.lcv;
  const totalEnergy = bioEnergy + fossilEnergy;

  // 4. Ratios and Blended Cf (Weighted by Energy)
  const bioRatio = totalEnergy > 0 ? bioEnergy / totalEnergy : 0;
  const fossilRatio = totalEnergy > 0 ? fossilEnergy / totalEnergy : 0;

  const bioContribution = bioRatio * bioCf;
  const fossilContribution = fossilRatio * fossilStandard.cf;
  const blendedCf = bioContribution + fossilContribution;

  return {
    biofuel: {
      lcv: bioLcv_g,
      massG: bioMass_g,
      energy: bioEnergy,
      cf: bioCf,
      ratio: bioRatio,
      contribution: bioContribution,
      isSustainabilityCompliant
    },
    fossil: {
      type: fossil.type,
      lcv: fossilStandard.lcv,
      massG: fossilMass_g,
      energy: fossilEnergy,
      cf: fossilStandard.cf,
      ratio: fossilRatio,
      contribution: fossilContribution
    },
    total: {
      massG: bioMass_g + fossilMass_g,
      energy: totalEnergy,
      blendedCf: blendedCf
    }
  };
};

// Added missing calculateCII function to calculate maritime rating based on CO2 intensity
export const calculateCII = (
  type: ShipType,
  capacity: number,
  distance: number,
  totalCO2: number,
  year: number
) => {
  const coeffs = CII_COEFFICIENTS[type] || CII_COEFFICIENTS[ShipType.BULK_CARRIER];
  const actualCII = (totalCO2 * 1_000_000) / (capacity * distance);
  const refCII = coeffs.a * Math.pow(capacity, -coeffs.c);
  const reductionFactor = CII_REDUCTION_FACTORS[year] || 0;
  const requiredCII = refCII * ((100 - reductionFactor) / 100);

  let rating = 'E';
  if (actualCII <= requiredCII * coeffs.d1) rating = 'A';
  else if (actualCII <= requiredCII * coeffs.d2) rating = 'B';
  else if (actualCII <= requiredCII * coeffs.d3) rating = 'C';
  else if (actualCII <= requiredCII * coeffs.d4) rating = 'D';

  return { actualCII, requiredCII, rating };
};
