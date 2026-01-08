import { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, RefreshControl } from 'react-native';
import { Text, Card, Button, Chip, FAB, SegmentedButtons } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { appointmentService } from '../../services/appointments';

export default function MyAppointmentsScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('upcoming');

  // Get appointments
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: () => appointmentService.getMyAppointments(),
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => appointmentService.cancelAppointment(id),
    onSuccess: () => {
      Alert.alert('Success', 'Appointment cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to cancel appointment');
    },
  });

  const appointments = data?.appointments || [];

  // Filter appointments
  const upcomingAppointments = appointments.filter(
    (apt: any) =>
      apt.status === 'SCHEDULED' || apt.status === 'WAITING' || apt.status === 'IN_PROGRESS'
  );
  const pastAppointments = appointments.filter((apt: any) => apt.status === 'COMPLETED');
  const cancelledAppointments = appointments.filter(
    (apt: any) => apt.status === 'CANCELLED' || apt.status === 'NO_SHOW'
  );

  const displayedAppointments =
    activeTab === 'upcoming'
      ? upcomingAppointments
      : activeTab === 'past'
      ? pastAppointments
      : cancelledAppointments;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      SCHEDULED: '#2563EB',
      WAITING: '#F59E0B',
      IN_PROGRESS: '#10B981',
      COMPLETED: '#6B7280',
      CANCELLED: '#EF4444',
      NO_SHOW: '#EF4444',
    };
    return colors[status] || '#2563EB';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      SCHEDULED: 'Scheduled',
      WAITING: 'Waiting',
      IN_PROGRESS: 'In Progress',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      NO_SHOW: 'No Show',
    };
    return labels[status] || status;
  };

  const handleCancel = (id: string) => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', onPress: () => cancelMutation.mutate(id) },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        My Appointments
      </Text>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            {
              value: 'upcoming',
              label: `Upcoming (${upcomingAppointments.length})`,
            },
            {
              value: 'past',
              label: `Past (${pastAppointments.length})`,
            },
            {
              value: 'cancelled',
              label: `Cancelled (${cancelledAppointments.length})`,
            },
          ]}
        />
      </View>

      {/* Appointments List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {displayedAppointments.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>No {activeTab} appointments</Text>
              {activeTab === 'upcoming' && (
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('BookAppointment')}
                  style={styles.emptyButton}
                >
                  Book Your First Appointment
                </Button>
              )}
            </Card.Content>
          </Card>
        ) : (
          displayedAppointments.map((appointment: any) => (
            <Card key={appointment.id} style={styles.card}>
              <Card.Content>
                {/* Doctor Info */}
                <View style={styles.doctorRow}>
                  <View style={styles.doctorAvatar}>
                    <Text style={styles.avatarText}>
                      {appointment.doctor.user.firstName[0]}
                      {appointment.doctor.user.lastName[0]}
                    </Text>
                  </View>
                  <View style={styles.doctorInfo}>
                    <Text variant="titleMedium">
                      Dr. {appointment.doctor.user.firstName} {appointment.doctor.user.lastName}
                    </Text>
                    <Text variant="bodySmall" style={styles.specialization}>
                      {appointment.doctor.specialization}
                    </Text>
                  </View>
                </View>

                {/* Date & Time */}
                <View style={styles.detailsRow}>
                  <View style={styles.detail}>
                    <Text variant="bodySmall" style={styles.detailLabel}>
                      📅 Date
                    </Text>
                    <Text variant="bodyMedium">
                      {format(new Date(appointment.scheduledDate), 'MMM dd, yyyy')}
                    </Text>
                  </View>
                  <View style={styles.detail}>
                    <Text variant="bodySmall" style={styles.detailLabel}>
                      🕐 Time
                    </Text>
                    <Text variant="bodyMedium">
                      {format(new Date(appointment.scheduledTime), 'hh:mm a')}
                    </Text>
                  </View>
                </View>

                {/* Type & Status */}
                <View style={styles.chipsRow}>
                  <Chip icon={appointment.appointmentType === 'VIDEO' ? 'video' : 'account'} compact>
                    {appointment.appointmentType === 'VIDEO' ? 'Video' : 'In-Person'}
                  </Chip>
                  <Chip
                    style={{ backgroundColor: getStatusColor(appointment.status) }}
                    textStyle={{ color: 'white' }}
                    compact
                  >
                    {getStatusLabel(appointment.status)}
                  </Chip>
                </View>

                {/* Queue Info */}
                {appointment.queueEntry && (
                  <Card style={styles.queueCard}>
                    <Card.Content>
                      <Text variant="bodySmall">Queue Position: #{appointment.queueNumber}</Text>
                      <Text variant="bodySmall" style={styles.waitTime}>
                        Est. wait: {appointment.estimatedWaitMinutes} min
                      </Text>
                    </Card.Content>
                  </Card>
                )}

                {/* Diagnosis */}
                {appointment.diagnosis && (
                  <Card style={styles.diagnosisCard}>
                    <Card.Content>
                      <Text variant="bodySmall" style={styles.diagnosisLabel}>
                        Diagnosis:
                      </Text>
                      <Text variant="bodySmall">{appointment.diagnosis}</Text>
                    </Card.Content>
                  </Card>
                )}

                {/* Actions */}
                {activeTab === 'upcoming' && appointment.status === 'SCHEDULED' && (
                  <View style={styles.actionsRow}>
                    <Button
                      mode="outlined"
                      onPress={() => handleCancel(appointment.id)}
                      disabled={cancelMutation.isPending}
                      style={styles.actionButton}
                    >
                      Cancel
                    </Button>
                  </View>
                )}

                {appointment.appointmentType === 'VIDEO' && appointment.status === 'WAITING' && (
                  <Button
                    mode="contained"
                    onPress={() => navigation.navigate('VideoCall', { roomId: appointment.videoRoomId })}
                    style={styles.videoButton}
                  >
                    Join Video Call
                  </Button>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      {/* FAB for booking */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('BookAppointment')}
        label="Book"
      />
    </View>
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
  tabsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginTop: 0,
    marginBottom: 16,
  },
  emptyCard: {
    margin: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
  },
  emptyButton: {
    marginTop: 8,
  },
  doctorRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  doctorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  doctorInfo: {
    flex: 1,
  },
  specialization: {
    color: '#666',
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  detail: {
    flex: 1,
  },
  detailLabel: {
    color: '#666',
    marginBottom: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  queueCard: {
    backgroundColor: '#EFF6FF',
    marginBottom: 12,
  },
  waitTime: {
    color: '#2563EB',
    marginTop: 2,
  },
  diagnosisCard: {
    backgroundColor: '#F0FDF4',
    marginBottom: 12,
  },
  diagnosisLabel: {
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
  videoButton: {
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
