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

  async loadSettings(): Promise<AppSettings> {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Error loading settings', e);
    }
    return this.settings;
  }

  async saveSettings(newSettings: Partial<AppSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Error saving settings', e);
    }
  }

  getSettings(): AppSettings {
    return this.settings;
  }
}

export default new SettingsManager();
