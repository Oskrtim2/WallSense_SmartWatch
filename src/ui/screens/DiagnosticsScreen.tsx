import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import MagnetometerService from '../../services/MagnetometerService';
import SmartwatchCommunication from '../../managers/SmartwatchCommunication';

export const DiagnosticsScreen = ({ navigation }: any) => {
  const [magData, setMagData] = useState({ x: 0, y: 0, z: 0 });
  const [magAvail, setMagAvail] = useState(false);
  const [watchConnected, setWatchConnected] = useState(SmartwatchCommunication.getConnectionStatus());

  useEffect(() => {
    const check = async () => {
      const avail = await MagnetometerService.isAvailable();
      setMagAvail(avail);
      if (avail) {
        MagnetometerService.setUpdateInterval(500);
        MagnetometerService.start(setMagData);
      }
    };
    check();

    const unsubWatch = SmartwatchCommunication.subscribe(setWatchConnected);

    return () => {
      MagnetometerService.stop();
      unsubWatch();
    };
  }, []);

  const totalMag = Math.sqrt(Math.pow(magData.x, 2) + Math.pow(magData.y, 2) + Math.pow(magData.z, 2));

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Diagnostics</Text>

      <View style={styles.card}>
        <Text style={styles.title}>Magnetometer</Text>
        <Text>Available: {magAvail ? 'Yes' : 'No'}</Text>
        <Text>X: {magData.x.toFixed(2)} ÂµT</Text>
        <Text>Y: {magData.y.toFixed(2)} ÂµT</Text>
        <Text>Z: {magData.z.toFixed(2)} ÂµT</Text>
        <Text style={{ fontWeight: 'bold', marginTop: 10 }}>Total: {totalMag.toFixed(2)} ÂµT</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Motion Sensors</Text>
        <Text>Accelerometer: Expected available</Text>
