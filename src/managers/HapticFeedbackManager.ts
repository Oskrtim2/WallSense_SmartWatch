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
