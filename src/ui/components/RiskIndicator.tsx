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

export const RiskIndicator: React.FC<Props> = ({ level }) => {
  const { color, text } = getRiskInfo(level);

  return (
    <View style={styles.container}>
      <View style={[styles.indicator, { backgroundColor: color }]}>
        <Text style={styles.levelText}>{level}</Text>
      </View>
      <Text style={styles.descriptionText}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  indicator: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  levelText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
  },
  descriptionText: {
    marginTop: 15,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
