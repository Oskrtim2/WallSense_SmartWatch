import { Sensitivity, RiskLevel } from '../models/types';

export class RiskClassificationEngine {
  private thresholds = {
    [Sensitivity.LOW]: { low: 10, warning: 30, critical: 60 },
    [Sensitivity.MEDIUM]: { low: 5, warning: 15, critical: 30 },
    [Sensitivity.HIGH]: { low: 2, warning: 8, critical: 15 }
  };

  classifyDeviation(deviation: number, sensitivity: Sensitivity): RiskLevel {
    const thresh = this.thresholds[sensitivity];
    const absDeviation = Math.abs(deviation);

    if (absDeviation >= thresh.critical) {
      return RiskLevel.CRITICAL;
    } else if (absDeviation >= thresh.warning) {
      return RiskLevel.WARNING;
    } else if (absDeviation >= thresh.low) {
      return RiskLevel.LOW;
    } else {
      return RiskLevel.SAFE;
    }
  }
}

export default new RiskClassificationEngine();
