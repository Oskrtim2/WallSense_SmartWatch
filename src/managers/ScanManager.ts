import MagnetometerService from '../services/MagnetometerService';
import SimulationEngine from '../engines/SimulationEngine';
import SignalProcessingEngine from '../engines/SignalProcessingEngine';
import RiskClassificationEngine from '../engines/RiskClassificationEngine';
import CalibrationEngine from '../engines/CalibrationEngine';
import HapticFeedbackManager from './HapticFeedbackManager';
import LocalStorage from './LocalStorage';
import SettingsManager from './SettingsManager';
import { Vector3, RiskLevel, ScanResult } from '../models/types';

export class ScanManager {
  private isScanning = false;
  private startTime = 0;
  private baseline = 0;
  private maxMagneticField = 0;
  private maxDeviation = 0;
  private highestRiskLevel = RiskLevel.SAFE;
  private anomalyCount = 0;
  private mapData: { time: number; deviation: number; risk: RiskLevel }[] = [];

  private listeners: ((data: {
    raw: Vector3;
    magnitude: number;
    smoothed: number;
    deviation: number;
    risk: RiskLevel;
  }) => void)[] = [];

  subscribe(listener: (data: any) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(data: any) {
    this.listeners.forEach(l => l(data));
  }

  async startScan(calibratedBaseline: number) {
    this.baseline = calibratedBaseline;
    this.isScanning = true;
    this.startTime = Date.now();
    this.maxMagneticField = 0;
    this.maxDeviation = 0;
    this.highestRiskLevel = RiskLevel.SAFE;
