import api from './api';

export interface DashboardStats {
  today: {
    appointments: number;
    patients: number;
    queueLength: number;
  };
  week: {
    appointments: number;
    patients: number;
  };
  month: {
    appointments: number;
    patients: number;
  };
}

export interface AppointmentStat {
  date: string;
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

export interface QueuePerformance {
  averageWaitTime: number;
  averageConsultationTime: number;
  totalProcessed: number;
  totalCompleted: number;
}

export interface DoctorPerformance {
  doctorId: string;
  name: string;
  specialization: string;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  totalPatients: number;
  completedConsultations: number;
  avgConsultationTime: number;
  completionRate: number;
}

export interface Activity {
  type: string;
  title: string;
  description: string;
  date: string;
  status: string;
}

export interface PatientStats {
  totalAppointments: number;
  completedAppointments: number;
  upcomingAppointments: number;
  lastVisit: string | null;
}

export const analyticsService = {
  async getDashboardStats() {
    const { data } = await api.get('/analytics/dashboard');
    return data.data as DashboardStats;
  },

  async getAppointmentStats(days: number = 7) {
    const { data } = await api.get('/analytics/appointments', {
      params: { days },
    });
    return data.data as AppointmentStat[];
  },

  async getAppointmentTypeDistribution() {
    const { data } = await api.get('/analytics/appointments/distribution');
    return data.data as { type: string; count: number }[];
  },

  async getQueuePerformance(days: number = 7) {
    const { data } = await api.get('/analytics/queue/performance', {
      params: { days },
    });
    return data.data as QueuePerformance;
  },

  async getDoctorPerformance(startDate?: string, endDate?: string) {
    const { data } = await api.get('/analytics/doctors/performance', {
      params: { startDate, endDate },
    });
    return data.data as DoctorPerformance[];
  },

  async getRecentActivity(limit: number = 10) {
    const { data } = await api.get('/analytics/activity', {
      params: { limit },
    });
    return data.data as Activity[];
  },

  async getPatientStats() {
    const { data } = await api.get('/analytics/patient/stats');
    return data.data as PatientStats;
  },
};

export default analyticsService;
