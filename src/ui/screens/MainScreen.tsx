import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MagnetometerService from '../../services/MagnetometerService';
import SmartwatchCommunication from '../../managers/SmartwatchCommunication';

export const MainScreen = ({ navigation }: any) => {
  const [hasMagnetometer, setHasMagnetometer] = useState(false);
  const [watchConnected, setWatchConnected] = useState(false);

  useEffect(() => {
    const checkSensors = async () => {
      const isAvail = await MagnetometerService.isAvailable();
      setHasMagnetometer(isAvail);
    };
    checkSensors();

    const unsubscribeWatch = SmartwatchCommunication.subscribe(setWatchConnected);
    return () => unsubscribeWatch();
  }, []);

  const handleStart = () => {
    Alert.alert(
      "Safety Warning",
      "WallSense detects magnetic-field anomalies using your phone's built-in sensors. It cannot reliably identify every hidden cable, pipe, or structure and cannot guarantee that a wall is safe to drill. Always verify potential hazards with appropriate professional equipment before drilling.",
      [
        { text: "I Understand", onPress: () => navigation.navigate('Calibration') }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WallSense</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Magnetometer: {hasMagnetometer ? 'âœ… Available' : 'âŒ Not Available'}
        </Text>
        <Text style={styles.statusText}>
          Smartwatch: {watchConnected ? 'âœ… Connected' : 'âŒ Disconnected'}
        </Text>
      </View>

      {!hasMagnetometer && (
        <Text style={styles.errorText}>
          Warning: Your device does not have a usable magnetometer. Magnetic scanning cannot be performed.
        </Text>
      )}

      <TouchableOpacity 
        style={[styles.button, !hasMagnetometer && styles.buttonDisabled]} 
        onPress={handleStart}
        disabled={!hasMagnetometer}
      >
        <Text style={styles.buttonText}>Start Calibration & Scan</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.secondaryButton} 
        onPress={() => navigation.navigate('History')}
      >
        <Text style={styles.secondaryButtonText}>View History</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.secondaryButton} 
        onPress={() => navigation.navigate('Settings')}
      >
        <Text style={styles.secondaryButtonText}>Settings</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.secondaryButton} 
        onPress={() => navigation.navigate('Diagnostics')}
      >
        <Text style={styles.secondaryButtonText}>Diagnostics</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 42, fontWeight: 'bold', marginBottom: 40, color: '#333' },
  statusContainer: { marginBottom: 30, padding: 15, backgroundColor: '#fff', borderRadius: 10, width: '100%', elevation: 2 },
  statusText: { fontSize: 16, marginBottom: 5, color: '#555' },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 20 },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center', marginBottom: 15 },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  secondaryButton: { padding: 15, borderRadius: 10, width: '100%', alignItems: 'center', marginBottom: 10, backgroundColor: '#e0e0e0' },
  secondaryButtonText: { color: '#333', fontSize: 16, fontWeight: '500' }
});
