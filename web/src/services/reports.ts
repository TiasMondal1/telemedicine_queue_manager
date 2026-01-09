import api from './api';

export interface ReportParams {
  reportType: 'appointment' | 'queue' | 'doctor' | 'financial';
  startDate: string;
  endDate: string;
  format?: 'json' | 'pdf' | 'csv';
}

export const reportService = {
  async generateReport(params: ReportParams) {
    if (params.format === 'pdf' || params.format === 'csv') {
      // Download file
      const response = await api.get('/reports/generate', {
        params,
        responseType: 'blob',
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const extension = params.format === 'pdf' ? 'pdf' : 'csv';
      link.setAttribute('download', `${params.reportType}-report-${new Date().toISOString().split('T')[0]}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } else {
      // Return JSON data
      const { data } = await api.get('/reports/generate', { params });
      return data.data;
    }
  },

  async getAppointmentReport(startDate: string, endDate: string) {
    const { data } = await api.get('/reports/appointments', {
      params: { startDate, endDate },
    });
    return data.data;
  },

  async getQueueReport(startDate: string, endDate: string) {
    const { data } = await api.get('/reports/queue', {
      params: { startDate, endDate },
    });
    return data.data;
  },

  async getDoctorReport(startDate: string, endDate: string) {
    const { data } = await api.get('/reports/doctors', {
      params: { startDate, endDate },
    });
    return data.data;
  },

  async getFinancialReport(startDate: string, endDate: string) {
    const { data } = await api.get('/reports/financial', {
      params: { startDate, endDate },
    });
    return data.data;
  },
};

export default reportService;
