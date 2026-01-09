import api from './api';

export const queueService = {
  // Get all queues (receptionist view)
  getAllQueues: async () => {
    const response = await api.get('/queue/all');
    return response.data.data;
  },

  // Get specific doctor's queue
  getDoctorQueue: async (doctorId: string) => {
    const response = await api.get(`/queue/doctor/${doctorId}`);
    return response.data.data;
  },

  // Check in patient
  checkInPatient: async (appointmentId: string) => {
    const response = await api.post('/queue/check-in', { appointmentId });
    return response.data.data;
  },

  // Call next patient
  callNextPatient: async (doctorId: string) => {
    const response = await api.post(`/queue/doctor/${doctorId}/call-next`);
    return response.data.data;
  },

  // Start consultation
  startConsultation: async (appointmentId: string) => {
    const response = await api.post(`/queue/appointment/${appointmentId}/start`);
    return response.data.data;
  },

  // Complete consultation
  completeConsultation: async (
    appointmentId: string,
    data: {
      consultationNotes?: string;
      prescriptions?: any[];
      diagnosis?: string;
      followUpDate?: string;
    }
  ) => {
    const response = await api.post(`/queue/appointment/${appointmentId}/complete`, data);
    return response.data.data;
  },

  // Reorder queue
  reorderQueue: async (doctorId: string, queueEntryIds: string[]) => {
    const response = await api.put(`/queue/doctor/${doctorId}/reorder`, { queueEntryIds });
    return response.data;
  },

  // Mark no-show
  markNoShow: async (appointmentId: string) => {
    const response = await api.put(`/queue/appointment/${appointmentId}/no-show`);
    return response.data.data;
  },

  // Get my queue status (patient)
  getMyQueueStatus: async () => {
    const response = await api.get('/queue/my-status');
    return response.data.data;
  },
};
