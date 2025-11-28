import { useEffect, useState } from 'react';
import { CheckCircle, Loader2, XCircle, ArrowLeft } from 'lucide-react';
import axios from 'axios';

interface PaymentSuccessProps {
  onComplete: () => void;
}

const PaymentSuccess = ({ onComplete }: PaymentSuccessProps) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [tier, setTier] = useState('');
  const [limit, setLimit] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (sessionId) {
      verifyPayment(sessionId);
    } else {
      setStatus('error');
      setMessage('No session ID found');
    }
  }, []);

  const verifyPayment = async (sessionId: string) => {
    console.log('Verifying payment for session:', sessionId);
    try {
      const token = localStorage.getItem('auth_token');
      console.log('Auth token present:', !!token);
      
      const response = await axios.get(`/api/payments/success?session_id=${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('API Response:', response.data);

      if (response.data.success) {
        setStatus('success');
        setTier(response.data.tier || 'Unknown');
        setLimit(response.data.databaseLimit || 0);
        setMessage(response.data.message || 'Subscription activated');
      } else {
        setStatus('error');
        setMessage(response.data.error || 'Payment verification failed');
      }
    } catch (err: any) {
      console.error('Payment verification error:', err);
      console.error('Error response:', err.response?.data);
      setStatus('error');
      setMessage(err.response?.data?.error || err.message || 'Failed to verify payment');
    }
  };

  return (
    <div className="min-h-screen bg-[#030014] flex items-center justify-center p-4">
      <div className="bg-[#0e0e11]/95 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-purple-400 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Processing Payment...</h2>
            <p className="text-gray-400">Please wait while we verify your subscription.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
            <p className="text-gray-400 mb-4">{message}</p>
            
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-400 mb-1">Your new plan</p>
              <p className="text-2xl font-bold text-purple-400">{tier}</p>
              <p className="text-sm text-gray-400 mt-1">Up to {limit} databases</p>
            </div>

            <button
              onClick={onComplete}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold transition-all"
            >
              <ArrowLeft size={18} />
              Back to Dashboard
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-12 h-12 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Failed</h2>
            <p className="text-gray-400 mb-6">{message}</p>

            <button
              onClick={onComplete}
              className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-semibold transition-all"
            >
              <ArrowLeft size={18} />
              Back to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
