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

  return (
    <View style={{ marginVertical: 10 }}>
      <LineChart
        data={chartData}
        width={Dimensions.get('window').width - 40}
        height={220}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '0',
          },
        }}
        bezier
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
        withDots={false}
        withInnerLines={false}
        withOuterLines={true}
        withVerticalLabels={false}
        withHorizontalLabels={true}
      />
    </View>
  );
};
