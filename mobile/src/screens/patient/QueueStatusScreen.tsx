import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Vibration, RefreshControl } from 'react-native';
import { Text, Card, Button, ProgressBar } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { queueService } from '../../services/queue';
import { getSocket } from '../../services/socket';
import { scheduleLocalNotification } from '../../services/notifications';

export default function QueueStatusScreen() {
  const navigation = useNavigation<any>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get queue status
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-queue-status'],
    queryFn: queueService.getMyQueueStatus,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Socket.io real-time updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('queue:checked_in', ({ queuePosition, estimatedWait }) => {
      refetch();
      scheduleLocalNotification(
        'Checked In!',
        `You're #${queuePosition} in line. Estimated wait: ${estimatedWait} minutes`,
      );
    });

    socket.on('queue:wait_time_updated', ({ estimatedWait, position }) => {
      refetch();
    });

    socket.on('queue:your_turn', ({ message }) => {
      refetch();
      Vibration.vibrate([0, 200, 100, 200]);
      scheduleLocalNotification("It's Your Turn!", message);
    });

    socket.on('appointment:status_changed', () => {
      refetch();
    });

    return () => {
      socket.off('queue:checked_in');
      socket.off('queue:wait_time_updated');
      socket.off('queue:your_turn');
      socket.off('appointment:status_changed');
    };
  }, [refetch]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading queue status...</Text>
      </View>
    );
  }

  if (!data?.inQueue) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.emptyState}>
          <Text variant="displaySmall" style={styles.emptyIcon}>
            📋
          </Text>
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            Not in Queue
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            You don't have any active appointments in queue today.
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('BookAppointment')}
            style={styles.bookButton}
          >
            Book an Appointment
          </Button>
        </View>
      </View>
    );
  }

  const { appointment, position, aheadOfYou, estimatedWaitMinutes } = data;
  const doctor = appointment.doctor;
  const status = appointment.status;

  // Calculate progress (approximate)
  const totalPatients = position || 1;
  const progress = aheadOfYou === 0 ? 1 : (totalPatients - aheadOfYou) / totalPatients;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
    >
      <Card style={styles.mainCard}>
        <Card.Content>
          {/* Queue Position */}
          <View style={styles.positionContainer}>
            <Text variant="bodyLarge" style={styles.positionLabel}>
              Your Queue Position
            </Text>
            <View style={styles.positionCircle}>
              <Text variant="displayLarge" style={styles.positionNumber}>
                #{position}
              </Text>
            </View>
            
            {aheadOfYou > 0 ? (
              <Text variant="titleMedium" style={styles.aheadText}>
                {aheadOfYou} {aheadOfYou === 1 ? 'person' : 'people'} ahead of you
              </Text>
            ) : (
              <View style={styles.yourTurnBadge}>
                <Text variant="titleLarge" style={styles.yourTurnText}>
                  🎉 It's Your Turn!
                </Text>
                <Text variant="bodyMedium" style={styles.yourTurnSubtext}>
                  Please proceed to the consultation room
                </Text>
              </View>
            )}
          </View>

          {/* Progress Bar */}
          {aheadOfYou > 0 && (
            <View style={styles.progressContainer}>
              <ProgressBar progress={progress} color="#2563EB" style={styles.progressBar} />
              <Text variant="bodySmall" style={styles.progressText}>
                {Math.round(progress * 100)}% through the queue
              </Text>
            </View>
          )}

          {/* Estimated Wait Time */}
          {aheadOfYou > 0 && estimatedWaitMinutes > 0 && (
            <Card style={styles.waitCard}>
              <Card.Content>
                <View style={styles.waitContent}>
                  <Text variant="displayMedium" style={styles.waitTime}>
                    ⏱️ {estimatedWaitMinutes}
                  </Text>
                  <Text variant="bodyLarge" style={styles.waitLabel}>
                    minutes estimated wait
                  </Text>
                </View>
              </Card.Content>
            </Card>
          )}
        </Card.Content>
      </Card>

      {/* Doctor Info */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Doctor Information
          </Text>
          <View style={styles.doctorInfo}>
            <View style={styles.doctorAvatar}>
              <Text style={styles.avatarText}>
                {doctor.user.firstName[0]}
                {doctor.user.lastName[0]}
              </Text>
            </View>
            <View style={styles.doctorDetails}>
              <Text variant="titleMedium">
                Dr. {doctor.user.firstName} {doctor.user.lastName}
              </Text>
              <Text variant="bodySmall" style={styles.specialization}>
                {doctor.specialization}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Appointment Details */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Appointment Details
          </Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>
              {format(new Date(appointment.scheduledDate), 'MMMM dd, yyyy')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Scheduled Time:</Text>
            <Text style={styles.detailValue}>
              {format(new Date(appointment.scheduledTime), 'hh:mm a')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type:</Text>
            <Text style={styles.detailValue}>
              {appointment.appointmentType === 'VIDEO' ? '📹 Video Call' : '🏥 In-Person'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status:</Text>
            <Text
              style={[
                styles.detailValue,
                status === 'IN_PROGRESS' && styles.statusInProgress,
                status === 'WAITING' && styles.statusWaiting,
              ]}
            >
              {status === 'WAITING' && '⏳ Waiting'}
              {status === 'IN_PROGRESS' && '✅ In Progress'}
              {status === 'COMPLETED' && '✔️ Completed'}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Actions */}
      {appointment.appointmentType === 'VIDEO' && status === 'IN_PROGRESS' && (
        <Button
          mode="contained"
          onPress={() =>
            navigation.navigate('VideoCall', { roomId: appointment.videoRoomId })
          }
          style={styles.videoButton}
          icon="video"
        >
          Join Video Consultation
        </Button>
      )}

      {/* Tips */}
      <Card style={styles.tipsCard}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.tipsTitle}>
            💡 Tips while you wait
          </Text>
          <Text variant="bodySmall" style={styles.tipText}>
            • Please stay near the waiting area
          </Text>
          <Text variant="bodySmall" style={styles.tipText}>
            • You'll receive a notification when it's your turn
          </Text>
          <Text variant="bodySmall" style={styles.tipText}>
            • Have your medical records ready
          </Text>
          <Text variant="bodySmall" style={styles.tipText}>
            • Keep your phone's volume on
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  bookButton: {
    marginTop: 8,
  },
  mainCard: {
    margin: 16,
    marginBottom: 8,
  },
  card: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  positionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  positionLabel: {
    color: '#666',
    marginBottom: 16,
  },
  positionCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  positionNumber: {
    color: 'white',
    fontWeight: 'bold',
  },
  aheadText: {
    color: '#666',
    textAlign: 'center',
  },
  yourTurnBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  yourTurnText: {
    color: 'white',
    fontWeight: 'bold',
  },
  yourTurnSubtext: {
    color: 'white',
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 8,
  },
  waitCard: {
    backgroundColor: '#EFF6FF',
    marginTop: 16,
  },
  waitContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  waitTime: {
    color: '#2563EB',
    fontWeight: 'bold',
  },
  waitLabel: {
    color: '#1E40AF',
    marginTop: 4,
  },
  sectionTitle: {
    marginBottom: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
  },
  doctorDetails: {
    flex: 1,
  },
  specialization: {
    color: '#666',
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    color: '#666',
  },
  detailValue: {
    fontWeight: '600',
  },
  statusWaiting: {
    color: '#F59E0B',
  },
  statusInProgress: {
    color: '#10B981',
  },
  videoButton: {
    margin: 16,
    marginTop: 8,
  },
  tipsCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 32,
    backgroundColor: '#FEF3C7',
  },
  tipsTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  tipText: {
    color: '#92400E',
    marginBottom: 4,
  },
});
