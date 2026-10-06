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
