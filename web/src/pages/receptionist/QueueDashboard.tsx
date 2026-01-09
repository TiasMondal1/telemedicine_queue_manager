import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Users, Clock, CheckCircle, AlertCircle, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { queueService } from '@/services/queue';
import { getSocket } from '@/services/socket';

export default function QueueDashboard() {
  const queryClient = useQueryClient();
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);

  // Get all queues
  const { data, isLoading } = useQuery({
    queryKey: ['all-queues'],
    queryFn: queueService.getAllQueues,
    refetchInterval: 30000, // Refetch every 30 seconds as backup
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: queueService.checkInPatient,
    onSuccess: () => {
      toast.success('Patient checked in successfully');
      queryClient.invalidateQueries({ queryKey: ['all-queues'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to check in patient');
    },
  });

  // Call next mutation
  const callNextMutation = useMutation({
    mutationFn: queueService.callNextPatient,
    onSuccess: (data) => {
      const patientName = data.queueEntry.appointment.patient.user.firstName;
      toast.success(`Called ${patientName} to consultation room`);
      queryClient.invalidateQueries({ queryKey: ['all-queues'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to call next patient');
    },
  });

  // Socket.io real-time updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('queue:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['all-queues'] });
    });

    socket.on('queue:patient_called', ({ patientName }) => {
      toast.info(`${patientName} has been called`, {
        icon: '📢',
      });
      queryClient.invalidateQueries({ queryKey: ['all-queues'] });
    });

    socket.on('queue:reordered', () => {
      queryClient.invalidateQueries({ queryKey: ['all-queues'] });
    });

    return () => {
      socket.off('queue:updated');
      socket.off('queue:patient_called');
      socket.off('queue:reordered');
    };
  }, [queryClient]);

  const queues = data?.queues || [];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      WAITING: 'bg-blue-500',
      CALLED: 'bg-yellow-500',
      IN_CONSULTATION: 'bg-green-500',
      COMPLETED: 'bg-gray-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      WAITING: 'Waiting',
      CALLED: 'Called',
      IN_CONSULTATION: 'In Consultation',
      COMPLETED: 'Completed',
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading queues...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Queue Management Dashboard</h1>
        <p className="text-gray-600">Monitor and manage patient queues for all doctors</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {queues.map((doctorQueue: any) => (
          <Card key={doctorQueue.doctor.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                {doctorQueue.doctor.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Waiting</span>
                  <Badge variant="secondary">{doctorQueue.statistics.waiting}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">In Consultation</span>
                  <Badge variant="success">{doctorQueue.statistics.inConsultation}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Completed Today</span>
                  <Badge variant="outline">{doctorQueue.statistics.completed}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Queue Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {queues.map((doctorQueue: any) => (
          <Card key={doctorQueue.doctor.id}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{doctorQueue.doctor.name}</CardTitle>
                  <p className="text-sm text-gray-500">{doctorQueue.doctor.specialization}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => callNextMutation.mutate(doctorQueue.doctor.id)}
                  disabled={
                    callNextMutation.isPending ||
                    doctorQueue.statistics.waiting === 0
                  }
                >
                  Call Next
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {doctorQueue.queue.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No patients in queue</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {doctorQueue.queue.map((entry: any, index: number) => (
                    <div
                      key={entry.id}
                      className={`p-3 rounded-lg border-l-4 ${
                        entry.status === 'WAITING'
                          ? 'border-blue-500 bg-blue-50'
                          : entry.status === 'CALLED'
                          ? 'border-yellow-500 bg-yellow-50'
                          : 'border-green-500 bg-green-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">
                            #{entry.queuePosition}{' '}
                            {entry.appointment.patient.user.firstName}{' '}
                            {entry.appointment.patient.user.lastName}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {entry.appointment.patient.user.phone}
                          </p>
                        </div>
                        <Badge className={getStatusColor(entry.status) + ' text-white'}>
                          {getStatusLabel(entry.status)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {format(new Date(entry.appointment.scheduledTime), 'hh:mm a')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          <span>
                            Wait: {entry.appointment.estimatedWaitMinutes} min
                          </span>
                        </div>
                        {entry.appointment.appointmentType === 'VIDEO' && (
                          <Badge variant="outline" className="text-xs">
                            Video
                          </Badge>
                        )}
                        {entry.appointment.isEmergency && (
                          <Badge variant="destructive" className="text-xs">
                            Emergency
                          </Badge>
                        )}
                      </div>

                      {entry.status === 'WAITING' && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => callNextMutation.mutate(doctorQueue.doctor.id)}
                            disabled={callNextMutation.isPending || index !== 0}
                          >
                            Call Patient
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
