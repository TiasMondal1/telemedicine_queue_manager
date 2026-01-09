import api from './api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | 'PATIENT';
  isVerified: boolean;
  createdAt: string;
}

export const userService = {
  async getAllUsers(params?: { role?: string; search?: string }) {
    const { data } = await api.get('/users', { params });
    return data.data.users as User[];
  },

  async getUserById(userId: string) {
    const { data } = await api.get(`/users/${userId}`);
    return data.data.user;
  },

  async createUser(payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: string;
  }) {
    const { data } = await api.post('/users', payload);
    return data.data.user;
  },

  async updateUser(userId: string, payload: Partial<User>) {
    const { data } = await api.put(`/users/${userId}`, payload);
    return data.data.user;
  },

  async deleteUser(userId: string) {
    const { data } = await api.delete(`/users/${userId}`);
    return data;
  },

  async getUserProfile() {
    const { data } = await api.get('/users/profile');
    return data.data.user;
  },

  async updateProfile(payload: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) {
    const { data } = await api.put('/users/profile', payload);
    return data.data.user;
  },
};

export default userService;
