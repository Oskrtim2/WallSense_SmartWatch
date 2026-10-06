import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MagnetometerService from '../../services/MagnetometerService';
import CalibrationEngine from '../../engines/CalibrationEngine';
import SignalProcessingEngine from '../../engines/SignalProcessingEngine';

export const CalibrationScreen = ({ navigation }: any) => {
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [progress, setProgress] = useState(0);

  const startCalibration = () => {
    setIsCalibrating(true);
    CalibrationEngine.startCalibration();
    MagnetometerService.setUpdateInterval(100);
    
    let count = 0;
    MagnetometerService.start((data) => {
      const mag = SignalProcessingEngine.calculateMagnitude(data);
      CalibrationEngine.addMeasurement(mag);
      count++;
      setProgress(count / 30); // ~3 seconds calibration
      
      if (count >= 30) {
        MagnetometerService.stop();
        const { baseline } = CalibrationEngine.finishCalibration();
        setIsCalibrating(false);
        navigation.replace('Scan', { baseline });
      }
    });
  };

  useEffect(() => {
    return () => MagnetometerService.stop();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calibration</Text>
      <Text style={styles.instructions}>
        Hold the phone near the wall where you intend to scan. Keep it relatively stable.
      </Text>
      
      {isCalibrating ? (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Calibrating... {Math.round(progress * 100)}%</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.button} onPress={startCalibration}>
          <Text style={styles.buttonText}>Start Calibration</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
  instructions: { fontSize: 18, textAlign: 'center', marginBottom: 40, color: '#555' },
  button: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  progressContainer: { alignItems: 'center' },
  progressText: { fontSize: 24, fontWeight: 'bold', color: '#007AFF' }
});
