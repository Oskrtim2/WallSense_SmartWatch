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
