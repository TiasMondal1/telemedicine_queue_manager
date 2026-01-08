import { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, Card, Checkbox } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../store/authStore';
import { useNavigation } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleBiometricLogin = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert('Biometric Authentication', 'Biometric authentication is not available on this device');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login with biometrics',
        fallbackLabel: 'Use password',
      });

      if (result.success) {
        const email = await SecureStore.getItemAsync('savedEmail');
        const password = await SecureStore.getItemAsync('savedPassword');

        if (email && password) {
          await login(email, password);
        } else {
          Alert.alert('Error', 'No saved credentials found');
        }
      }
    } catch (error) {
      console.error('Biometric error:', error);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);

      // Save credentials for biometric login if remember me is checked
      if (rememberMe) {
        await SecureStore.setItemAsync('savedEmail', data.email);
        await SecureStore.setItemAsync('savedPassword', data.password);
        await SecureStore.setItemAsync('biometricsEnabled', 'true');
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="displaySmall" style={styles.logo}>🏥</Text>
          <Text variant="headlineMedium" style={styles.title}>Welcome Back</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Sign in to your Telemedicine Queue Manager account
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Email Address"
                  mode="outlined"
                  placeholder="doctor@example.com"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={!!errors.email}
                  style={styles.input}
                />
              )}
            />
            {errors.email && (
              <Text variant="bodySmall" style={styles.errorText}>
                {errors.email.message}
              </Text>
            )}

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Password"
                  mode="outlined"
                  placeholder="••••••••"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showPassword}
                  error={!!errors.password}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                  style={styles.input}
                />
              )}
            />
            {errors.password && (
              <Text variant="bodySmall" style={styles.errorText}>
                {errors.password.message}
              </Text>
            )}

            <View style={styles.optionsRow}>
              <View style={styles.checkboxContainer}>
                <Checkbox
                  status={rememberMe ? 'checked' : 'unchecked'}
                  onPress={() => setRememberMe(!rememberMe)}
                />
                <Text variant="bodyMedium">Remember me</Text>
              </View>
            </View>

            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              disabled={isLoading}
              style={styles.button}
            >
              Sign In
            </Button>

            <Button
              mode="outlined"
              onPress={handleBiometricLogin}
              icon="fingerprint"
              style={styles.biometricButton}
            >
              Login with Biometrics
            </Button>
          </Card.Content>
        </Card>

        <View style={styles.footer}>
          <Text variant="bodyMedium">
            Don't have an account?{' '}
            <Text 
              variant="bodyMedium" 
              style={styles.link}
              onPress={() => navigation.navigate('Register')}
            >
              Sign up
            </Text>
          </Text>
        </View>

        <Card style={styles.demoCard}>
          <Card.Content>
            <Text variant="bodySmall" style={styles.demoTitle}>Demo Credentials:</Text>
            <Text variant="bodySmall" style={styles.demoText}>
              <Text style={styles.bold}>Admin:</Text> admin@healthcareplus.com
            </Text>
            <Text variant="bodySmall" style={styles.demoText}>
              <Text style={styles.bold}>Doctor:</Text> dr.smith@healthcareplus.com
            </Text>
            <Text variant="bodySmall" style={styles.demoText}>
              <Text style={styles.bold}>Patient:</Text> patient1@example.com
            </Text>
            <Text variant="bodySmall" style={styles.demoText}>
              <Text style={styles.bold}>Password:</Text> password123
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    fontSize: 48,
    marginBottom: 10,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
  },
  card: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 8,
  },
  errorText: {
    color: '#EF4444',
    marginBottom: 8,
    marginLeft: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
  },
  biometricButton: {
    marginTop: 12,
  },
  footer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  link: {
    color: '#2563EB',
    fontWeight: 'bold',
  },
  demoCard: {
    backgroundColor: '#EFF6FF',
    marginBottom: 20,
  },
  demoTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1E40AF',
  },
  demoText: {
    color: '#1E40AF',
    marginBottom: 4,
  },
  bold: {
    fontWeight: 'bold',
  },
});
