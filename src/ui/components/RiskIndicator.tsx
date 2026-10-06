import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RiskLevel } from '../../models/types';

interface Props {
  level: RiskLevel;
}

const getRiskInfo = (level: RiskLevel) => {
  switch (level) {
    case RiskLevel.SAFE:
      return { color: '#4CAF50', text: 'No significant anomaly detected' };
    case RiskLevel.LOW:
      return { color: '#FFC107', text: 'Minor magnetic variation' };
    case RiskLevel.WARNING:
      return { color: '#FF9800', text: 'Significant anomaly detected' };
    case RiskLevel.CRITICAL:
      return { color: '#F44336', text: 'Strong anomaly â€” avoid drilling' };
    default:
      return { color: '#9E9E9E', text: 'Unknown' };
  }
};

