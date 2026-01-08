import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useAuthStore } from '../../store/authStore';

export default function PatientDashboardScreen() {
  const { user, logout } = useAuthStore();

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Welcome, {user?.firstName}!
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        Patient Dashboard
      </Text>
      <Button mode="contained" onPress={logout} style={styles.button}>
        Logout
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    marginBottom: 10,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#666',
    marginBottom: 30,
  },
  button: {
    marginTop: 20,
  },
});
