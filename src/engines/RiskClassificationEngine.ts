import { Sensitivity, RiskLevel } from '../models/types';

export class RiskClassificationEngine {
  private thresholds = {
    [Sensitivity.LOW]: { low: 10, warning: 30, critical: 60 },
    [Sensitivity.MEDIUM]: { low: 5, warning: 15, critical: 30 },
    [Sensitivity.HIGH]: { low: 2, warning: 8, critical: 15 }
  };

