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
