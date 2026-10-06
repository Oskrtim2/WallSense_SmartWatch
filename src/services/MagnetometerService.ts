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

  stop() {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }
}

export default new MagnetometerService();
