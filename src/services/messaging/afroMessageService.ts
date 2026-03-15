
export interface AfroMessageConfig {
  apiKey?: string;
  senderId?: string;
}

export class AfroMessageService {
  private apiKey: string;
  private senderId: string;
  private baseUrl: string = 'https://api.afromessage.com/v1';

  constructor(config: AfroMessageConfig) {
    this.apiKey = config.apiKey || '';
    this.senderId = config.senderId || 'Dreamland';
    
    if (!this.apiKey) {
      console.warn('⚠️  AfroMessage API key not configured. SMS features will fail.');
    }
  }

  async sendSMS(phoneNumber: string, message: string): Promise<any> {
    if (!this.apiKey || this.apiKey === 'demo_key') {
      console.error('❌ AfroMessage API key not configured. SMS not sent.');
      return { 
        success: false, 
        error: 'SMS service not configured. Please set AFROMESSAGE_API_KEY in environment variables.' 
      };
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ SMS sent to ${phoneNumber} (Message ID: ${result.messageId || 'N/A'})`);
      return result;
    } catch (error: any) {
      console.error('❌ AfroMessage SMS error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendBulkSMS(phoneNumbers: string[], message: string): Promise<any> {
    if (!this.apiKey || this.apiKey === 'demo_key') {
      console.error('❌ AfroMessage API key not configured. Bulk SMS not sent.');
      return { 
        success: false, 
        error: 'SMS service not configured. Please set AFROMESSAGE_API_KEY in environment variables.' 
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipients: phoneNumbers.map(num => ({ to: num, message, sender: this.senderId })),
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Bulk SMS sent to ${phoneNumbers.length} recipients`);
      return result;
    } catch (error: any) {
      console.error('❌ AfroMessage bulk SMS error:', error.message);
      return { success: false, error: error.message };
    }
  }
}
