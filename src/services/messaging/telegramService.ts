export class TelegramService {
  private readonly botToken?: string;

  constructor(botToken?: string) {
    this.botToken = botToken;
  }

  async sendMessage(chatId: string, text: string): Promise<{ success: boolean; error?: string }> {
    if (!this.botToken) {
      console.log(`[Telegram:skip] chatId=${chatId}`);
      return { success: false, error: 'Telegram bot token is not configured' };
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: errorText || `HTTP ${response.status}` };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Telegram error',
      };
    }
  }
}
