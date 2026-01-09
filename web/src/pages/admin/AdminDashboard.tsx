import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import StatCard from '../../components/StatCard';
import analyticsService, {
  DashboardStats,
  AppointmentStat,
  QueuePerformance,
  DoctorPerformance,
} from '../../services/analytics';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format as formatDate } from 'date-fns';
import {
  Calendar,
  Users,
  Clock,
  TrendingUp,
  Activity,
  Settings,
  Loader2,
} from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [appointmentStats, setAppointmentStats] = useState<AppointmentStat[]>([]);
  const [queuePerformance, setQueuePerformance] = useState<QueuePerformance | null>(null);
  const [doctorPerformance, setDoctorPerformance] = useState<DoctorPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, appointmentsData, queueData, doctorsData] = await Promise.all([
        analyticsService.getDashboardStats(),
        analyticsService.getAppointmentStats(7),
        analyticsService.getQueuePerformance(7),
        analyticsService.getDoctorPerformance(),
      ]);
      setStats(statsData);
      setAppointmentStats(appointmentsData);
      setQueuePerformance(queueData);
      setDoctorPerformance(doctorsData);
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Clinic overview and performance metrics</p>
          </div>
          <Button onClick={() => navigate('/admin/settings')}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Today's Appointments"
              value={stats.today.appointments}
              icon={Calendar}
              description={`${stats.today.patients} patients`}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-100"
            />
            <StatCard
              title="Current Queue"
              value={stats.today.queueLength}
              icon={Users}
              description="Patients waiting"
              iconColor="text-orange-600"
              iconBgColor="bg-orange-100"
            />
            <StatCard
              title="This Week"
              value={stats.week.appointments}
              icon={TrendingUp}
              description={`${stats.week.patients} patients`}
              iconColor="text-green-600"
              iconBgColor="bg-green-100"
            />
            <StatCard
              title="This Month"
              value={stats.month.appointments}
              icon={Activity}
              description={`${stats.month.patients} patients`}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-100"
            />
          </div>
        )}

        {/* Queue Performance */}
        {queuePerformance && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Avg Wait Time"
              value={`${queuePerformance.averageWaitTime}m`}
              icon={Clock}
              description="Patient wait time"
              iconColor="text-blue-600"
              iconBgColor="bg-blue-100"
            />
            <StatCard
              title="Avg Consultation"
              value={`${queuePerformance.averageConsultationTime}m`}
              icon={Activity}
              description="Consultation duration"
              iconColor="text-green-600"
              iconBgColor="bg-green-100"
            />
            <StatCard
              title="Total Processed"
              value={queuePerformance.totalProcessed}
              icon={Users}
              description="Last 7 days"
              iconColor="text-purple-600"
              iconBgColor="bg-purple-100"
            />
            <StatCard
              title="Completed"
              value={queuePerformance.totalCompleted}
              icon={TrendingUp}
              description={`${Math.round(
                (queuePerformance.totalCompleted / queuePerformance.totalProcessed) * 100
              )}% completion rate`}
              iconColor="text-orange-600"
              iconBgColor="bg-orange-100"
            />
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Appointment Trends */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Appointment Trends (7 Days)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={appointmentStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => formatDate(new Date(value), 'MMM d')}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => formatDate(new Date(value), 'MMM d, yyyy')}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#10B981"
                  name="Completed"
                />
                <Line
                  type="monotone"
                  dataKey="scheduled"
                  stroke="#3B82F6"
                  name="Scheduled"
                />
                <Line
                  type="monotone"
                  dataKey="cancelled"
                  stroke="#EF4444"
                  name="Cancelled"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Doctor Performance */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Doctor Performance
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={doctorPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completedAppointments" fill="#10B981" name="Completed" />
                <Bar dataKey="cancelledAppointments" fill="#EF4444" name="Cancelled" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Doctor Performance Table */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Doctor Performance Details
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Doctor
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Specialization
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                    Total Apts
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                    Completed
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                    Completion Rate
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                    Avg Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {doctorPerformance.map((doctor) => (
                  <tr key={doctor.doctorId} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {doctor.name}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {doctor.specialization}
                    </td>
                    <td className="py-3 px-4 text-sm text-center text-gray-900">
                      {doctor.totalAppointments}
                    </td>
                    <td className="py-3 px-4 text-sm text-center text-green-600">
                      {doctor.completedAppointments}
                    </td>
                    <td className="py-3 px-4 text-sm text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          doctor.completionRate >= 80
                            ? 'bg-green-100 text-green-800'
                            : doctor.completionRate >= 60
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {doctor.completionRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-center text-gray-900">
                      {doctor.avgConsultationTime}m
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
