interface ChapaConfig {
  secretKey?: string;
  publicKey?: string;
  webhookSecret?: string;
}

export class ChapaService {
  private readonly secretKey?: string;
  private readonly publicKey?: string;
  private readonly webhookSecret?: string;

  constructor(config: ChapaConfig) {
    this.secretKey = config.secretKey;
    this.publicKey = config.publicKey;
    this.webhookSecret = config.webhookSecret;
  }

  async initializePayment(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      success: false,
      disabled: true,
      message: 'Payment system is disabled',
      payload,
      hasSecretKey: !!this.secretKey,
      hasPublicKey: !!this.publicKey,
    };
  }

  async verifyPayment(txRef: string): Promise<Record<string, unknown>> {
    return {
      success: false,
      disabled: true,
      message: 'Payment system is disabled',
      txRef,
      hasWebhookSecret: !!this.webhookSecret,
    };
  }
}
