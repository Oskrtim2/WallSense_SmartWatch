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
