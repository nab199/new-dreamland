import { Resend } from 'resend';

export interface EmailConfig {
  enabled: boolean;
  provider: 'resend' | 'smtp';
  resendApiKey?: string;
  fromName: string;
  fromAddress: string;
}

export interface EmailResponse {
  success: boolean;
  error?: string;
  messageId?: string;
}

export class EmailService {
  private resend: any;
  private config: EmailConfig;
  private enabled: boolean;

  constructor(config: EmailConfig) {
    this.config = config;
    this.enabled = config.enabled;

    if (this.enabled && config.provider === 'resend' && config.resendApiKey) {
      this.resend = new Resend(config.resendApiKey);
      console.log('✅ Resend email service initialized');
    } else if (this.enabled) {
      console.log('⚠️  Email enabled but no valid provider configured');
    } else {
      console.log('⚠️  Email service disabled');
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    to: string,
    resetCode: string,
    userName: string
  ): Promise<EmailResponse> {
    if (!this.enabled) {
      console.log(`[EMAIL DISABLED] Password reset code for ${to}: ${resetCode}`);
      return { success: false, error: 'Email service disabled' };
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f4f4f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 40px 30px; text-align: center; }
            .logo { font-size: 48px; margin-bottom: 10px; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
            .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; }
            .content { padding: 40px 30px; }
            .greeting { font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 15px; }
            .message { color: #4b5563; line-height: 1.8; margin-bottom: 25px; }
            .code-box { background: linear-gradient(135deg, #eff6ff, #dbeafe); border: 2px solid #1e40af; padding: 30px; text-align: center; margin: 25px 0; border-radius: 8px; }
            .code-label { color: #6b7280; font-size: 14px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
            .code { font-size: 36px; font-weight: 800; color: #1e40af; letter-spacing: 8px; font-family: 'Courier New', monospace; }
            .expiry { color: #6b7280; font-size: 13px; margin-top: 15px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 6px; }
            .warning-title { color: #92400e; font-weight: 600; margin-bottom: 10px; font-size: 15px; }
            .warning-text { color: #78350f; font-size: 14px; margin: 0; }
            .footer { background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
            .footer-text { color: #6b7280; font-size: 13px; margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎓</div>
              <h1>Dreamland College</h1>
              <p>Password Reset Request</p>
            </div>
            
            <div class="content">
              <div class="greeting">Dear ${userName || 'User'},</div>
              
              <div class="message">
                We received a request to reset your password for your Dreamland College account. 
                Use the code below to complete the password reset process.
              </div>
              
              <div class="code-box">
                <div class="code-label">Your Reset Code</div>
                <div class="code">${resetCode}</div>
                <div class="expiry">⏱️ Valid for 1 hour</div>
              </div>
              
              <div class="message">
                <strong>Important Information:</strong>
                <ul style="color: #4b5563; line-height: 2;">
                  <li>This code will expire in 1 hour</li>
                  <li>Do not share this code with anyone</li>
                  <li>Our staff will never ask for this code</li>
                  <li>If you didn't request this, contact support immediately</li>
                </ul>
              </div>
              
              <div class="warning">
                <div class="warning-title">⚠️ Security Notice</div>
                <p class="warning-text">
                  If you didn't request this password reset, your account may be at risk. 
                  Please contact our support team immediately at 
                  <a href="mailto:support@dreamland.edu.et" style="color: #92400e; font-weight: 600;">support@dreamland.edu.et</a>
                </p>
              </div>
              
              <div class="message">
                Need help? Contact us at <a href="mailto:support@dreamland.edu.et" style="color: #1e40af;">support@dreamland.edu.et</a>
              </div>
            </div>
            
            <div class="footer">
              <p class="footer-text">© ${new Date().getFullYear()} Dreamland College. All rights reserved.</p>
              <p class="footer-text">This is an automated security message. Please do not reply.</p>
              <p class="footer-text" style="font-size: 12px; color: #9ca3af;">Dreamland College Management System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
      Dear ${userName || 'User'},

      We received a request to reset your password for your Dreamland College account.

      Your reset code is: ${resetCode}

      This code will expire in 1 hour.

      If you didn't request this password reset, please contact our support team immediately at support@dreamland.edu.et.

      © ${new Date().getFullYear()} Dreamland College. All rights reserved.
    `;

    try {
      const data = await this.resend.emails.send({
        from: `${this.config.fromName} <${this.config.fromAddress}>`,
        to: to,
        subject: '🔐 Password Reset Request - Dreamland College',
        html: htmlContent,
        text: textContent,
      });

      console.log(`✅ Password reset email sent to: ${to} (ID: ${data.id})`);
      return { success: true, messageId: data.id };
    } catch (error: any) {
      console.error('❌ Failed to send password reset email:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(
    to: string,
    userName: string,
    temporaryPassword?: string
  ): Promise<EmailResponse> {
    if (!this.enabled) {
      console.log(`[EMAIL DISABLED] Welcome email for ${to}`);
      return { success: false, error: 'Email service disabled' };
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 40px 30px; text-align: center; }
            .logo { font-size: 48px; margin-bottom: 10px; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
            .content { padding: 40px 30px; }
            .credentials { background: linear-gradient(135deg, #fef3c7, #fde68a); border: 2px solid #f59e0b; padding: 25px; margin: 25px 0; border-radius: 8px; }
            .credential-row { display: flex; justify-content: space-between; margin: 10px 0; font-size: 15px; }
            .credential-label { color: #78350f; font-weight: 600; }
            .credential-value { color: #92400e; font-family: monospace; background: white; padding: 5px 10px; border-radius: 4px; }
            .features { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 6px; }
            .footer { background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎓</div>
              <h1>Welcome to Dreamland College!</h1>
            </div>
            <div class="content">
              <p style="font-size: 18px; font-weight: 600; color: #1f2937;">Dear ${userName},</p>
              <p style="color: #4b5563; line-height: 1.8;">
                Welcome to Dreamland College Management System! Your account has been created successfully.
              </p>
              ${temporaryPassword ? `
                <div class="credentials">
                  <h3 style="margin: 0 0 15px 0; color: #92400e; font-size: 16px;">🔐 Your Login Credentials</h3>
                  <div class="credential-row">
                    <span class="credential-label">Username/Email:</span>
                    <span class="credential-value">${to}</span>
                  </div>
                  <div class="credential-row">
                    <span class="credential-label">Temporary Password:</span>
                    <span class="credential-value">${temporaryPassword}</span>
                  </div>
                  <p style="color: #dc2626; font-size: 13px; margin: 15px 0 0 0; font-weight: 600;">
                    ⚠️ Please change this password after your first login!
                  </p>
                </div>
              ` : ''}
              <div class="features">
                <strong style="color: #1e40af; font-size: 15px;">📱 What you can do:</strong>
                <ul style="color: #4b5563; line-height: 2; margin: 10px 0;">
                  <li>View your grades and transcripts</li>
                  <li>Register for courses online</li>
                  <li>Check your attendance record</li>
                  <li>Make payments securely</li>
                  <li>Receive important notifications</li>
                </ul>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="http://localhost:3000" style="background: #1e40af; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
                  Login to Your Account
                </a>
              </div>
              <p style="color: #4b5563; line-height: 1.8;">
                Need help? Contact our support team at 
                <a href="mailto:support@dreamland.edu.et" style="color: #1e40af; font-weight: 600;">support@dreamland.edu.et</a>
              </p>
            </div>
            <div class="footer">
              <p style="color: #6b7280; font-size: 13px; margin: 5px 0;">© ${new Date().getFullYear()} Dreamland College. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const data = await this.resend.emails.send({
        from: `${this.config.fromName} <${this.config.fromAddress}>`,
        to: to,
        subject: '🎓 Welcome to Dreamland College!',
        html: htmlContent,
      });

      console.log(`✅ Welcome email sent to: ${to} (ID: ${data.id})`);
      return { success: true, messageId: data.id };
    } catch (error: any) {
      console.error('❌ Failed to send welcome email:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation(
    to: string,
    userName: string,
    amount: number,
    transactionRef: string
  ): Promise<EmailResponse> {
    if (!this.enabled) {
      console.log(`[EMAIL DISABLED] Payment confirmation for ${to}`);
      return { success: false, error: 'Email service disabled' };
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 40px 30px; text-align: center; }
            .icon { font-size: 64px; margin-bottom: 10px; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
            .content { padding: 40px 30px; }
            .success-box { background: #d1fae5; border: 2px solid #10b981; padding: 25px; margin: 25px 0; border-radius: 8px; text-align: center; }
            .amount { font-size: 36px; font-weight: 800; color: #059669; margin: 15px 0; }
            .details { background: #f9fafb; padding: 20px; margin: 25px 0; border-radius: 8px; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; font-size: 15px; }
            .detail-label { color: #6b7280; font-weight: 500; }
            .detail-value { color: #1f2937; font-weight: 600; }
            .footer { background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="icon">✅</div>
              <h1>Payment Confirmed!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Your payment has been successfully processed</p>
            </div>
            <div class="content">
              <p style="font-size: 18px; font-weight: 600; color: #1f2937;">Dear ${userName},</p>
              
              <div class="success-box">
                <div style="color: #065f46; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Amount Paid</div>
                <div class="amount">${amount.toFixed(2)} ETB</div>
              </div>
              
              <div class="details">
                <div class="detail-row">
                  <span class="detail-label">📋 Transaction Reference:</span>
                  <span class="detail-value">${transactionRef}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">📅 Date:</span>
                  <span class="detail-value">${new Date().toLocaleDateString()}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">✅ Status:</span>
                  <span class="detail-value" style="color: #10b981;">Verified</span>
                </div>
              </div>
              
              <p style="color: #4b5563; line-height: 1.8;">
                Your financial record has been updated. You can view your payment history and account balance 
                by logging into your student portal.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="http://localhost:3000" style="background: #1e40af; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
                  View Your Account
                </a>
              </div>
            </div>
            <div class="footer">
              <p style="color: #6b7280; font-size: 13px; margin: 5px 0;">© ${new Date().getFullYear()} Dreamland College. All rights reserved.</p>
              <p style="color: #9ca3af; font-size: 12px;">Questions? Contact finance@dreamland.edu.et</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const data = await this.resend.emails.send({
        from: `${this.config.fromName} <${this.config.fromAddress}>`,
        to: to,
        subject: '✅ Payment Confirmed - Dreamland College',
        html: htmlContent,
      });

      console.log(`✅ Payment confirmation sent to: ${to} (ID: ${data.id})`);
      return { success: true, messageId: data.id };
    } catch (error: any) {
      console.error('❌ Failed to send payment confirmation:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send generic notification
   */
  async sendNotification(
    to: string,
    subject: string,
    message: string,
    htmlContent?: string
  ): Promise<EmailResponse> {
    if (!this.enabled) {
      console.log(`[EMAIL DISABLED] Notification to ${to}: ${subject}`);
      return { success: false, error: 'Email service disabled' };
    }

    try {
      const data = await this.resend.emails.send({
        from: `${this.config.fromName} <${this.config.fromAddress}>`,
        to: to,
        subject: subject,
        html: htmlContent || message.replace(/\n/g, '<br>'),
      });

      console.log(`✅ Notification sent to: ${to} (ID: ${data.id})`);
      return { success: true, messageId: data.id };
    } catch (error: any) {
      console.error('❌ Failed to send notification:', error.message);
      return { success: false, error: error.message };
    }
  }
}
