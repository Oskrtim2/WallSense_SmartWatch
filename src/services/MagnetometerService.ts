import { Magnetometer } from 'expo-sensors';
import { Vector3 } from '../models/types';

class MagnetometerService {
  private subscription: any = null;

  async isAvailable(): Promise<boolean> {
    return await Magnetometer.isAvailableAsync();
  }

