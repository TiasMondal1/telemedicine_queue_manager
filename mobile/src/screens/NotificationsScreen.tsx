import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { List, Badge, Avatar, IconButton, Divider, ActivityIndicator } from 'react-native-paper';
import { format, formatDistanceToNow } from 'date-fns';
import api from '../services/api';

interface Notification {
  id: string;
  userId: string;
  clinicId: string;
  appointmentId?: string;
  type: 'SMS' | 'EMAIL' | 'PUSH' | 'WHATSAPP';
  title: string;
  content: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  scheduledFor: string;
  sentAt?: string;
  failureReason?: string;
  createdAt: string;
  appointment?: {
    id: string;
    appointmentType: string;
    scheduledDate: string;
    scheduledTime: string;
  };
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
        setPage(0);
      } else {
        setLoading(true);
      }

      const response = await api.get('/notifications', {
        params: {
          limit,
          offset: refresh ? 0 : page * limit,
        },
      });

      const newNotifications = response.data.data.notifications;
      const total = response.data.data.total;

      if (refresh) {
        setNotifications(newNotifications);
        setPage(0);
      } else {
        setNotifications((prev) =>
          page === 0 ? newNotifications : [...prev, ...newNotifications]
        );
      }

      setHasMore(notifications.length + newNotifications.length < total);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1);
      loadNotifications();
    }
  };

  const getNotificationIcon = (notification: Notification) => {
    if (notification.appointment) {
      return 'calendar';
    }

    switch (notification.type) {
      case 'PUSH':
        return 'bell';
      case 'SMS':
        return 'message-text';
      case 'EMAIL':
        return 'email';
      default:
        return 'bell-outline';
    }
  };

  const getNotificationColor = (notification: Notification) => {
    if (notification.appointment) {
      return '#2196F3'; // Blue
    }

    switch (notification.type) {
      case 'PUSH':
        return '#9C27B0'; // Purple
      case 'SMS':
        return '#4CAF50'; // Green
      case 'EMAIL':
        return '#FF9800'; // Orange
      default:
        return '#757575'; // Gray
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return { label: 'Sent', color: '#4CAF50' };
      case 'FAILED':
        return { label: 'Failed', color: '#F44336' };
      case 'PENDING':
        return { label: 'Pending', color: '#FFC107' };
      default:
        return { label: status, color: '#757575' };
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    if (notification.appointmentId) {
      // Navigate to appointments screen
      navigation.navigate('MyAppointments' as never);
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const statusBadge = getStatusBadge(item.status);
    const iconName = getNotificationIcon(item);
    const iconColor = getNotificationColor(item);

    return (
      <TouchableOpacity
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <List.Item
          title={item.title}
          description={() => (
            <View style={styles.descriptionContainer}>
              <Text style={styles.content} numberOfLines={2}>
                {item.content}
              </Text>

              {item.appointment && (
                <View style={styles.appointmentInfo}>
                  <List.Icon icon="calendar" color="#666" />
                  <Text style={styles.appointmentText}>
                    {format(new Date(item.appointment.scheduledDate), 'MMM d')}
                    {' at '}
                    {format(new Date(item.appointment.scheduledTime), 'h:mm a')}
                  </Text>
                  <Badge style={styles.typeBadge}>
                    {item.appointment.appointmentType}
                  </Badge>
                </View>
              )}

              <View style={styles.metaContainer}>
                <Text style={styles.metaText}>
                  {item.type} • {formatDistanceToNow(new Date(item.createdAt), {
                    addSuffix: true,
                  })}
                </Text>
                {item.sentAt && (
                  <Text style={styles.metaText}>
                    {' • Delivered '}
                    {format(new Date(item.sentAt), 'MMM d, h:mm a')}
                  </Text>
                )}
              </View>

              {item.failureReason && (
                <View style={styles.failureContainer}>
                  <Text style={styles.failureText}>
                    Failed: {item.failureReason}
                  </Text>
                </View>
              )}
            </View>
          )}
          left={(props) => (
            <Avatar.Icon
              {...props}
              icon={iconName}
              style={[styles.avatar, { backgroundColor: iconColor + '20' }]}
              color={iconColor}
            />
          )}
          right={(props) => (
            <Badge
              {...props}
              style={[styles.statusBadge, { backgroundColor: statusBadge.color }]}
            >
              {statusBadge.label}
            </Badge>
          )}
        />
        <Divider />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {loading && page === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <List.Icon icon="bell-outline" color="#BDBDBD" />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyText}>
            We'll notify you when something important happens
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadNotifications(true)}
              colors={['#2196F3']}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() =>
            loading && page > 0 ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator size="small" color="#2196F3" />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  descriptionContainer: {
    marginTop: 4,
  },
  content: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  appointmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentText: {
    fontSize: 12,
    color: '#666',
    marginLeft: -8,
  },
  typeBadge: {
    marginLeft: 8,
    fontSize: 10,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
  },
  failureContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#F44336',
  },
  failureText: {
    fontSize: 12,
    color: '#C62828',
  },
  avatar: {
    marginTop: 8,
  },
  statusBadge: {
    marginTop: 12,
    height: 24,
  },
  footerLoading: {
    padding: 16,
    alignItems: 'center',
  },
});
