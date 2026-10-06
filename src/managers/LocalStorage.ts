import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScanResult } from '../models/types';

const HISTORY_KEY = '@WallSense_history';

class LocalStorage {
  async saveScan(scan: ScanResult) {
    try {
      const history = await this.getHistory();
      history.unshift(scan);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Error saving scan', e);
    }
  }

  async getHistory(): Promise<ScanResult[]> {
    try {
      const stored = await AsyncStorage.getItem(HISTORY_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error getting history', e);
    }
    return [];
  }

  async clearHistory() {
    try {
      await AsyncStorage.removeItem(HISTORY_KEY);
    } catch (e) {
      console.error('Error clearing history', e);
    }
  }
}

export default new LocalStorage();
