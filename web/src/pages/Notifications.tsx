import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import notificationService, { Notification } from '../services/notifications';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadNotifications();
  }, [page]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications({
        limit,
        offset: page * limit,
      });
      setNotifications(data.notifications);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (notification: Notification) => {
    if (notification.appointment) {
      return (
        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
          <Calendar className="h-5 w-5 text-blue-600" />
        </div>
      );
    }

    switch (notification.type) {
      case 'PUSH':
        return (
          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
            <Bell className="h-5 w-5 text-purple-600" />
          </div>
        );
      case 'SMS':
        return (
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-green-600" />
          </div>
        );
      case 'EMAIL':
        return (
          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-orange-600" />
          </div>
        );
      default:
        return (
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
            <Bell className="h-5 w-5 text-gray-600" />
          </div>
        );
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'SENT':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          label: 'Sent',
          color: 'bg-green-100 text-green-800',
        };
      case 'FAILED':
        return {
          icon: <XCircle className="h-4 w-4" />,
          label: 'Failed',
          color: 'bg-red-100 text-red-800',
        };
      case 'PENDING':
        return {
          icon: <Clock className="h-4 w-4" />,
          label: 'Pending',
          color: 'bg-yellow-100 text-yellow-800',
        };
      default:
        return {
          icon: <Clock className="h-4 w-4" />,
          label: status,
          color: 'bg-gray-100 text-gray-800',
        };
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.appointmentId) {
      navigate('/my-appointments');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Notifications
              </h1>
              <p className="text-gray-600 mt-1">
                {total} notification{total !== 1 ? 's' : ''}
              </p>
            </div>

            <Button onClick={loadNotifications} variant="outline">
              Refresh
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <Card>
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="mt-2 text-gray-600">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="font-semibold text-lg mb-2">No notifications yet</h3>
              <p className="text-gray-600">
                We'll notify you when something important happens
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const statusInfo = getStatusInfo(notification.status);

                return (
                  <div
                    key={notification.id}
                    className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {notification.title}
                            </h3>
                            <p className="text-gray-600 mt-1">
                              {notification.content}
                            </p>
                          </div>

                          <Badge className={`${statusInfo.color} flex items-center gap-1`}>
                            {statusInfo.icon}
                            {statusInfo.label}
                          </Badge>
                        </div>

                        {/* Appointment Info */}
                        {notification.appointment && (
                          <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {format(
                                new Date(notification.appointment.scheduledDate),
                                'MMMM d, yyyy'
                              )}
                              {' at '}
                              {format(
                                new Date(notification.appointment.scheduledTime),
                                'h:mm a'
                              )}
                            </span>
                            <Badge variant="outline">
                              {notification.appointment.appointmentType}
                            </Badge>
                          </div>
                        )}

                        {/* Meta Info */}
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                          <span className="capitalize">{notification.type.toLowerCase()}</span>
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                          {notification.sentAt && (
                            <>
                              <span>•</span>
                              <span>
                                Delivered{' '}
                                {format(new Date(notification.sentAt), 'MMM d, h:mm a')}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Failure Reason */}
                        {notification.failureReason && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            <strong>Failed:</strong> {notification.failureReason}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>

            <span className="text-sm text-gray-600">
              Page {page + 1} of {totalPages}
            </span>

            <Button
              variant="outline"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
