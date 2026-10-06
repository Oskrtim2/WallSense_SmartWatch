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
  }

  connect() {
    // Mock connection
    setTimeout(() => {
      this.isConnected = true;
      this.notify();
    }, 1000);
  }

  disconnect() {
    this.isConnected = false;
    this.notify();
  }

  getConnectionStatus() {
    return this.isConnected;
  }

  sendRiskLevel(level: RiskLevel) {
    if (!this.isConnected) return;
    // In a real app, send data via Bluetooth/Native Modules
    console.log(`[Smartwatch] Risk Level updated: ${level}`);
  }
}

export default new SmartwatchCommunication();
