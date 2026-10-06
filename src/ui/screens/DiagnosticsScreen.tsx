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
        <Text>Gyroscope: Expected available</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Smartwatch</Text>
        <Text>Connected: {watchConnected ? 'Yes' : 'No'}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  header: { fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
  card: { padding: 15, backgroundColor: '#fff', borderRadius: 10, marginBottom: 15, elevation: 2 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  button: { backgroundColor: '#757575', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
