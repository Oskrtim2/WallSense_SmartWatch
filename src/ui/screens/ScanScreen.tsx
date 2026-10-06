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
