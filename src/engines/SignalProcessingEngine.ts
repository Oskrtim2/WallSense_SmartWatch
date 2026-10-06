import { Vector3 } from '../models/types';

export class SignalProcessingEngine {
  private windowSize = 5;
  private history: number[] = [];

  calculateMagnitude(vector: Vector3): number {
    return Math.sqrt(
      Math.pow(vector.x, 2) +
      Math.pow(vector.y, 2) +
      Math.pow(vector.z, 2)
    );
  }

  // Moving average smoothing
  process(rawMagnitude: number): number {
    this.history.push(rawMagnitude);
    if (this.history.length > this.windowSize) {
      this.history.shift();
    }
    
    const sum = this.history.reduce((a, b) => a + b, 0);
    return sum / this.history.length;
  }
