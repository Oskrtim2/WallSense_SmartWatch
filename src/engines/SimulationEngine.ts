import { Vector3 } from '../models/types';

export class SimulationEngine {
  private interval: any = null;
  private time = 0;
  private baseMagneticField = 45; // Microteslas

  start(onUpdate: (data: Vector3) => void) {
    if (this.interval) return;
    this.time = 0;
    this.interval = setInterval(() => {
      this.time += 0.1;
      
      // Simulate base environment noise
      const noiseX = (Math.random() - 0.5) * 2;
      const noiseY = (Math.random() - 0.5) * 2;
      const noiseZ = (Math.random() - 0.5) * 2;

      // Simulate an anomaly passing by (e.g. at time = 5 to 10 seconds)
      let anomaly = 0;
      if (this.time > 5 && this.time < 10) {
        // Gaussian bell curve shape anomaly
        anomaly = 40 * Math.exp(-Math.pow(this.time - 7.5, 2) / 2);
      } else if (this.time > 15 && this.time < 18) {
        // Sudden spike
        anomaly = 80 * Math.exp(-Math.pow(this.time - 16.5, 2) / 0.5);
      }

      const vec = {
        x: (this.baseMagneticField / Math.sqrt(3)) + noiseX + (anomaly / Math.sqrt(3)),
        y: (this.baseMagneticField / Math.sqrt(3)) + noiseY + (anomaly / Math.sqrt(3)),
        z: (this.baseMagneticField / Math.sqrt(3)) + noiseZ + (anomaly / Math.sqrt(3)),
