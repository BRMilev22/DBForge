import { useState, useEffect } from 'react';
import { X, Check, Zap, Building2, Sparkles, Database, CreditCard, Loader2 } from 'lucide-react';
import { paymentApi, PaymentConfig, DatabaseUsage } from '../services/paymentApi';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsage?: DatabaseUsage;
}

const PricingModal = ({ isOpen, onClose, currentUsage }: PricingModalProps) => {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await paymentApi.getConfig();
      setConfig(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load pricing');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: string) => {
    if (tier === 'FREE' || tier === config?.currentTier) return;
    
    try {
      setCheckoutLoading(tier);
      setError(null);
      
      const baseUrl = window.location.origin;
      const session = await paymentApi.createCheckout(tier, baseUrl);
      
      // Redirect to Stripe Checkout
      window.location.href = session.url;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start checkout');
      setCheckoutLoading(null);
    }
  };

  if (!isOpen) return null;

  const tiers = [
    {
      key: 'FREE',
      name: 'Free',
      price: 0,
      icon: Database,
      color: 'gray',
      gradient: 'from-gray-500 to-gray-600',
      features: ['2 databases', 'All database types', 'Community support'],
    },
    {
      key: 'PRO',
      name: 'Pro',
      price: 9,
      icon: Zap,
      color: 'purple',
      gradient: 'from-purple-500 to-fuchsia-500',
      popular: true,
      features: ['10 databases', 'All database types', 'Priority support', 'API access', 'Advanced analytics'],
    },
    {
      key: 'BUSINESS',
      name: 'Business',
      price: 29,
      icon: Building2,
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-500',
      features: ['50 databases', 'All database types', '24/7 support', 'API access', 'Team management', 'Custom integrations'],
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0e0e11]/95 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-8 max-w-4xl w-full relative shadow-2xl shadow-purple-500/10 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-4">
            <Sparkles className="text-purple-400" size={16} />
            <span className="text-purple-400 text-sm font-medium">Upgrade Your Plan</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Choose Your Plan</h2>
          <p className="text-gray-400">Scale your databases as your project grows</p>
          
          {currentUsage && (
            <div className="mt-4 inline-flex items-center gap-4 px-4 py-2 bg-[#030014]/50 border border-gray-700 rounded-lg">
              <span className="text-gray-400 text-sm">Current usage:</span>
              <span className={`font-mono font-bold ${
                currentUsage.percentUsed >= 90 ? 'text-red-400' : 
                currentUsage.percentUsed >= 70 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {currentUsage.currentCount}/{currentUsage.limit}
              </span>
              <div className="h-2 w-24 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    currentUsage.percentUsed >= 90 ? 'bg-red-500' : 
                    currentUsage.percentUsed >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${currentUsage.percentUsed}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-purple-400" size={32} />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((tier) => {
              const isCurrent = config?.currentTier === tier.key;
              const isDowngrade = tier.key === 'FREE' && config?.currentTier !== 'FREE';
              const Icon = tier.icon;
              
              return (
                <div
                  key={tier.key}
                  className={`relative rounded-2xl p-6 transition-all duration-300 ${
                    tier.popular 
                      ? 'bg-gradient-to-b from-purple-500/10 to-fuchsia-500/10 border-2 border-purple-500/30 scale-105' 
                      : 'bg-[#030014]/50 border border-gray-700/50 hover:border-gray-600'
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full text-xs font-bold text-white">
                      MOST POPULAR
                    </div>
                  )}
                  
                  {isCurrent && (
                    <div className="absolute -top-3 right-4 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-xs font-medium text-green-400">
                      CURRENT
                    </div>
                  )}

                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tier.gradient} flex items-center justify-center mb-4`}>
                    <Icon className="text-white" size={24} />
                  </div>

                  <h3 className="text-xl font-bold text-white mb-1">{tier.name}</h3>
                  
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl font-bold text-white">${tier.price}</span>
                    {tier.price > 0 && <span className="text-gray-400">/month</span>}
                  </div>

                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                        <Check className={`${tier.color === 'purple' ? 'text-purple-400' : tier.color === 'blue' ? 'text-blue-400' : 'text-gray-400'}`} size={16} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleUpgrade(tier.key)}
                    disabled={isCurrent || checkoutLoading !== null || isDowngrade}
                    className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                      isCurrent
                        ? 'bg-green-500/20 text-green-400 cursor-default'
                        : isDowngrade
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        : tier.popular
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {checkoutLoading === tier.key ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Processing...
                      </>
                    ) : isCurrent ? (
                      <>
                        <Check size={18} />
                        Current Plan
                      </>
                    ) : isDowngrade ? (
                      'Contact Support'
                    ) : (
                      <>
                        <CreditCard size={18} />
                        {tier.price === 0 ? 'Get Started' : 'Upgrade'}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>All plans include SSL encryption and automatic backups.</p>
          <p className="mt-1">Cancel anytime. No questions asked.</p>
        </div>
      </div>
    </div>
  );
};

export default PricingModal;
