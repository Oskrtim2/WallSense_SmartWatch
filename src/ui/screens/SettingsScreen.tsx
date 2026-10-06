import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import SettingsManager from '../../managers/SettingsManager';
import { AppSettings, Sensitivity } from '../../models/types';
import SmartwatchCommunication from '../../managers/SmartwatchCommunication';

export const SettingsScreen = ({ navigation }: any) => {
  const [settings, setSettings] = useState<AppSettings>(SettingsManager.getSettings());
  const [watchConnected, setWatchConnected] = useState(SmartwatchCommunication.getConnectionStatus());

  useEffect(() => {
    const load = async () => {
      const s = await SettingsManager.loadSettings();
      setSettings(s);
    };
    load();
    const unsub = SmartwatchCommunication.subscribe(setWatchConnected);
    return () => unsub();
  }, []);

  const updateSetting = async (key: keyof AppSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await SettingsManager.saveSettings(newSettings);
  };

  const toggleWatch = () => {
    if (watchConnected) {
      SmartwatchCommunication.disconnect();
    } else {
      SmartwatchCommunication.connect();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Settings</Text>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Simulation Mode</Text>
        <Switch 
          value={settings.simulationMode} 
          onValueChange={(val) => updateSetting('simulationMode', val)} 
        />
      </View>
      <Text style={styles.helperText}>Use simulated data without scanning a wall.</Text>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Haptic Feedback (Phone)</Text>
        <Switch 
          value={settings.vibrationEnabled} 
          onValueChange={(val) => updateSetting('vibrationEnabled', val)} 
        />
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Sensitivity: {settings.sensitivity}</Text>
      </View>
      <View style={styles.buttonRow}>
        {Object.values(Sensitivity).map(s => (
          <TouchableOpacity 
            key={s} 
            style={[styles.sensitivityBtn, settings.sensitivity === s && styles.sensitivityBtnActive]}
            onPress={() => updateSetting('sensitivity', s)}
          >
            <Text style={[styles.sensitivityText, settings.sensitivity === s && styles.sensitivityTextActive]}>{s}</Text>
          </TouchableOpacity>
