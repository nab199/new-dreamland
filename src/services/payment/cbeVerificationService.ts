interface CBEVerificationResult {
  success: boolean;
  verified: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

export class CBEVerificationService {
  async verifyReference(reference: string): Promise<CBEVerificationResult> {
    if (!reference) {
      return { success: false, verified: false, message: 'Reference is required' };
    }

    return {
      success: true,
      verified: false,
      message: 'CBE verification service is not configured',
      data: { reference },
    };
  }

  async verifyReceipt(receiptUrl: string): Promise<CBEVerificationResult> {
    if (!receiptUrl) {
      return { success: false, verified: false, message: 'Receipt URL is required' };
    }

    return {
      success: true,
      verified: false,
      message: 'CBE receipt verification service is not configured',
      data: { receiptUrl },
    };
  }
}
