import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { CheckCircle, Download, FileText } from 'lucide-react';
import paymentService from '../../services/payments';
import { toast } from 'sonner';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const appointmentId = searchParams.get('appointmentId');

  useEffect(() => {
    // Optional: Verify payment status with backend
  }, [appointmentId]);

  const handleDownloadInvoice = async () => {
    if (!appointmentId) return;

    try {
      await paymentService.downloadInvoice(appointmentId);
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      toast.error('Failed to download invoice');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8 px-4">
      <Card className="max-w-md w-full p-8 text-center">
        {/* Success Icon */}
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mb-8">
          Your appointment has been confirmed and paid
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleDownloadInvoice}
            variant="outline"
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Invoice
          </Button>

          <Button
            onClick={() => navigate('/patient/appointments')}
            className="w-full"
          >
            <FileText className="h-4 w-4 mr-2" />
            View My Appointments
          </Button>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900">
            📧 A confirmation email with your invoice has been sent to your email address
          </p>
        </div>
      </Card>
    </div>
  );
}
