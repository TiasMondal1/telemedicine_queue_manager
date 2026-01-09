import api from './api';

export const videoService = {
  // Start video call
  startVideoCall: async (appointmentId: string) => {
    const response = await api.post('/video/start', { appointmentId });
    return response.data.data;
  },

  // Join video call
  joinVideoCall: async (appointmentId: string) => {
    const response = await api.get(`/video/join/${appointmentId}`);
    return response.data.data;
  },

  // End video call
  endVideoCall: async (appointmentId: string) => {
    const response = await api.post(`/video/end/${appointmentId}`);
    return response.data.data;
  },

  // Get session info
  getSessionInfo: async (appointmentId: string) => {
    const response = await api.get(`/video/session/${appointmentId}`);
    return response.data.data;
  },
};
