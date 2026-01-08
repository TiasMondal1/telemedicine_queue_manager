import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Calendar, Clock, Video, User, X, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { appointmentService } from '@/services/appointments';

export default function MyAppointments() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');

  // Get appointments
  const { data, isLoading } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: () => appointmentService.getMyAppointments(),
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => appointmentService.cancelAppointment(id),
    onSuccess: () => {
      toast.success('Appointment cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to cancel appointment');
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      SCHEDULED: { variant: 'default', label: 'Scheduled' },
      WAITING: { variant: 'warning', label: 'Waiting' },
      IN_PROGRESS: { variant: 'success', label: 'In Progress' },
      COMPLETED: { variant: 'secondary', label: 'Completed' },
      CANCELLED: { variant: 'destructive', label: 'Cancelled' },
      NO_SHOW: { variant: 'destructive', label: 'No Show' },
    };
    const config = variants[status] || variants.SCHEDULED;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleCancel = (id: string) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      cancelMutation.mutate(id);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Appointments</h1>
        <Button onClick={() => navigate('/patient/book-appointment')}>
          Book New Appointment
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'upcoming' ? 'default' : 'outline'}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming ({upcomingAppointments.length})
        </Button>
        <Button
          variant={activeTab === 'past' ? 'default' : 'outline'}
          onClick={() => setActiveTab('past')}
        >
          Past ({pastAppointments.length})
        </Button>
        <Button
          variant={activeTab === 'cancelled' ? 'default' : 'outline'}
          onClick={() => setActiveTab('cancelled')}
        >
          Cancelled ({cancelledAppointments.length})
        </Button>
      </div>

      {/* Appointments List */}
      {isLoading ? (
        <div className="text-center py-12">Loading appointments...</div>
      ) : displayedAppointments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">No {activeTab} appointments</p>
            {activeTab === 'upcoming' && (
              <Button onClick={() => navigate('/patient/book-appointment')}>
                Book Your First Appointment
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {displayedAppointments.map((appointment: any) => (
            <Card key={appointment.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          Dr. {appointment.doctor.user.firstName}{' '}
                          {appointment.doctor.user.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {appointment.doctor.specialization}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span>{format(new Date(appointment.scheduledDate), 'MMMM dd, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span>{format(new Date(appointment.scheduledTime), 'hh:mm a')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {appointment.appointmentType === 'VIDEO' ? (
                          <>
                            <Video className="h-4 w-4 text-gray-500" />
                            <span>Video Consultation</span>
                          </>
                        ) : (
                          <>
                            <User className="h-4 w-4 text-gray-500" />
                            <span>In-Person</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {getStatusBadge(appointment.status)}
                      </div>
                    </div>

                    {appointment.queueEntry && (
                      <div className="bg-blue-50 p-3 rounded-lg mb-3">
                        <p className="text-sm font-medium text-blue-900">
                          Queue Position: #{appointment.queueNumber}
                        </p>
                        <p className="text-xs text-blue-700">
                          Estimated wait: {appointment.estimatedWaitMinutes} minutes
                        </p>
                      </div>
                    )}

                    {appointment.diagnosis && (
                      <div className="bg-green-50 p-3 rounded-lg mb-3">
                        <p className="text-sm font-medium text-green-900">Diagnosis:</p>
                        <p className="text-sm text-green-800">{appointment.diagnosis}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {activeTab === 'upcoming' && appointment.status === 'SCHEDULED' && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/patient/appointments/${appointment.id}/reschedule`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancel(appointment.id)}
                        disabled={cancelMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {appointment.appointmentType === 'VIDEO' && appointment.status === 'WAITING' && (
                    <Button onClick={() => navigate(`/video/${appointment.videoRoomId}`)}>
                      Join Video Call
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
