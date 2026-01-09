import { useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import reportService from '../../services/reports';
import { toast } from 'sonner';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import {
  FileText,
  Download,
  Calendar,
  Users,
  DollarSign,
  Activity,
  Loader2,
  TrendingUp,
  Clock,
} from 'lucide-react';

type ReportType = 'appointment' | 'queue' | 'doctor' | 'financial';

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('appointment');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const reportTypes = [
    {
      id: 'appointment' as ReportType,
      name: 'Appointment Report',
      description: 'View all appointments, schedules, and status',
      icon: Calendar,
      color: 'blue',
    },
    {
      id: 'queue' as ReportType,
      name: 'Queue Report',
      description: 'Analyze wait times and queue performance',
      icon: Clock,
      color: 'orange',
    },
    {
      id: 'doctor' as ReportType,
      name: 'Doctor Performance',
      description: 'Individual doctor statistics and metrics',
      icon: Users,
      color: 'green',
    },
    {
      id: 'financial' as ReportType,
      name: 'Financial Report',
      description: 'Revenue, earnings, and financial summary',
      icon: DollarSign,
      color: 'purple',
    },
  ];

  const quickRanges = [
    {
      name: 'Last 7 Days',
      start: subDays(new Date(), 7),
      end: new Date(),
    },
    {
      name: 'This Week',
      start: startOfWeek(new Date()),
      end: endOfWeek(new Date()),
    },
    {
      name: 'Last 30 Days',
      start: subDays(new Date(), 30),
      end: new Date(),
    },
    {
      name: 'This Month',
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date()),
    },
  ];

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      let data;
      
      switch (selectedReport) {
        case 'appointment':
          data = await reportService.getAppointmentReport(startDate, endDate);
          break;
        case 'queue':
          data = await reportService.getQueueReport(startDate, endDate);
          break;
        case 'doctor':
          data = await reportService.getDoctorReport(startDate, endDate);
          break;
        case 'financial':
          data = await reportService.getFinancialReport(startDate, endDate);
          break;
      }
      
      setReportData(data);
      toast.success('Report generated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: 'pdf' | 'csv') => {
    try {
      setLoading(true);
      await reportService.generateReport({
        reportType: selectedReport,
        startDate,
        endDate,
        format,
      });
      toast.success(`${format.toUpperCase()} downloaded successfully`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to download report');
    } finally {
      setLoading(false);
    }
  };

  const setQuickRange = (range: { start: Date; end: Date }) => {
    setStartDate(format(range.start, 'yyyy-MM-dd'));
    setEndDate(format(range.end, 'yyyy-MM-dd'));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Generate comprehensive reports for your clinic</p>
        </div>

        {/* Report Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {reportTypes.map((report) => (
            <Card
              key={report.id}
              className={`p-6 cursor-pointer transition-all ${
                selectedReport === report.id
                  ? 'ring-2 ring-blue-500 bg-blue-50'
                  : 'hover:shadow-md'
              }`}
              onClick={() => setSelectedReport(report.id)}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`p-3 rounded-lg ${
                    report.color === 'blue'
                      ? 'bg-blue-100'
                      : report.color === 'orange'
                      ? 'bg-orange-100'
                      : report.color === 'green'
                      ? 'bg-green-100'
                      : 'bg-purple-100'
                  }`}
                >
                  <report.icon
                    className={`h-6 w-6 ${
                      report.color === 'blue'
                        ? 'text-blue-600'
                        : report.color === 'orange'
                        ? 'text-orange-600'
                        : report.color === 'green'
                        ? 'text-green-600'
                        : 'text-purple-600'
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{report.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Date Range Selection */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Date Range</h2>
          
          {/* Quick Ranges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {quickRanges.map((range) => (
              <Button
                key={range.name}
                variant="outline"
                size="sm"
                onClick={() => setQuickRange(range)}
              >
                {range.name}
              </Button>
            ))}
          </div>

          {/* Custom Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Button onClick={handleGenerateReport} disabled={loading} className="flex-1">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Generate Report
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDownload('pdf')}
              disabled={loading}
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDownload('csv')}
              disabled={loading}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </Card>

        {/* Report Preview */}
        {reportData && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Preview</h2>
            
            {selectedReport === 'appointment' && (
              <AppointmentReportView data={reportData} />
            )}
            {selectedReport === 'queue' && (
              <QueueReportView data={reportData} />
            )}
            {selectedReport === 'doctor' && (
              <DoctorReportView data={reportData} />
            )}
            {selectedReport === 'financial' && (
              <FinancialReportView data={reportData} />
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

function AppointmentReportView({ data }: { data: any }) {
  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-600 font-medium">Total</p>
          <p className="text-2xl font-bold text-blue-900">{data.summary.total}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-600 font-medium">Completed</p>
          <p className="text-2xl font-bold text-green-900">{data.summary.completed}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-sm text-yellow-600 font-medium">Scheduled</p>
          <p className="text-2xl font-bold text-yellow-900">{data.summary.scheduled}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-sm text-red-600 font-medium">Cancelled</p>
          <p className="text-2xl font-bold text-red-900">{data.summary.cancelled}</p>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Patient</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Doctor</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Type</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.appointments.slice(0, 20).map((apt: any, index: number) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="py-3 px-4 text-sm">{apt.patientName}</td>
                <td className="py-3 px-4 text-sm">{apt.doctorName}</td>
                <td className="py-3 px-4 text-sm">{format(new Date(apt.date), 'MMM dd, yyyy')}</td>
                <td className="py-3 px-4 text-sm">{apt.type}</td>
                <td className="py-3 px-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    apt.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    apt.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {apt.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.appointments.length > 20 && (
          <p className="text-sm text-gray-500 text-center py-4">
            Showing 20 of {data.appointments.length} appointments. Download full report for complete data.
          </p>
        )}
      </div>
    </div>
  );
}

function QueueReportView({ data }: { data: any }) {
  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-600 font-medium">Total Processed</p>
          <p className="text-2xl font-bold text-blue-900">{data.summary.total}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-600 font-medium">Completed</p>
          <p className="text-2xl font-bold text-green-900">{data.summary.completed}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <p className="text-sm text-orange-600 font-medium">Avg Wait Time</p>
          <p className="text-2xl font-bold text-orange-900">{data.summary.averageWaitTime}m</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-purple-600 font-medium">Avg Consultation</p>
          <p className="text-2xl font-bold text-purple-900">{data.summary.averageConsultationTime}m</p>
        </div>
      </div>

      {/* Queue Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Queue #</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Patient</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Doctor</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.entries.slice(0, 20).map((entry: any, index: number) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="py-3 px-4 text-sm font-medium">#{entry.queueNumber}</td>
                <td className="py-3 px-4 text-sm">{entry.patientName}</td>
                <td className="py-3 px-4 text-sm">{entry.doctorName}</td>
                <td className="py-3 px-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    entry.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    entry.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {entry.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DoctorReportView({ data }: { data: any }) {
  return (
    <div>
      <p className="text-gray-600 mb-6">Total Doctors: {data.totalDoctors}</p>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Doctor</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Specialization</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Appointments</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Completed</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Completion Rate</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Avg Time</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.doctors.map((doctor: any, index: number) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="py-3 px-4 text-sm font-medium">{doctor.name}</td>
                <td className="py-3 px-4 text-sm">{doctor.specialization}</td>
                <td className="py-3 px-4 text-sm text-center">{doctor.totalAppointments}</td>
                <td className="py-3 px-4 text-sm text-center text-green-600">{doctor.completedAppointments}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    doctor.completionRate >= 80 ? 'bg-green-100 text-green-800' :
                    doctor.completionRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {doctor.completionRate}%
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-center">{doctor.avgConsultationTime}m</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FinancialReportView({ data }: { data: any }) {
  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-lg col-span-2 md:col-span-1">
          <p className="text-sm text-green-600 font-medium">Total Revenue</p>
          <p className="text-3xl font-bold text-green-900">${data.summary.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-600 font-medium">Total Appointments</p>
          <p className="text-2xl font-bold text-blue-900">{data.summary.totalAppointments}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-purple-600 font-medium">Avg per Appointment</p>
          <p className="text-2xl font-bold text-purple-900">${data.summary.averagePerAppointment}</p>
        </div>
      </div>

      {/* Revenue by Type */}
      <h3 className="font-semibold text-gray-900 mb-3">Revenue by Appointment Type</h3>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-600">Video</p>
          <p className="text-xl font-bold text-gray-900">${data.byType.video.revenue.toLocaleString()}</p>
          <p className="text-xs text-gray-500">{data.byType.video.count} appointments</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-600">In-Person</p>
          <p className="text-xl font-bold text-gray-900">${data.byType.inPerson.revenue.toLocaleString()}</p>
          <p className="text-xs text-gray-500">{data.byType.inPerson.count} appointments</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-600">Urgent</p>
          <p className="text-xl font-bold text-gray-900">${data.byType.urgent.revenue.toLocaleString()}</p>
          <p className="text-xs text-gray-500">{data.byType.urgent.count} appointments</p>
        </div>
      </div>

      {/* Revenue by Doctor */}
      <h3 className="font-semibold text-gray-900 mb-3">Revenue by Doctor</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Doctor</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Appointments</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.byDoctor.map((doctor: any, index: number) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="py-3 px-4 text-sm font-medium">{doctor.name}</td>
                <td className="py-3 px-4 text-sm text-center">{doctor.appointments}</td>
                <td className="py-3 px-4 text-sm text-right font-medium text-green-600">
                  ${doctor.revenue.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
