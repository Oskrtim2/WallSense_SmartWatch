export class CalibrationEngine {
  private measurements: number[] = [];
  private isCalibrating = false;

  startCalibration() {
    this.measurements = [];
    this.isCalibrating = true;
  }

  addMeasurement(magnitude: number) {
    if (this.isCalibrating) {
      this.measurements.push(magnitude);
    }
  }

  finishCalibration(): { baseline: number; variance: number } {
    this.isCalibrating = false;
    
    if (this.measurements.length === 0) {
      return { baseline: 45, variance: 0 }; // Default approx Earth's magnetic field in microteslas
    }

    const sum = this.measurements.reduce((a, b) => a + b, 0);
    const baseline = sum / this.measurements.length;

    // Calculate variance
    const squaredDiffs = this.measurements.map(m => Math.pow(m - baseline, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / this.measurements.length;

    return { baseline, variance };
  }

  isCurrentlyCalibrating() {
    return this.isCalibrating;
  }
}

export default new CalibrationEngine();
