import { GoogleGenAI } from "@google/genai";

/**
 * Strict verification result - success can ONLY be true when
 * the CBE API explicitly returns a verified transaction.
 * No AI interpretation or test bypasses are allowed.
 */
export interface CBEVerificationResult {
  success: boolean;
  amount?: number;
  date?: string;
  payerName?: string;
  transactionType?: string;
  reference?: string;
  extractedText?: string;
  error?: string;
  verificationSource: 'api' | 'none' | 'error';
}

export interface OCRReceiptData {
  reference?: string;
  amount?: number;
  date?: string;
  accountNumber?: string;
  payerName?: string;
}

/**
 * Strict error logging interface for verification failures
 */
interface VerificationErrorLog {
  timestamp: string;
  reference: string;
  error: string;
  source: 'api' | 'ocr' | 'validation';
  details?: Record<string, unknown>;
}

export class CBEVerificationService {
  private verifierUrl: string;
  private apiKey: string;
  private ai: GoogleGenAI | null = null;

  constructor(verifierUrl?: string, apiKey?: string) {
    this.verifierUrl = verifierUrl || process.env.CBE_VERIFIER_URL || '';
    this.apiKey = apiKey || process.env.CBE_VERIFIER_API_KEY || '';

    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
  }

  /**
   * Log verification errors with full context for audit purposes
   */
  private logVerificationError(log: VerificationErrorLog): void {
    console.error('[CBE VERIFICATION ERROR]', JSON.stringify(log, null, 2));
  }

  /**
   * Verify CBE payment by reference number and last 8 digits
   * STRICT: Only returns success=true when CBE API explicitly verifies the transaction.
   * NO test bypasses, NO AI interpretations for verification decision.
   */
  async verify(reference: string, last8Digits: string): Promise<CBEVerificationResult> {
    // Strict input validation
    if (!reference || typeof reference !== 'string') {
      this.logVerificationError({
        timestamp: new Date().toISOString(),
        reference: reference || 'MISSING',
        error: 'Reference number is required and must be a string',
        source: 'validation'
      });
      return {
        success: false,
        error: 'Reference number is required',
        verificationSource: 'error'
      };
    }

    if (!last8Digits || typeof last8Digits !== 'string' || last8Digits.length !== 8) {
      this.logVerificationError({
        timestamp: new Date().toISOString(),
        reference,
        error: 'Last 8 digits must be exactly 8 characters',
        source: 'validation',
        details: { providedLength: last8Digits?.length }
      });
      return {
        success: false,
        error: 'Last 8 digits of account number are required (exactly 8 characters)',
        verificationSource: 'error'
      };
    }

    // Validate reference format
    const validation = this.validateReference(reference);
    if (!validation.valid) {
      this.logVerificationError({
        timestamp: new Date().toISOString(),
        reference,
        error: validation.error || 'Invalid reference format',
        source: 'validation'
      });
      return {
        success: false,
        error: validation.error,
        verificationSource: 'error'
      };
    }

    // Check API configuration
    if (!this.verifierUrl || this.verifierUrl === 'http://localhost:5001' || this.verifierUrl === '') {
      this.logVerificationError({
        timestamp: new Date().toISOString(),
        reference,
        error: 'CBE Verifier URL not configured',
        source: 'api',
        details: { verifierUrl: this.verifierUrl || 'NOT_SET' }
      });
      return {
        success: false,
        error: 'CBE verification service is not configured. Please contact the administrator.',
        verificationSource: 'error'
      };
    }

    // Call CBE API for verification
    try {
      const response = await fetch(`${this.verifierUrl}/api/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey || ''
        },
        body: JSON.stringify({ reference, last8Digits })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Verification failed' }));
        this.logVerificationError({
          timestamp: new Date().toISOString(),
          reference,
          error: errorData.error || `HTTP ${response.status}`,
          source: 'api',
          details: { statusCode: response.status }
        });
        return {
          success: false,
          error: errorData.error || `Verification service returned HTTP ${response.status}`,
          verificationSource: 'error'
        };
      }

      const result = await response.json();

      // STRICT: Only consider verified if API explicitly returns verified: true
      if (result.verified === true) {
        // Validate required fields from verified response
        if (typeof result.amount !== 'number' || result.amount <= 0) {
          this.logVerificationError({
            timestamp: new Date().toISOString(),
            reference,
            error: 'API returned verified=true but amount is invalid',
            source: 'api',
            details: { amount: result.amount }
          });
          return {
            success: false,
            error: 'Verification response incomplete: invalid amount',
            verificationSource: 'error'
          };
        }

        return {
          success: true,
          amount: result.amount,
          date: result.date,
          payerName: result.payerName,
          transactionType: result.paymentMethod,
          reference,
          verificationSource: 'api'
        };
      } else {
        // API returned verified: false or missing verified field
        this.logVerificationError({
          timestamp: new Date().toISOString(),
          reference,
          error: result.error || 'Transaction not verified by CBE',
          source: 'api',
          details: { verified: result.verified }
        });
        return {
          success: false,
          error: result.error || 'Transaction reference could not be verified',
          verificationSource: 'none'
        };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logVerificationError({
        timestamp: new Date().toISOString(),
        reference,
        error: errorMessage,
        source: 'api',
        details: { errorType: error?.constructor?.name }
      });
      return {
        success: false,
        error: `Verification service unavailable: ${errorMessage}`,
        verificationSource: 'error'
      };
    }
  }

  /**
   * Extract payment information from receipt image using AI OCR
   * NOTE: This is for data extraction ONLY, not for verification decision.
   * The extracted data must still be verified via verify() method.
   */
  async extractFromImage(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<OCRReceiptData> {
    if (!this.ai) {
      throw new Error('AI service not configured. GEMINI_API_KEY is required for OCR.');
    }

    const prompt = `
      Extract payment information from this CBE (Commercial Bank of Ethiopia) receipt.
      Return ONLY valid JSON with these fields:
      {
        "reference": "Transaction reference number (e.g., FT12345678)",
        "amount": numeric amount in ETB (e.g., 5000.00),
        "date": "Transaction date in ISO format",
        "accountNumber": "Account number shown on receipt",
        "payerName": "Name of person who made the payment"
      }

      If you cannot read certain fields, use null.
      Only return the JSON, no other text.
    `;

    try {
      const result = await this.ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: [{
          text: prompt
        }, {
          inlineData: {
            mimeType,
            data: imageBase64
          }
        }]
      });

      const responseText = result.text || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Validate extracted data types
        return {
          reference: typeof parsed.reference === 'string' ? parsed.reference : undefined,
          amount: typeof parsed.amount === 'number' ? parsed.amount : undefined,
          date: typeof parsed.date === 'string' ? parsed.date : undefined,
          accountNumber: typeof parsed.accountNumber === 'string' ? parsed.accountNumber : undefined,
          payerName: typeof parsed.payerName === 'string' ? parsed.payerName : undefined,
        };
      }

      return {};
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown OCR error';
      this.logVerificationError({
        timestamp: new Date().toISOString(),
        reference: 'OCR_EXTRACTION',
        error: errorMessage,
        source: 'ocr'
      });
      throw new Error(`Failed to extract data from receipt: ${errorMessage}`);
    }
  }

  /**
   * Verify payment using uploaded receipt image
   * STRICT: This uses OCR for data extraction, but the extracted reference
   * must still be verified against CBE API if last8Digits is provided.
   * Returns success=false if no API verification is performed.
   */
  async verifyFromReceipt(
    imageBase64: string,
    expectedAmount?: number,
    studentName?: string,
    last8Digits?: string
  ): Promise<CBEVerificationResult> {
    try {
      const extractedData = await this.extractFromImage(imageBase64);

      // Log extraction for audit
      console.log('[CBE OCR] Extracted data:', JSON.stringify(extractedData));

      if (!extractedData.reference && !extractedData.amount) {
        this.logVerificationError({
          timestamp: new Date().toISOString(),
          reference: 'OCR_FAILED',
          error: 'Could not read reference or amount from receipt',
          source: 'ocr'
        });
        return {
          success: false,
          error: 'Could not read payment details from receipt. Please ensure the image is clear and try again.',
          verificationSource: 'error'
        };
      }

      // If last8Digits provided, do API verification
      if (last8Digits && extractedData.reference) {
        return await this.verify(extractedData.reference, last8Digits);
      }

      // Without API verification, we cannot mark as success
      // OCR alone is NOT sufficient for verification
      const issues: string[] = [];

      if (expectedAmount && extractedData.amount) {
        const amountMatch = Math.abs(extractedData.amount - expectedAmount) < 1;
        if (!amountMatch) {
          issues.push(`Amount mismatch: Expected ${expectedAmount} ETB, found ${extractedData.amount} ETB`);
        }
      }

      this.logVerificationError({
        timestamp: new Date().toISOString(),
        reference: extractedData.reference || 'UNKNOWN',
        error: 'Receipt extracted but not verified via CBE API. OCR alone is insufficient.',
        source: 'validation',
        details: {
          extractedReference: extractedData.reference,
          extractedAmount: extractedData.amount,
          issues
        }
      });

      return {
        success: false,
        error: 'Receipt data extracted but requires CBE API verification. Please provide the last 8 digits of your account number for verification.',
        amount: extractedData.amount,
        date: extractedData.date,
        reference: extractedData.reference,
        payerName: extractedData.payerName,
        verificationSource: 'none'
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown receipt verification error';
      this.logVerificationError({
        timestamp: new Date().toISOString(),
        reference: 'RECEIPT_VERIFICATION',
        error: errorMessage,
        source: 'ocr'
      });
      return {
        success: false,
        error: errorMessage,
        verificationSource: 'error'
      };
    }
  }

  /**
   * Validate CBE reference format
   */
  validateReference(reference: string): { valid: boolean; error?: string } {
    if (!reference || typeof reference !== 'string') {
      return {
        valid: false,
        error: 'Reference is required'
      };
    }

    const referenceRegex = /^[A-Z]{2}\d{8,}$/i;

    if (!referenceRegex.test(reference)) {
      return {
        valid: false,
        error: 'Invalid reference format. Expected format: FT12345678 (2 letters followed by 8+ digits)'
      };
    }

    return { valid: true };
  }
}
