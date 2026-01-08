import api from './api';

export interface CreateAppointmentData {
  doctorId: string;
  scheduledDate: string;
  scheduledTime: string;
  appointmentType: 'IN_PERSON' | 'VIDEO';
  isEmergency?: boolean;
}

export const appointmentService = {
  getAvailableSlots: async (doctorId: string, date: string) => {
    const response = await api.get('/appointments/available-slots', {
      params: { doctorId, date },
    });
    return response.data.data;
  },

  createAppointment: async (data: CreateAppointmentData) => {
    const response = await api.post('/appointments', data);
    return response.data.data;
  },

  getMyAppointments: async (params?: { status?: string; startDate?: string; endDate?: string }) => {
    const response = await api.get('/appointments/my-appointments', { params });
    return response.data.data;
  },

  getAppointmentById: async (id: string) => {
    const response = await api.get(`/appointments/${id}`);
    return response.data.data;
  },

  cancelAppointment: async (id: string, reason?: string) => {
    const response = await api.put(`/appointments/${id}/cancel`, { reason });
    return response.data.data;
  },

  rescheduleAppointment: async (id: string, newDate: string, newTime: string) => {
    const response = await api.put(`/appointments/${id}/reschedule`, { newDate, newTime });
    return response.data.data;
  },
};

export const doctorService = {
  getDoctors: async (params?: { clinicId?: string; specialization?: string; isAcceptingAppointments?: boolean }) => {
    const response = await api.get('/doctors', { params });
    return response.data.data;
  },

  getDoctorById: async (id: string) => {
    const response = await api.get(`/doctors/${id}`);
    return response.data.data;
  },
};
