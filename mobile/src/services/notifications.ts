import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const setupNotifications = async () => {
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  try {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    // Get the token
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push token:', token);

    return token;
  } catch (error) {
    console.error('Error setting up notifications:', error);
    return null;
  }
};

export const registerDeviceToken = async (token: string) => {
  try {
    await api.post('/users/device-token', {
      token,
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    });
  } catch (error) {
    console.error('Failed to register device token:', error);
  }
};

export const scheduleLocalNotification = async (title: string, body: string, data?: any) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // Show immediately
  });
};
