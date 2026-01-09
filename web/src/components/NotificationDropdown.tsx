import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import notificationService, { Notification } from '../services/notifications';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Bell, 
  Calendar, 
  Video, 
  Users, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface NotificationDropdownProps {
  onClose: () => void;
  onNotificationRead: () => void;
}

export default function NotificationDropdown({
  onClose,
  onNotificationRead,
}: NotificationDropdownProps) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications({ limit: 10 });
      setNotifications(data.notifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (notification: Notification) => {
    if (notification.appointment) {
      return <Calendar className="h-4 w-4 text-blue-500" />;
    }
    
    switch (notification.type) {
      case 'PUSH':
        return <Bell className="h-4 w-4 text-purple-500" />;
      case 'SMS':
        return <AlertCircle className="h-4 w-4 text-green-500" />;
      case 'EMAIL':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-3 w-3 text-red-500" />;
      case 'PENDING':
        return <Clock className="h-3 w-3 text-yellow-500" />;
      default:
        return null;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.appointmentId) {
      navigate('/my-appointments');
    }
    onClose();
    onNotificationRead();
  };

  return (
    <Card className="w-96 max-h-[500px] overflow-hidden shadow-lg">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Notifications</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto max-h-[400px]">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2">Loading...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p className="font-medium">No notifications yet</p>
            <p className="text-sm">We'll notify you when something happens</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm text-gray-900">
                        {notification.title}
                      </h4>
                      <div className="flex-shrink-0">
                        {getStatusBadge(notification.status)}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {notification.content}
                    </p>

                    {/* Appointment Info */}
                    {notification.appointment && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {format(
                          new Date(notification.appointment.scheduledDate),
                          'MMM d'
                        )}
                        {' at '}
                        {format(
                          new Date(notification.appointment.scheduledTime),
                          'h:mm a'
                        )}
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t bg-gray-50 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700"
            onClick={() => {
              navigate('/notifications');
              onClose();
            }}
          >
            View all notifications
          </Button>
        </div>
      )}
    </Card>
  );
}
