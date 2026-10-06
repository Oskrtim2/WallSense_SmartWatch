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
      )}
      <TouchableOpacity style={styles.button} onPress={clearHistory}>
        <Text style={styles.buttonText}>Clear History</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, { backgroundColor: '#757575', marginTop: 10 }]} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  header: { fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
  card: { padding: 15, backgroundColor: '#fff', borderRadius: 10, marginBottom: 10, elevation: 2 },
  date: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  empty: { fontSize: 16, color: '#888', textAlign: 'center', marginTop: 50 },
  button: { backgroundColor: '#F44336', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
