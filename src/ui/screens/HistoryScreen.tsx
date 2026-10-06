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

  const renderItem = ({ item }: { item: ScanResult }) => (
    <View style={styles.card}>
      <Text style={styles.date}>{new Date(item.date).toLocaleString()}</Text>
      <Text>Duration: {(item.duration / 1000).toFixed(1)}s</Text>
      <Text>Max Deviation: {item.maxDeviation.toFixed(1)} ÂµT</Text>
      <Text>Highest Risk: {item.highestRiskLevel}</Text>
      <Text>Anomalies: {item.anomalyCount}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Scan History</Text>
      {history.length === 0 ? (
        <Text style={styles.empty}>No previous scans found.</Text>
      ) : (
        <FlatList 
          data={history}
          keyExtractor={item => item.id}
          renderItem={renderItem}
        />
