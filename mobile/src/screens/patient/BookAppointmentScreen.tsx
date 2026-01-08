import { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, Chip, RadioButton } from 'react-native-paper';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { format } from 'date-fns';
import { appointmentService, doctorService } from '../../services/appointments';

export default function BookAppointmentScreen() {
  const navigation = useNavigation<any>();
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [appointmentType, setAppointmentType] = useState<'IN_PERSON' | 'VIDEO'>('IN_PERSON');

  // Get doctors
  const { data: doctorsData, isLoading: loadingDoctors } = useQuery({
    queryKey: ['doctors', { isAcceptingAppointments: true }],
    queryFn: () => doctorService.getDoctors({ isAcceptingAppointments: true }),
  });

  // Get available slots
  const { data: slotsData, isLoading: loadingSlots } = useQuery({
    queryKey: ['available-slots', selectedDoctor, selectedDate],
    queryFn: () => appointmentService.getAvailableSlots(selectedDoctor!, selectedDate!),
    enabled: !!selectedDoctor && !!selectedDate,
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: appointmentService.createAppointment,
    onSuccess: () => {
      Alert.alert('Success', 'Appointment booked successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('MyAppointments') },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to book appointment');
    },
  });

  const handleBookAppointment = () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) {
      Alert.alert('Error', 'Please select doctor, date, and time');
      return;
    }

    Alert.alert(
      'Confirm Booking',
      `Book appointment on ${format(new Date(selectedDate), 'MMMM dd, yyyy')} at ${selectedTime}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () =>
            createAppointmentMutation.mutate({
              doctorId: selectedDoctor,
              scheduledDate: selectedDate,
              scheduledTime: selectedTime,
              appointmentType,
            }),
        },
      ]
    );
  };

  const doctors = doctorsData?.doctors || [];
  const slots = slotsData?.slots || [];
  const selectedDoctorData = doctors.find((d: any) => d.id === selectedDoctor);

  // Get today and max date
  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateString = maxDate.toISOString().split('T')[0];

  return (
    <ScrollView style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Book Appointment
      </Text>

      {/* Step 1: Select Doctor */}
      <Card style={styles.card}>
        <Card.Title title="1. Select Doctor" />
        <Card.Content>
          {loadingDoctors ? (
            <Text>Loading doctors...</Text>
          ) : doctors.length === 0 ? (
            <Text style={styles.emptyText}>No doctors available</Text>
          ) : (
            doctors.map((doctor: any) => (
              <Card
                key={doctor.id}
                style={[
                  styles.doctorCard,
                  selectedDoctor === doctor.id && styles.selectedCard,
                ]}
                onPress={() => {
                  setSelectedDoctor(doctor.id);
                  setSelectedDate(null);
                  setSelectedTime(null);
                }}
              >
                <Card.Content>
                  <Text variant="titleMedium">
                    Dr. {doctor.user.firstName} {doctor.user.lastName}
                  </Text>
                  <Text variant="bodySmall" style={styles.specialization}>
                    {doctor.specialization}
                  </Text>
                  <View style={styles.doctorInfo}>
                    <Chip icon="star" compact>
                      {doctor.rating.toFixed(1)}
                    </Chip>
                    <Chip compact>${doctor.consultationFee}</Chip>
                    {doctor.videoConsultationEnabled && (
                      <Chip icon="video" compact>
                        Video
                      </Chip>
                    )}
                  </View>
                </Card.Content>
              </Card>
            ))
          )}
        </Card.Content>
      </Card>

      {/* Step 2: Select Date */}
      {selectedDoctor && (
        <Card style={styles.card}>
          <Card.Title title="2. Select Date" />
          <Card.Content>
            <Calendar
              minDate={today}
              maxDate={maxDateString}
              onDayPress={(day: any) => {
                setSelectedDate(day.dateString);
                setSelectedTime(null);
              }}
              markedDates={{
                [selectedDate || '']: { selected: true, selectedColor: '#2563EB' },
              }}
              theme={{
                selectedDayBackgroundColor: '#2563EB',
                todayTextColor: '#2563EB',
                arrowColor: '#2563EB',
              }}
            />

            {selectedDate && (
              <View style={styles.typeSelector}>
                <Text variant="titleSmall" style={styles.typeLabel}>
                  Appointment Type
                </Text>
                <RadioButton.Group
                  onValueChange={(value) => setAppointmentType(value as any)}
                  value={appointmentType}
                >
                  <View style={styles.radioRow}>
                    <RadioButton.Item label="In-Person" value="IN_PERSON" />
                    <RadioButton.Item label="Video Call" value="VIDEO" />
                  </View>
                </RadioButton.Group>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Step 3: Select Time */}
      {selectedDate && (
        <Card style={styles.card}>
          <Card.Title title="3. Select Time" />
          <Card.Content>
            {loadingSlots ? (
              <Text>Loading slots...</Text>
            ) : slots.length === 0 ? (
              <Text style={styles.emptyText}>No available slots for this date</Text>
            ) : (
              <View style={styles.timeSlots}>
                {slots.map((slot: string) => (
                  <Chip
                    key={slot}
                    mode={selectedTime === slot ? 'flat' : 'outlined'}
                    selected={selectedTime === slot}
                    onPress={() => setSelectedTime(slot)}
                    style={styles.timeChip}
                  >
                    {slot}
                  </Chip>
                ))}
              </View>
            )}

            {selectedTime && selectedDoctorData && (
              <Card style={styles.summaryCard}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.summaryTitle}>
                    Appointment Summary
                  </Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Doctor:</Text>
                    <Text>Dr. {selectedDoctorData.user.lastName}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Date:</Text>
                    <Text>{format(new Date(selectedDate), 'MMMM dd, yyyy')}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Time:</Text>
                    <Text>{selectedTime}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Type:</Text>
                    <Text>{appointmentType === 'VIDEO' ? 'Video Consultation' : 'In-Person'}</Text>
                  </View>
                  <View style={[styles.summaryRow, styles.feeRow]}>
                    <Text style={styles.feeLabel}>Fee:</Text>
                    <Text style={styles.feeAmount}>${selectedDoctorData.consultationFee}</Text>
                  </View>
                  <Button
                    mode="contained"
                    onPress={handleBookAppointment}
                    loading={createAppointmentMutation.isPending}
                    disabled={createAppointmentMutation.isPending}
                    style={styles.confirmButton}
                  >
                    Confirm Booking
                  </Button>
                </Card.Content>
              </Card>
            )}
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    padding: 20,
    paddingBottom: 10,
    fontWeight: 'bold',
  },
  card: {
    margin: 16,
    marginTop: 0,
  },
  doctorCard: {
    marginVertical: 8,
  },
  selectedCard: {
    borderColor: '#2563EB',
    borderWidth: 2,
  },
  specialization: {
    color: '#666',
    marginTop: 4,
  },
  doctorInfo: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    padding: 16,
  },
  typeSelector: {
    marginTop: 16,
  },
  typeLabel: {
    marginBottom: 8,
  },
  radioRow: {
    flexDirection: 'row',
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  timeChip: {
    marginBottom: 8,
  },
  summaryCard: {
    marginTop: 16,
    backgroundColor: '#EFF6FF',
  },
  summaryTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontWeight: '600',
  },
  feeRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  feeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  feeAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  confirmButton: {
    marginTop: 16,
  },
});
