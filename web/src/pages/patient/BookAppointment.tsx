import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, addDays, startOfDay } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { appointmentService, doctorService } from '@/services/appointments';

export default function BookAppointment() {
  const navigate = useNavigate();
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [appointmentType, setAppointmentType] = useState<'IN_PERSON' | 'VIDEO'>('IN_PERSON');

  // Get doctors
  const { data: doctorsData, isLoading: loadingDoctors } = useQuery({
    queryKey: ['doctors', { isAcceptingAppointments: true }],
    queryFn: () => doctorService.getDoctors({ isAcceptingAppointments: true }),
  });

  // Get available slots
  const { data: slotsData, isLoading: loadingSlots, refetch: refetchSlots } = useQuery({
    queryKey: ['available-slots', selectedDoctor, selectedDate],
    queryFn: () =>
      appointmentService.getAvailableSlots(
        selectedDoctor!,
        format(selectedDate!, 'yyyy-MM-dd')
      ),
    enabled: !!selectedDoctor && !!selectedDate,
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: appointmentService.createAppointment,
    onSuccess: () => {
      toast.success('Appointment booked successfully!');
      navigate('/patient/appointments');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to book appointment');
    },
  });

  const handleBookAppointment = () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) {
      toast.error('Please select doctor, date, and time');
      return;
    }

    createAppointmentMutation.mutate({
      doctorId: selectedDoctor,
      scheduledDate: format(selectedDate, 'yyyy-MM-dd'),
      scheduledTime: selectedTime,
      appointmentType,
    });
  };

  const doctors = doctorsData?.doctors || [];
  const slots = slotsData?.slots || [];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Book Appointment</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Step 1: Select Doctor */}
        <Card>
          <CardHeader>
            <CardTitle>1. Select Doctor</CardTitle>
            <CardDescription>Choose your preferred doctor</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingDoctors ? (
              <div className="text-center py-4">Loading doctors...</div>
            ) : doctors.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No doctors available
              </div>
            ) : (
              doctors.map((doctor: any) => (
                <div
                  key={doctor.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedDoctor === doctor.id
                      ? 'border-primary bg-primary/10'
                      : 'hover:border-gray-400'
                  }`}
                  onClick={() => {
                    setSelectedDoctor(doctor.id);
                    setSelectedDate(undefined);
                    setSelectedTime(null);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">
                        Dr. {doctor.user.firstName} {doctor.user.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">{doctor.specialization}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {doctor.experienceYears} years exp.
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-yellow-500">★</span>
                        <span className="text-sm font-medium">{doctor.rating.toFixed(1)}</span>
                        <span className="text-sm text-gray-500">
                          ({doctor.totalRatings} reviews)
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary">${doctor.consultationFee}</Badge>
                  </div>
                  {doctor.videoConsultationEnabled && (
                    <Badge variant="outline" className="mt-2">
                      Video Available
                    </Badge>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Step 2: Select Date */}
        <Card>
          <CardHeader>
            <CardTitle>2. Select Date</CardTitle>
            <CardDescription>Pick an appointment date</CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedDoctor ? (
              <div className="text-center py-8 text-gray-500">
                Please select a doctor first
              </div>
            ) : (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedTime(null);
                }}
                disabled={(date) =>
                  date < startOfDay(new Date()) || date > addDays(new Date(), 30)
                }
                className="rounded-md border"
              />
            )}

            {selectedDate && selectedDoctor && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Appointment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={appointmentType === 'IN_PERSON' ? 'default' : 'outline'}
                    onClick={() => setAppointmentType('IN_PERSON')}
                    className="w-full"
                  >
                    In-Person
                  </Button>
                  <Button
                    variant={appointmentType === 'VIDEO' ? 'default' : 'outline'}
                    onClick={() => setAppointmentType('VIDEO')}
                    className="w-full"
                  >
                    Video Call
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Select Time */}
        <Card>
          <CardHeader>
            <CardTitle>3. Select Time</CardTitle>
            <CardDescription>Choose available time slot</CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <div className="text-center py-8 text-gray-500">
                Please select a date first
              </div>
            ) : loadingSlots ? (
              <div className="text-center py-8">Loading slots...</div>
            ) : slots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No available slots for this date
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                {slots.map((slot: string) => (
                  <Button
                    key={slot}
                    variant={selectedTime === slot ? 'default' : 'outline'}
                    onClick={() => setSelectedTime(slot)}
                    className="w-full"
                  >
                    {slot}
                  </Button>
                ))}
              </div>
            )}

            {selectedTime && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold mb-2">Appointment Summary</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Doctor:</span> Dr.{' '}
                    {doctors.find((d: any) => d.id === selectedDoctor)?.user.lastName}
                  </p>
                  <p>
                    <span className="font-medium">Date:</span>{' '}
                    {format(selectedDate!, 'MMMM dd, yyyy')}
                  </p>
                  <p>
                    <span className="font-medium">Time:</span> {selectedTime}
                  </p>
                  <p>
                    <span className="font-medium">Type:</span>{' '}
                    {appointmentType === 'VIDEO' ? 'Video Consultation' : 'In-Person'}
                  </p>
                  <p className="pt-2 text-lg font-bold">
                    Fee: ${doctors.find((d: any) => d.id === selectedDoctor)?.consultationFee}
                  </p>
                </div>
                <Button
                  onClick={handleBookAppointment}
                  disabled={createAppointmentMutation.isPending}
                  className="w-full mt-4"
                >
                  {createAppointmentMutation.isPending
                    ? 'Booking...'
                    : 'Confirm Booking'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
