import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import paymentService from '../../services/payments';
import { toast } from 'sonner';
import { Loader2, CreditCard, Lock, ArrowLeft } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export default function PaymentCheckout() {
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appointmentId) {
      toast.error('No appointment specified');
      return;
    }

    loadPaymentIntent();
  }, [appointmentId]);

  const loadPaymentIntent = async () => {
    try {
      setLoading(true);
      const paymentIntent = await paymentService.createPaymentIntent(appointmentId!);
      setClientSecret(paymentIntent.clientSecret);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-gray-600">Initializing payment...</p>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-gray-600">Unable to initialize payment. Please try again.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm appointmentId={appointmentId!} />
        </Elements>
      </div>
    </div>
  );
}

function CheckoutForm({ appointmentId }: { appointmentId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success?appointmentId=${appointmentId}`,
        },
      });

      if (error) {
        toast.error(error.message);
      }
    } catch (error: any) {
      toast.error('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Complete Payment</h1>
        <p className="text-gray-600 mt-1">Secure payment for your appointment</p>
      </div>

      {/* Payment Form */}
      <Card className="p-6">
        <form onSubmit={handleSubmit}>
          {/* Security Badge */}
          <div className="flex items-center gap-2 mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <Lock className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">Secure Payment</p>
              <p className="text-xs text-green-700">
                Your payment information is encrypted and secure
              </p>
            </div>
          </div>

          {/* Payment Element */}
          <div className="mb-6">
            <PaymentElement />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!stripe || processing}
            className="w-full"
            size="lg"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Pay Now
              </>
            )}
          </Button>

          {/* Footer Text */}
          <p className="text-xs text-gray-500 text-center mt-4">
            By confirming your payment, you agree to our terms and conditions
          </p>
        </form>
      </Card>

      {/* Info */}
      <Card className="p-4 mt-4 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-900">
          💡 <strong>Note:</strong> You will receive an invoice via email after successful payment
        </p>
      </Card>
    </div>
  );
}
