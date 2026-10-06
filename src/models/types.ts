export enum RiskLevel {
  SAFE = 'SAFE',
  LOW = 'LOW',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL'
}

export enum Sensitivity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface SensorData {
  magnetometer: Vector3;
  accelerometer?: Vector3;
  gyroscope?: Vector3;
  timestamp: number;
  magnitude: number;
}

export interface ScanResult {
  id: string;
  date: number;
  duration: number;
