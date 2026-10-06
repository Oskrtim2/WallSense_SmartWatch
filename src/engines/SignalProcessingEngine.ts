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
