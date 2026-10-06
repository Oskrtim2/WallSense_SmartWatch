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

