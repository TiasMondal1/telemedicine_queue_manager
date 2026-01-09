import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Clock, Phone, AlertCircle, User, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { queueService } from '@/services/queue';
import { doctorService } from '@/services/appointments';
import { useAuthStore } from '@/store/authStore';
import { getSocket } from '@/services/socket';

export default function DoctorQueue() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [currentAppointment, setCurrentAppointment] = useState<any>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);

  const { register, handleSubmit, reset } = useForm();

  // Get doctor ID
  const doctorId = user?.doctorProfile?.id;

  // Get queue
  const { data, isLoading } = useQuery({
    queryKey: ['doctor-queue', doctorId],
    queryFn: () => queueService.getDoctorQueue(doctorId!),
    enabled: !!doctorId,
    refetchInterval: 30000,
  });

  // Call next mutation
  const callNextMutation = useMutation({
    mutationFn: () => queueService.callNextPatient(doctorId!),
    onSuccess: () => {
      toast.success('Next patient called');
      queryClient.invalidateQueries({ queryKey: ['doctor-queue'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to call patient');
    },
  });

  // Start consultation mutation
  const startMutation = useMutation({
    mutationFn: queueService.startConsultation,
    onSuccess: () => {
      toast.success('Consultation started');
      queryClient.invalidateQueries({ queryKey: ['doctor-queue'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to start consultation');
    },
  });

  // Complete consultation mutation
  const completeMutation = useMutation({
    mutationFn: ({ appointmentId, data }: any) =>
      queueService.completeConsultation(appointmentId, data),
    onSuccess: () => {
      toast.success('Consultation completed');
      setCurrentAppointment(null);
      setShowNotesModal(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['doctor-queue'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to complete consultation');
    },
  });

  // Socket.io real-time updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('queue:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-queue'] });
    });

    socket.on('queue:consultation_started', () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-queue'] });
    });

    return () => {
      socket.off('queue:updated');
      socket.off('queue:consultation_started');
    };
  }, [queryClient]);

  const queue = data?.queue || [];
  const statistics = data?.statistics || {};

  // Find current patient in consultation
  const inConsultation = queue.find((entry: any) => entry.status === 'IN_CONSULTATION');

  const onCompleteConsultation = (formData: any) => {
    if (!currentAppointment) return;

    completeMutation.mutate({
      appointmentId: currentAppointment.id,
      data: formData,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">My Queue</h1>
        <p className="text-gray-600">Manage your patient consultations</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Waiting</p>
              <p className="text-3xl font-bold text-blue-600">{statistics.waiting || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">In Consultation</p>
              <p className="text-3xl font-bold text-green-600">{statistics.inConsultation || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Completed Today</p>
              <p className="text-3xl font-bold text-gray-600">{statistics.completed || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Total Today</p>
              <p className="text-3xl font-bold">{statistics.totalToday || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Patient */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Current Patient</CardTitle>
                {queue.length > 0 && !inConsultation && (
                  <Button
                    onClick={() => callNextMutation.mutate()}
                    disabled={callNextMutation.isPending}
                  >
                    Call Next Patient
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {inConsultation ? (
                <div>
                  <div className="flex items-start gap-4 mb-6">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold">
                        {inConsultation.appointment.patient.user.firstName}{' '}
                        {inConsultation.appointment.patient.user.lastName}
                      </h3>
                      <p className="text-gray-600">
                        Queue #{inConsultation.queuePosition}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {inConsultation.appointment.patient.user.phone}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Started {format(new Date(inConsultation.appointment.actualStartTime), 'hh:mm a')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Patient Details */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <h4 className="font-semibold mb-3">Patient Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Age</p>
                        <p className="font-medium">
                          {inConsultation.appointment.patient.dateOfBirth
                            ? new Date().getFullYear() -
                              new Date(inConsultation.appointment.patient.dateOfBirth).getFullYear()
                            : 'N/A'}{' '}
                          years
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Blood Group</p>
                        <p className="font-medium">
                          {inConsultation.appointment.patient.bloodGroup || 'N/A'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-600">Allergies</p>
                        <p className="font-medium">
                          {inConsultation.appointment.patient.allergies?.join(', ') || 'None'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        setCurrentAppointment(inConsultation.appointment);
                        setShowNotesModal(true);
                      }}
                      className="flex-1"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Complete Consultation
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No patient in consultation</p>
                  <p className="text-sm mt-2">Call the next patient to start</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Queue */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Queue</CardTitle>
            </CardHeader>
            <CardContent>
              {queue.filter((e: any) => e.status === 'WAITING').length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No patients waiting</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {queue
                    .filter((e: any) => e.status === 'WAITING')
                    .slice(0, 5)
                    .map((entry: any) => (
                      <div key={entry.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">
                            #{entry.queuePosition}{' '}
                            {entry.appointment.patient.user.firstName}
                          </h4>
                          <Badge variant="secondary">
                            {entry.appointment.estimatedWaitMinutes} min
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">
                          {format(new Date(entry.appointment.scheduledTime), 'hh:mm a')}
                        </p>
                        {entry.appointment.isEmergency && (
                          <Badge variant="destructive" className="mt-2">
                            Emergency
                          </Badge>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Complete Consultation Modal */}
      {showNotesModal && currentAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <CardHeader>
              <CardTitle>Complete Consultation</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onCompleteConsultation)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Consultation Notes
                  </label>
                  <textarea
                    {...register('consultationNotes')}
                    className="w-full p-2 border rounded-md"
                    rows={4}
                    placeholder="Enter consultation notes..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Diagnosis</label>
                  <Input
                    {...register('diagnosis')}
                    placeholder="Enter diagnosis..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Follow-up Date (optional)
                  </label>
                  <Input
                    {...register('followUpDate')}
                    type="date"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNotesModal(false);
                      setCurrentAppointment(null);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={completeMutation.isPending}
                    className="flex-1"
                  >
                    {completeMutation.isPending ? 'Saving...' : 'Complete'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
