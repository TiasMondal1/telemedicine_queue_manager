import api from './api';

export interface PaymentIntent {
  clientSecret: string;
  amount: number;
  currency: string;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paidAt: string;
  refundedAt?: string;
  appointmentType: string;
  scheduledDate: string;
  patientName?: string;
  doctorName?: string;
}

export interface PaymentStats {
  totalRevenue: number;
  totalRefunded: number;
  netRevenue: number;
  totalTransactions: number;
  totalRefunds: number;
  averageTransactionValue: number;
}

export const paymentService = {
  async createPaymentIntent(appointmentId: string) {
    const { data } = await api.post('/payments/create-intent', { appointmentId });
    return data.data as PaymentIntent;
  },

  async getPaymentHistory() {
    const { data } = await api.get('/payments/history');
    return data.data.payments as Payment[];
  },

  async processRefund(appointmentId: string, reason?: string) {
    const { data } = await api.post(`/payments/refund/${appointmentId}`, { reason });
    return data.data;
  },

  async downloadInvoice(appointmentId: string) {
    const response = await api.get(`/payments/invoice/${appointmentId}`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `invoice-${appointmentId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async getPaymentStats(startDate: string, endDate: string) {
    const { data } = await api.get('/payments/stats', {
      params: { startDate, endDate },
    });
    return data.data as PaymentStats;
  },
};

export default paymentService;
