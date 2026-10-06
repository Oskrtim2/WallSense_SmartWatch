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
