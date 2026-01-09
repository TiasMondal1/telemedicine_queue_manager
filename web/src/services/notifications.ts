import api from './api';

export interface Notification {
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

export interface NotificationSettings {
  autoReminderEnabled: boolean;
  reminderHoursBefore24h: boolean;
  reminderHoursBefore1h: boolean;
  enableSmsNotifications: boolean;
  enableEmailNotifications: boolean;
  enablePushNotifications: boolean;
  enableWhatsappNotifications: boolean;
}

export const notificationService = {
  // Get user notifications
  async getNotifications(params?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }) {
    const { data } = await api.get('/notifications', { params });
    return data.data;
  },

  // Get unread count
  async getUnreadCount() {
    const { data } = await api.get('/notifications/unread-count');
    return data.data.count as number;
  },

  // Send test notification
  async sendTestNotification(payload: {
    type: 'SMS' | 'EMAIL' | 'PUSH' | 'WHATSAPP';
    title: string;
    content: string;
  }) {
    const { data } = await api.post('/notifications/test', payload);
    return data.data;
  },

  // Get notification settings
  async getSettings() {
    const { data } = await api.get('/notifications/settings');
    return data.data.settings as NotificationSettings;
  },

  // Update notification settings
  async updateSettings(settings: Partial<NotificationSettings>) {
    const { data } = await api.put('/notifications/settings', settings);
    return data.data.settings as NotificationSettings;
  },
};

export default notificationService;
