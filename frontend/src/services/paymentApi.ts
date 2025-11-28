import axios from 'axios';

const API_URL = '/api/payments';

export interface PricingTier {
  name: string;
  price: number;
  databases: number;
  features: string[];
}

export interface PaymentConfig {
  publishableKey: string;
  currentTier: string;
  databaseLimit: number;
  hasSubscription: boolean;
  pricing: {
    FREE: PricingTier;
    PRO: PricingTier;
    BUSINESS: PricingTier;
  };
}

export interface SubscriptionInfo {
  tier: string;
  databaseLimit: number;
  stripeCustomerId: string | null;
  subscriptionId: string | null;
  expiresAt: string | null;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export interface DatabaseUsage {
  currentCount: number;
  limit: number;
  tier: string;
  remaining: number;
  percentUsed: number;
  canCreate: boolean;
}

const getAuthHeader = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const paymentApi = {
  // Get payment config (requires auth to get current tier)
  getConfig: async (): Promise<PaymentConfig> => {
    const response = await axios.get(`${API_URL}/config`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  // Get current subscription info
  getSubscription: async (): Promise<SubscriptionInfo> => {
    const response = await axios.get(`${API_URL}/subscription`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  // Create checkout session for upgrading
  createCheckout: async (tier: string, baseUrl: string): Promise<CheckoutSession> => {
    const response = await axios.post(
      `${API_URL}/checkout`,
      { tier, baseUrl },
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  // Cancel subscription
  cancelSubscription: async (): Promise<{ success: boolean; message: string }> => {
    const response = await axios.post(
      `${API_URL}/cancel`,
      {},
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  // Get database usage
  getDatabaseUsage: async (): Promise<DatabaseUsage> => {
    const response = await axios.get('/api/databases/usage', {
      headers: getAuthHeader(),
    });
    return response.data;
  },
};

export default paymentApi;
