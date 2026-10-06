import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import LocalStorage from '../../managers/LocalStorage';
import { ScanResult } from '../../models/types';

export const HistoryScreen = ({ navigation }: any) => {
  const [history, setHistory] = useState<ScanResult[]>([]);

  useEffect(() => {
    const load = async () => {
      const h = await LocalStorage.getHistory();
      setHistory(h);
    };
    load();
  }, []);

  const clearHistory = async () => {
    await LocalStorage.clearHistory();
    setHistory([]);
  };

