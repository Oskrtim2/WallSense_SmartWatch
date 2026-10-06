import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import ScanManager from '../../managers/ScanManager';
import { RiskIndicator } from '../components/RiskIndicator';
import { SignalGraph } from '../components/SignalGraph';
import { RiskLevel } from '../../models/types';
import SmartwatchCommunication from '../../managers/SmartwatchCommunication';

export const ScanScreen = ({ route, navigation }: any) => {
  const { baseline } = route.params;
  const [data, setData] = useState({
    magnitude: baseline,
    deviation: 0,
    risk: RiskLevel.SAFE
  });
  const [graphData, setGraphData] = useState<number[]>([baseline]);
  const [watchConnected, setWatchConnected] = useState(false);

  useEffect(() => {
    const unsubScan = ScanManager.subscribe((newData) => {
      setData(newData);
      setGraphData(prev => {
        const next = [...prev, newData.magnitude];
        if (next.length > 50) next.shift(); // keep last 50 points
        return next;
      });
      SmartwatchCommunication.sendRiskLevel(newData.risk);
    });

    const unsubWatch = SmartwatchCommunication.subscribe(setWatchConnected);
    setWatchConnected(SmartwatchCommunication.getConnectionStatus());

    ScanManager.startScan(baseline);

    return () => {
      unsubScan();
      unsubWatch();
      ScanManager.stopScan();
    };
  }, [baseline]);

  const stopScanning = async () => {
    await ScanManager.stopScan();
    navigation.popToTop();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ alignItems: 'center' }}>
      <Text style={styles.header}>Scanning Mode</Text>
      <Text style={styles.status}>Smartwatch: {watchConnected ? 'Connected' : 'Disconnected'}</Text>
      
      <RiskIndicator level={data.risk} />

      <View style={styles.statsContainer}>
        <Text style={styles.statText}>Baseline: {baseline.toFixed(1)} ÂµT</Text>
        <Text style={styles.statText}>Current: {data.magnitude.toFixed(1)} ÂµT</Text>
        <Text style={styles.statText}>Deviation: {data.deviation.toFixed(1)} ÂµT</Text>
      </View>

      <SignalGraph data={graphData} />

      <TouchableOpacity style={styles.button} onPress={stopScanning}>
        <Text style={styles.buttonText}>Stop Scan & Save</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, marginTop: 20 },
  status: { fontSize: 14, color: '#666', marginBottom: 20 },
  statsContainer: { width: '100%', padding: 20, backgroundColor: '#fff', borderRadius: 10, marginVertical: 20, elevation: 2 },
  statText: { fontSize: 16, marginBottom: 5, color: '#333' },
  button: { backgroundColor: '#F44336', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center', marginVertical: 20 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' }
});
