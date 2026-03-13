
export interface AfroMessageConfig {
  apiKey?: string;
  senderId?: string;
  mockMode?: boolean;
}

export class AfroMessageService {
  private apiKey: string;
  private senderId: string;
  private mockMode: boolean;
  private baseUrl: string = 'https://api.afromessage.com/v1';

  constructor(config: AfroMessageConfig) {
    this.apiKey = config.apiKey || 'demo_key';
    this.senderId = config.senderId || 'College';
    this.mockMode = config.mockMode ?? true; // Default to mock mode
  }

  async sendSMS(phoneNumber: string, message: string): Promise<any> {
    if (this.mockMode) {
      console.log(`[MOCK] SMS to ${phoneNumber}: ${message}`);
      return { success: true, mock: true, messageId: `mock_${Date.now()}` };
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: phoneNumber,
          message: message,
          sender: this.senderId
        })
      });
      return await response.json();
    } catch (error) {
      console.error('AfroMessage error:', error);
      throw error;
    }
  }

  async sendBulkSMS(phoneNumbers: string[], message: string): Promise<any> {
    if (this.mockMode) {
      console.log(`[MOCK] Bulk SMS to ${phoneNumbers.length} numbers`);
      return phoneNumbers.map(num => ({ phone: num, status: 'mock_sent' }));
    }
    // Real implementation would go here
    return { success: false, error: 'Not implemented' };
  }
}
