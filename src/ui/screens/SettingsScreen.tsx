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
        ))}
      </View>
      <Text style={styles.helperText}>Higher sensitivity = more false positives.</Text>

      <View style={{ marginVertical: 30 }} />
      <Text style={styles.settingLabel}>Smartwatch Connection</Text>
      <TouchableOpacity style={styles.actionBtn} onPress={toggleWatch}>
        <Text style={styles.actionBtnText}>
          {watchConnected ? 'Disconnect Simulated Watch' : 'Connect Simulated Watch'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.actionBtn, { marginTop: 20, backgroundColor: '#757575' }]} onPress={() => navigation.goBack()}>
        <Text style={styles.actionBtnText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  header: { fontSize: 32, fontWeight: 'bold', marginBottom: 30 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  settingLabel: { fontSize: 18, color: '#333' },
  helperText: { fontSize: 12, color: '#888', marginTop: 5, marginBottom: 15 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  sensitivityBtn: { padding: 10, borderRadius: 5, backgroundColor: '#e0e0e0', flex: 1, marginHorizontal: 5, alignItems: 'center' },
  sensitivityBtnActive: { backgroundColor: '#007AFF' },
  sensitivityText: { color: '#333' },
  sensitivityTextActive: { color: '#fff', fontWeight: 'bold' },
  actionBtn: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
