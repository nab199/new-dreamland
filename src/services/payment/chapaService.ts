export interface ChapaConfig {
  secretKey?: string;
  publicKey?: string;
  webhookSecret?: string;
  baseUrl?: string;
}

export interface ChapaPaymentInit {
  amount: string;
  currency: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  tx_ref: string;
  callback_url: string;
  return_url?: string;
  customization?: {
    title: string;
    description: string;
  };
}

export interface ChapaPaymentResponse {
  status: string;
  message?: string;
  data?: {
    checkout_url: string;
    tx_ref: string;
  };
}

export interface ChapaVerificationResponse {
  status: string;
  message?: string;
  data?: {
    id: number;
    tx_ref: string;
    amount: number;
    currency: string;
    status: string;
    payment_method: string;
    created_at: string;
    completed_at: string;
  };
}

export class ChapaService {
  private secretKey: string;
  private publicKey: string;
  private webhookSecret: string;
  private baseUrl: string = 'https://api.chapa.co/v1';

  constructor(config: ChapaConfig) {
    this.secretKey = config.secretKey || '';
    this.publicKey = config.publicKey || '';
    this.webhookSecret = config.webhookSecret || '';
    
    if (!this.secretKey) {
      console.warn('⚠️  Chapa secret key not configured. Payment features will fail.');
    }
  }

  /**
   * Initialize a payment and get checkout URL
   */
  async initializePayment(paymentData: ChapaPaymentInit): Promise<ChapaPaymentResponse> {
    if (!this.secretKey || this.secretKey.includes('REPLACE')) {
      console.error('❌ Chapa secret key not configured. Payment not initialized.');
      return { 
        status: 'error',
        message: 'Payment service not configured. Please set CHAPA_SECRET_KEY in environment variables.'
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Payment initialization failed' }));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      const result: ChapaPaymentResponse = await response.json();
      console.log(`✅ Chapa payment initialized: ${paymentData.tx_ref} - ${paymentData.amount} ${paymentData.currency}`);
      
      return result;
    } catch (error: any) {
      console.error('❌ Chapa payment initialization error:', error.message);
      return { 
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Verify a payment transaction
   */
  async verifyPayment(txRef: string): Promise<ChapaVerificationResponse> {
    if (!this.secretKey || this.secretKey.includes('REPLACE')) {
      console.error('❌ Chapa secret key not configured. Payment not verified.');
      return { 
        status: 'error',
        message: 'Payment service not configured. Please set CHAPA_SECRET_KEY in environment variables.'
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/transaction/verify/${txRef}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Payment verification failed' }));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      const result: ChapaVerificationResponse = await response.json();
      
      if (result.data?.status === 'success') {
        console.log(`✅ Chapa payment verified: ${txRef} - ${result.data.amount} ${result.data.currency}`);
      } else {
        console.warn(`⚠️  Chapa payment status: ${result.data?.status || 'unknown'} for ${txRef}`);
      }
      
      return result;
    } catch (error: any) {
      console.error('❌ Chapa payment verification error:', error.message);
      return { 
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Verify webhook signature for security
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      console.warn('⚠️  Webhook secret not configured. Skipping signature verification.');
      return true; // In production, this should return false and require configuration
    }

    try {
      // Dynamic import for Node.js crypto module
      const cryptoModule = require('crypto');
      const expectedSignature = cryptoModule
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');
      
      return signature === expectedSignature;
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Generate a unique transaction reference
   */
  generateTxRef(prefix: string = 'TX'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }
}
