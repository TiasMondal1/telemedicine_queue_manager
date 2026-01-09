import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import StatCard from '../../components/StatCard';
import analyticsService, { PatientStats, Activity } from '../../services/analytics';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Calendar,
  CheckCircle,
  Clock,
  Activity as ActivityIcon,
  CalendarPlus,
  FileText,
  Loader2,
} from 'lucide-react';

export default function PatientDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, activitiesData] = await Promise.all([
        analyticsService.getPatientStats(),
        analyticsService.getRecentActivity(5),
      ]);
      setStats(statsData);
      setActivities(activitiesData);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Patient Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's your health overview.</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Button
            onClick={() => navigate('/patient/book-appointment')}
            className="h-20 text-lg"
            size="lg"
          >
            <CalendarPlus className="h-5 w-5 mr-2" />
            Book Appointment
          </Button>
          <Button
            onClick={() => navigate('/patient/appointments')}
            variant="outline"
            className="h-20 text-lg"
            size="lg"
          >
            <FileText className="h-5 w-5 mr-2" />
            My Appointments
          </Button>
          <Button
            onClick={() => navigate('/notifications')}
            variant="outline"
            className="h-20 text-lg"
            size="lg"
          >
            <ActivityIcon className="h-5 w-5 mr-2" />
            Notifications
          </Button>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Appointments"
              value={stats.totalAppointments}
              icon={Calendar}
              description="All time"
              iconColor="text-blue-600"
              iconBgColor="bg-blue-100"
            />
            <StatCard
              title="Completed"
              value={stats.completedAppointments}
              icon={CheckCircle}
              description="Successfully completed"
              iconColor="text-green-600"
              iconBgColor="bg-green-100"
            />
            <StatCard
              title="Upcoming"
              value={stats.upcomingAppointments}
              icon={Clock}
              description="Scheduled appointments"
              iconColor="text-orange-600"
              iconBgColor="bg-orange-100"
            />
            <StatCard
              title="Last Visit"
              value={
                stats.lastVisit
                  ? format(new Date(stats.lastVisit), 'MMM d')
                  : 'Never'
              }
              icon={Calendar}
              description={
                stats.lastVisit
                  ? formatDistanceToNow(new Date(stats.lastVisit), { addSuffix: true })
                  : 'No visits yet'
              }
              iconColor="text-purple-600"
              iconBgColor="bg-purple-100"
            />
          </div>
        )}

        {/* Recent Activity */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/patient/appointments')}
            >
              View all
            </Button>
          </div>

          {activities.length === 0 ? (
            <div className="text-center py-12">
              <ActivityIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No recent activity</p>
              <Button
                onClick={() => navigate('/patient/book-appointment')}
                className="mt-4"
              >
                Book your first appointment
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className={`rounded-full p-2 ${getActivityColor(activity.status)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{activity.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadge(
                      activity.status
                    )}`}
                  >
                    {activity.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'appointment':
      return <Calendar className="h-4 w-4" />;
    case 'consultation':
      return <ActivityIcon className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

function getActivityColor(status: string) {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-600';
    case 'SCHEDULED':
      return 'bg-blue-100 text-blue-600';
    case 'CANCELLED':
      return 'bg-red-100 text-red-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'SCHEDULED':
      return 'bg-blue-100 text-blue-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    case 'NO_SHOW':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
