import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, Sensitivity } from '../models/types';

const SETTINGS_KEY = '@WallSense_settings';

export const DEFAULT_SETTINGS: AppSettings = {
  sensitivity: Sensitivity.MEDIUM,
  simulationMode: false,
  hapticIntensity: 1,
  vibrationEnabled: true,
};

class SettingsManager {
  private settings: AppSettings = { ...DEFAULT_SETTINGS };

