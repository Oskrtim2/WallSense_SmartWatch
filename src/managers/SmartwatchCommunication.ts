import { RiskLevel } from '../models/types';

class SmartwatchCommunication {
  private isConnected = false;
  private listeners: ((connected: boolean) => void)[] = [];

  subscribe(listener: (connected: boolean) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.isConnected));
