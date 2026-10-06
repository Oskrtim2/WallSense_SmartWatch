import { Magnetometer } from 'expo-sensors';
import { Vector3 } from '../models/types';

class MagnetometerService {
  private subscription: any = null;

  async isAvailable(): Promise<boolean> {
    return await Magnetometer.isAvailableAsync();
  }

  setUpdateInterval(intervalMs: number) {
    Magnetometer.setUpdateInterval(intervalMs);
  }

  start(onUpdate: (data: Vector3) => void) {
    if (this.subscription) return;
    this.subscription = Magnetometer.addListener(onUpdate);
  }

