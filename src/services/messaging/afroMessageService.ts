interface AfroMessageConfig {
  apiKey?: string;
  senderId?: string;
  identifierId?: string;
  mockMode?: boolean;
}

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class AfroMessageService {
  private readonly apiKey?: string;
  private readonly senderId: string;
  private readonly identifierId?: string;
  private readonly mockMode: boolean;

  constructor(config: AfroMessageConfig) {
    this.apiKey = config.apiKey;
    this.senderId = config.senderId || 'Dreamland';
    this.identifierId = config.identifierId;
    this.mockMode = !!config.mockMode || !config.apiKey;
  }

  async sendSMS(phone: string, message: string): Promise<SMSResult> {
    if (!phone || !message) {
      return { success: false, error: 'Phone and message are required' };
    }

    if (this.mockMode) {
      const messageId = `mock-sms-${Date.now()}`;
      console.log(`[AfroMessage:mock] ${phone}: ${message}`);
      return { success: true, messageId };
    }

    try {
      const response = await fetch('https://api.afromessage.com/api/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phone,
          from: this.senderId,
          sender: this.senderId,
          message,
          identifier_id: this.identifierId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: errorText || `HTTP ${response.status}` };
      }

      const data = (await response.json().catch(() => ({}))) as {
        acknowledge?: string;
        message_id?: string;
      };
      return {
        success: true,
        messageId: data?.acknowledge || data?.message_id || `sms-${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown SMS error',
      };
    }
  }

  async sendBulkSMS(phones: string[], message: string): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const phone of phones) {
      const result = await this.sendSMS(phone, message);
      if (result.success) {
        sent += 1;
      } else {
        failed += 1;
      }
    }

    return { sent, failed };
  }
}
