import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MainScreen } from './src/ui/screens/MainScreen';
import { CalibrationScreen } from './src/ui/screens/CalibrationScreen';
import { ScanScreen } from './src/ui/screens/ScanScreen';
import { HistoryScreen } from './src/ui/screens/HistoryScreen';
import { SettingsScreen } from './src/ui/screens/SettingsScreen';
import { DiagnosticsScreen } from './src/ui/screens/DiagnosticsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Main" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainScreen} />
        <Stack.Screen name="Calibration" component={CalibrationScreen} />
        <Stack.Screen name="Scan" component={ScanScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Diagnostics" component={DiagnosticsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
