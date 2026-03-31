import axios from 'axios';

export interface TelegramMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class TelegramService {
  private botToken: string;
  private chatId: string | null = null;
  private mockMode: boolean;

  constructor(botToken?: string, mockMode: boolean = false) {
    this.botToken = botToken || process.env.TELEGRAM_BOT_TOKEN || '';
    this.mockMode = mockMode || process.env.NODE_ENV === 'development';
  }

  async sendMessage(chatId: string, text: string): Promise<TelegramMessageResult> {
    if (this.mockMode || !this.botToken) {
      console.log(`[TELEGRAM MOCK] To ${chatId}: ${text}`);
      return { success: true, messageId: `mock_${Date.now()}` };
    }

    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        {
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }
      );

      if (response.data.ok) {
        return {
          success: true,
          messageId: response.data.result.message_id.toString(),
        };
      } else {
        return {
          success: false,
          error: response.data.description || 'Failed to send message',
        };
      }
    } catch (error: any) {
      console.error('Telegram API Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  async setWebhook(url: string): Promise<boolean> {
    if (!this.botToken) {
      console.warn('Telegram bot token not configured');
      return false;
    }

    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${this.botToken}/setWebhook`,
        { url }
      );
      return response.data.ok;
    } catch (error) {
      console.error('Failed to set webhook:', error);
      return false;
    }
  }

  async sendVerificationCode(chatId: string, code: string): Promise<TelegramMessageResult> {
    const message = `
🎓 <b>Dreamland College Verification</b>

Your verification code is:

<b>${code}</b>

Do not share this code with anyone.
Valid for 10 minutes.

— Dreamland College
    `.trim();

    return this.sendMessage(chatId, message);
  }

  async sendWelcomeMessage(chatId: string, studentName: string): Promise<TelegramMessageResult> {
    const message = `
🎉 <b>Welcome to Dreamland College!</b>

Dear ${studentName},

Your registration has been confirmed!

You can now login to your student portal with your email and password.

Login at: https://dreamland.edu/login

Best regards,
Dreamland College Team
    `.trim();

    return this.sendMessage(chatId, message);
  }

  async sendPaymentConfirmation(chatId: string, amount: number, ref: string): Promise<TelegramMessageResult> {
    const message = `
✅ <b>Payment Confirmed!</b>

Your payment of <b>${amount} ETB</b> has been verified successfully.

Reference: ${ref}

Thank you for choosing Dreamland College!
    `.trim();

    return this.sendMessage(chatId, message);
  }

  async sendPasswordResetCode(chatId: string, code: string): Promise<TelegramMessageResult> {
    const message = `
🔐 <b>Dreamland College Password Reset</b>

Your reset code is:

<b>${code}</b>

Valid for 1 hour.

If you didn't request this, contact support immediately.
    `.trim();

    return this.sendMessage(chatId, message);
  }

  async sendGradeNotification(chatId: string, courseName: string, grade: string): Promise<TelegramMessageResult> {
    const message = `
📚 <b>Grade Released</b>

Your final grade for <b>${courseName}</b> is:

<b>${grade}</b>

Check your portal for full details.
    `.trim();

    return this.sendMessage(chatId, message);
  }

  async sendBulkMessage(chatIds: string[], message: string): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const chatId of chatIds) {
      const result = await this.sendMessage(chatId, message);
      if (result.success) sent++;
      else failed++;
    }

    return { sent, failed };
  }

  async getChatIdByUsername(username: string): Promise<string | null> {
    if (this.mockMode || !this.botToken) {
      console.log(`[TELEGRAM MOCK] Looking up chat ID for @${username}`);
      return `mock_${username}_${Date.now()}`;
    }

    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${this.botToken}/getUpdates`
      );

      if (response.data.ok && response.data.result) {
        for (const update of response.data.result) {
          if (update.message?.chat?.username === username.replace('@', '')) {
            return update.message.chat.id.toString();
          }
        }
      }

      console.warn(`Could not find chat ID for @${username}`);
      return null;
    } catch (error) {
      console.error('Error looking up Telegram user:', error);
      return null;
    }
  }

  parseUpdate(update: any): { chatId: string; message: string; username?: string } | null {
    if (!update.message) return null;

    const chat = update.message.chat;
    const text = update.message.text;

    return {
      chatId: chat.id.toString(),
      message: text || '',
      username: chat.username,
    };
  }

  getBotInfo(): Promise<any> {
    if (!this.botToken) {
      return Promise.resolve({ ok: false, error: 'No bot token' });
    }

    return axios.get(`https://api.telegram.org/bot${this.botToken}/getMe`).then(r => r.data);
  }
}

export default TelegramService;
