import { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../store/authStore';
import { useNavigation } from '@react-navigation/native';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

// Demo clinic ID - in production, this would be selected by user
const DEFAULT_CLINIC_ID = '00000000-0000-0000-0000-000000000000';

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { register: registerUser, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser({
        ...data,
        clinicId: DEFAULT_CLINIC_ID,
      });

      Alert.alert(
        'Registration Successful',
        'Please check your email to verify your account.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message);
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
          <Text variant="headlineMedium" style={styles.title}>Create Account</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Register as a new patient
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.row}>
              <Controller
                control={control}
                name="firstName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="First Name"
                    mode="outlined"
                    placeholder="John"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.firstName}
                    style={[styles.input, styles.halfWidth]}
                  />
                )}
              />

              <Controller
                control={control}
                name="lastName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Last Name"
                    mode="outlined"
                    placeholder="Doe"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.lastName}
                    style={[styles.input, styles.halfWidth]}
                  />
                )}
              />
            </View>

            {(errors.firstName || errors.lastName) && (
              <Text variant="bodySmall" style={styles.errorText}>
                {errors.firstName?.message || errors.lastName?.message}
              </Text>
            )}

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Email Address"
                  mode="outlined"
                  placeholder="john.doe@example.com"
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
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Phone Number"
                  mode="outlined"
                  placeholder="+1-555-0100"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="phone-pad"
                  error={!!errors.phone}
                  style={styles.input}
                />
              )}
            />
            {errors.phone && (
              <Text variant="bodySmall" style={styles.errorText}>
                {errors.phone.message}
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

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Confirm Password"
                  mode="outlined"
                  placeholder="••••••••"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showConfirmPassword}
                  error={!!errors.confirmPassword}
                  right={
                    <TextInput.Icon
                      icon={showConfirmPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                  }
                  style={styles.input}
                />
              )}
            />
            {errors.confirmPassword && (
              <Text variant="bodySmall" style={styles.errorText}>
                {errors.confirmPassword.message}
              </Text>
            )}

            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              disabled={isLoading}
              style={styles.button}
            >
              Create Account
            </Button>
          </Card.Content>
        </Card>

        <View style={styles.footer}>
          <Text variant="bodyMedium">
            Already have an account?{' '}
            <Text 
              variant="bodyMedium" 
              style={styles.link}
              onPress={() => navigation.navigate('Login')}
            >
              Sign in
            </Text>
          </Text>
        </View>
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  input: {
    marginBottom: 8,
  },
  halfWidth: {
    flex: 1,
    marginHorizontal: 4,
  },
  errorText: {
    color: '#EF4444',
    marginBottom: 8,
    marginLeft: 12,
  },
  button: {
    marginTop: 16,
    paddingVertical: 6,
  },
  footer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  link: {
    color: '#2563EB',
    fontWeight: 'bold',
  },
});
