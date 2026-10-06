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
