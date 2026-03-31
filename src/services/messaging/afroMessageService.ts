
export interface AfroMessageConfig {
  apiKey?: string;
  senderId?: string;
  identifierId?: string;
  mockMode?: boolean;
}

export interface AfroMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class AfroMessageService {
  private apiKey: string;
  private senderId: string;
  private identifierId: string;
  private baseUrl: string = 'https://api.afromessage.com/api';
  private mockMode: boolean;

  constructor(config: AfroMessageConfig) {
    this.apiKey = config.apiKey || '';
    this.senderId = config.senderId || 'Dreamland';
    this.identifierId = config.identifierId || '';
    this.mockMode = config.mockMode || process.env.AFROMESSAGE_MOCK_MODE === 'true' || false;
    
    if (!this.apiKey && !this.mockMode) {
      console.warn('⚠️  AfroMessage API key not configured. SMS features will fail.');
    }
    
    if (this.mockMode) {
      console.log('📱 AfroMessage SMS service running in MOCK mode (messages logged only)');
    } else {
      console.log('📱 AfroMessage SMS service initialized with key:', this.apiKey.substring(0, 10) + '...');
    }
  }

  async sendSMS(phoneNumber: string, message: string): Promise<AfroMessageResult> {
    if (this.mockMode || !this.apiKey || this.apiKey === 'demo_key' || this.apiKey === 'YOUR_AFROMESSAGE_API_KEY_HERE') {
      console.log(`[SMS MOCK] To: ${phoneNumber}`);
      console.log(`[SMS MOCK] Message: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
      return { 
        success: true, 
        messageId: `mock_sms_${Date.now()}`,
        error: 'MOCK_MODE: SMS not actually sent'
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
          from: this.identifierId
        })
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        console.error('❌ AfroMessage API Error:', responseText);
        return { success: false, error: `API Error ${response.status}: ${responseText}` };
      }

      try {
        const result = JSON.parse(responseText);
        if (result.acknowledge === 'success') {
          console.log(`✅ SMS sent to ${phoneNumber} (ID: ${result.response?.message_id})`);
          return { success: true, messageId: result.response?.message_id };
        } else {
          console.error('❌ SMS failed:', result);
          return { success: false, error: result.response?.errors?.[0] || 'SMS sending failed' };
        }
      } catch {
        console.log(`✅ SMS sent to ${phoneNumber}:`, responseText);
        return { success: true, messageId: responseText };
      }
    } catch (error: any) {
      console.error('❌ AfroMessage SMS error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendOTP(phoneNumber: string, code: string, prefix?: string): Promise<AfroMessageResult> {
    const message = prefix ? `${prefix} ${code}` : `Your verification code is: ${code}`;
    return this.sendSMS(phoneNumber, message);
  }

  async sendBulkSMS(phoneNumbers: string[], message: string): Promise<{ success: boolean; sent: number; failed: number; error?: string }> {
    if (this.mockMode || !this.apiKey || this.apiKey === 'demo_key' || this.apiKey === 'YOUR_AFROMESSAGE_API_KEY_HERE') {
      console.log(`[SMS MOCK] Bulk SMS to ${phoneNumbers.length} recipients:`);
      console.log(`[SMS MOCK] Message: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
      return { 
        success: true, 
        sent: phoneNumbers.length,
        failed: 0,
        error: 'MOCK_MODE: Bulk SMS not actually sent'
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
          recipients: phoneNumbers.map(num => ({ to: num, message, from: this.identifierId })),
        })
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        console.error('❌ AfroMessage Bulk API Error:', responseText);
        return { success: false, sent: 0, failed: phoneNumbers.length, error: responseText };
      }

      console.log(`✅ Bulk SMS sent to ${phoneNumbers.length} recipients`);
      return { success: true, sent: phoneNumbers.length, failed: 0 };
    } catch (error: any) {
      console.error('❌ AfroMessage bulk SMS error:', error.message);
      return { success: false, sent: 0, failed: phoneNumbers.length, error: error.message };
    }
  }
}
