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
    this.anomalyCount = 0;
    this.mapData = [];

    SignalProcessingEngine.reset();
    const settings = SettingsManager.getSettings();

    const onUpdate = (vector: Vector3) => {
      if (!this.isScanning) return;

      const magnitude = SignalProcessingEngine.calculateMagnitude(vector);
      const smoothed = SignalProcessingEngine.process(magnitude);
      const deviation = SignalProcessingEngine.getDeviation(smoothed, this.baseline);
      const risk = RiskClassificationEngine.classifyDeviation(deviation, settings.sensitivity);

      if (magnitude > this.maxMagneticField) this.maxMagneticField = magnitude;
      if (Math.abs(deviation) > Math.abs(this.maxDeviation)) this.maxDeviation = deviation;
      
      if (this.isHigherRisk(risk, this.highestRiskLevel)) {
        this.highestRiskLevel = risk;
      }

      if (risk === RiskLevel.WARNING || risk === RiskLevel.CRITICAL) {
        if (this.mapData.length > 0 && this.mapData[this.mapData.length - 1].risk !== risk) {
          this.anomalyCount++;
        }
      }

      this.mapData.push({
        time: Date.now() - this.startTime,
        deviation,
        risk
      });

      HapticFeedbackManager.updateRiskLevel(risk);

      this.notifyListeners({
        raw: vector,
        magnitude,
        smoothed,
        deviation,
        risk
      });
    };

    if (settings.simulationMode) {
      SimulationEngine.start(onUpdate);
    } else {
      MagnetometerService.setUpdateInterval(100);
      MagnetometerService.start(onUpdate);
    }
  }

  private isHigherRisk(a: RiskLevel, b: RiskLevel): boolean {
    const order = {
      [RiskLevel.SAFE]: 0,
      [RiskLevel.LOW]: 1,
      [RiskLevel.WARNING]: 2,
      [RiskLevel.CRITICAL]: 3
    };
    return order[a] > order[b];
  }

  async stopScan(): Promise<ScanResult | null> {
    if (!this.isScanning) return null;
    this.isScanning = false;
    
    MagnetometerService.stop();
    SimulationEngine.stop();
    HapticFeedbackManager.stop();

    const duration = Date.now() - this.startTime;

    const result: ScanResult = {
      id: Date.now().toString(),
      date: Date.now(),
      duration,
      calibrationBaseline: this.baseline,
      maxMagneticField: this.maxMagneticField,
      maxDeviation: this.maxDeviation,
      anomalyCount: this.anomalyCount,
      highestRiskLevel: this.highestRiskLevel,
      mapData: this.mapData
    };

    await LocalStorage.saveScan(result);
    return result;
  }
}

export default new ScanManager();
