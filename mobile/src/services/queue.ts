import api from './api';

export const queueService = {
  getMyQueueStatus: async () => {
    const response = await api.get('/queue/my-status');
    return response.data.data;
  },
};
