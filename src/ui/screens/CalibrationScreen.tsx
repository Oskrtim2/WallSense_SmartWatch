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
      
