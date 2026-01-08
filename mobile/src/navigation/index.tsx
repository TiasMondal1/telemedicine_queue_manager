import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import PatientDashboardScreen from '../screens/patient/DashboardScreen';
import BookAppointmentScreen from '../screens/patient/BookAppointmentScreen';
import MyAppointmentsScreen from '../screens/patient/MyAppointmentsScreen';
import DoctorQueueScreen from '../screens/doctor/QueueScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Patient Tab Navigator
function PatientTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: 'gray',
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={PatientDashboardScreen}
        options={{ title: 'Dashboard', tabBarIcon: ({ color }) => '🏠' }}
      />
      <Tab.Screen 
        name="BookAppointment" 
        component={BookAppointmentScreen}
        options={{ title: 'Book', tabBarIcon: ({ color }) => '📅' }}
      />
      <Tab.Screen 
        name="MyAppointments" 
        component={MyAppointmentsScreen}
        options={{ title: 'Appointments', tabBarIcon: ({ color }) => '📋' }}
      />
    </Tab.Navigator>
  );
}

// Doctor Tab Navigator
function DoctorTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: 'gray',
      }}
    >
      <Tab.Screen 
        name="Queue" 
        component={DoctorQueueScreen}
        options={{ title: 'Queue' }}
      />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const { isAuthenticated, user, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          // Main App Stack - based on role
          <>
            {user?.role === 'PATIENT' && (
              <Stack.Screen name="PatientMain" component={PatientTabs} />
            )}
            {user?.role === 'DOCTOR' && (
              <Stack.Screen name="DoctorMain" component={DoctorTabs} />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
