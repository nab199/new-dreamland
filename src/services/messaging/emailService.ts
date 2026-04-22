interface EmailConfig {
  enabled?: boolean;
  provider?: 'resend' | 'smtp';
  resendApiKey?: string;
  fromName?: string;
  fromAddress?: string;
}

export class EmailService {
  private readonly enabled: boolean;
  private readonly provider: 'resend' | 'smtp';
  private readonly resendApiKey?: string;
  private readonly fromName: string;
  private readonly fromAddress: string;

  constructor(config: EmailConfig) {
    this.enabled = !!config.enabled;
    this.provider = config.provider || 'resend';
    this.resendApiKey = config.resendApiKey;
    this.fromName = config.fromName || 'Dreamland College';
    this.fromAddress = config.fromAddress || 'onboarding@resend.dev';
  }

  async sendNotification(to: string, subject: string, text: string): Promise<void> {
    if (!this.enabled || !to) {
      console.log(`[Email:skip] to=${to} subject=${subject}`);
      return;
    }

    if (this.provider === 'resend' && this.resendApiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${this.fromName} <${this.fromAddress}>`,
          to: [to],
          subject,
          text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Email request failed with ${response.status}`);
      }
      return;
    }

    console.log(`[Email:mock] to=${to} subject=${subject}`);
  }

  async sendPasswordResetEmail(email: string, token: string, fullName: string): Promise<void> {
    const subject = 'Dreamland College Password Reset';
    const text = [
      `Hello ${fullName},`,
      '',
      'You requested a password reset.',
      `Your reset code is: ${token}`,
      '',
      'This code expires in 1 hour.',
      'If you did not request this, you can ignore this email.',
    ].join('\n');

    await this.sendNotification(email, subject, text);
  }
}
