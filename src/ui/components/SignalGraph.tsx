import React from 'react';
import { View, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

interface Props {
  data: number[];
}

export const SignalGraph: React.FC<Props> = ({ data }) => {
  const chartData = {
    labels: [],
    datasets: [
      {
        data: data.length > 0 ? data : [0],
        strokeWidth: 2,
      },
    ],
  };
