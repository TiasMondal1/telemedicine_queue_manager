import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import paymentService, { Payment } from '../../services/payments';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Download, DollarSign, CreditCard, Loader2, Receipt } from 'lucide-react';

export default function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const data = await paymentService.getPaymentHistory();
      setPayments(data);
    } catch (error) {
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (appointmentId: string) => {
    try {
      await paymentService.downloadInvoice(appointmentId);
      toast.success('Invoice downloaded');
    } catch (error) {
      toast.error('Failed to download invoice');
    }
  };

  const totalPaid = payments
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalRefunded = payments
    .filter((p) => p.status === 'REFUNDED')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment History</h1>
          <p className="text-gray-600 mt-1">View all your payment transactions</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold text-gray-900">${totalPaid.toFixed(2)}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Refunded</p>
                <p className="text-2xl font-bold text-gray-900">${totalRefunded.toFixed(2)}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Receipt className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Payment List */}
        <Card>
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="mt-2 text-gray-600">Loading payments...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No payment history yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                      Doctor/Patient
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {format(new Date(payment.paidAt), 'MMM dd, yyyy')}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {payment.doctorName || payment.patientName || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {payment.appointmentType}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        ${payment.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <Badge
                          className={
                            payment.status === 'PAID'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {payment.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadInvoice(payment.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
