import { Vibration } from 'react-native';
import { RiskLevel } from '../models/types';
import SettingsManager from './SettingsManager';

class HapticFeedbackManager {
  private lastLevel: RiskLevel = RiskLevel.SAFE;
  private isVibrating = false;

  updateRiskLevel(level: RiskLevel) {
    const settings = SettingsManager.getSettings();
    if (!settings.vibrationEnabled) return;

    if (this.lastLevel === level) return;
    this.lastLevel = level;

    Vibration.cancel();
    this.isVibrating = false;

    switch (level) {
      case RiskLevel.SAFE:
        // No vibration
        break;
      case RiskLevel.LOW:
        // One short vibration
        Vibration.vibrate(100);
        break;
      case RiskLevel.WARNING:
        // Two medium vibrations
        Vibration.vibrate([0, 200, 100, 200]);
        break;
      case RiskLevel.CRITICAL:
        // Strong repeated vibration
        this.isVibrating = true;
        Vibration.vibrate([0, 300, 100], true); // true = repeat
        break;
    }
  }

  stop() {
    Vibration.cancel();
    this.isVibrating = false;
    this.lastLevel = RiskLevel.SAFE;
  }
}

export default new HapticFeedbackManager();
