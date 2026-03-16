import dotenv from 'dotenv';

// Load environment variables immediately if not already loaded
dotenv.config();

/**
 * Environment validation configuration class.
 * Centralizes authentication settings and enforces security standards.
 */
export class AuthConfig {
  private static instance: AuthConfig;
  private readonly _jwtSecret: string;
  private readonly _nodeEnv: string;

  /**
   * Initializes the AuthConfig, validating all security-critical environment variables.
   * @throws Error if validation fails for any reason.
   */
  private constructor() {
    this._nodeEnv = process.env.NODE_ENV || 'development';
    this._jwtSecret = this.validateJwtSecret();
  }

  /**
   * Singleton pattern to ensure configuration is only validated once per lifecycle.
   */
  public static getInstance(): AuthConfig {
    if (!AuthConfig.instance) {
      AuthConfig.instance = new AuthConfig();
    }
    return AuthConfig.instance;
  }

  /**
   * Validates the JWT_SECRET for presence, length, and cryptographic complexity.
   * @returns {string} The validated secret key.
   * @throws {Error} Detailed error message describing the security failure.
   */
  private validateJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    const isProduction = this._nodeEnv === 'production';

    // Requirement: Throw error if NOT set in production
    if (!secret) {
      if (isProduction) {
        throw new Error(
          "[SECURITY VULNERABILITY]: JWT_SECRET environment variable is missing in production. " +
          "Deployment aborted for security reasons. Set a strong secret key in your environment."
        );
      }
      
      console.warn(
        "⚠️  SECURITY WARNING: Using insecure fallback JWT_SECRET for development. " +
        "This is NOT acceptable for production environments."
      );
      return "dreamland-insecure-development-fallback-key-32chars-min";
    }

    // Requirement: Add length check
    // Recommended minimum for HMAC-SHA256 is 32 bytes (256 bits)
    if (secret.length < 32) {
      throw new Error(
        `[INSECURE JWT_SECRET]: The provided JWT_SECRET is too short (${secret.length} characters). ` +
        "It MUST be at least 32 characters long to provide sufficient cryptographic entropy."
      );
    }

    // Requirement: Add complexity checks
    // Check if the secret is just a repeated character or common word
    const uniqueChars = new Set(secret.split('')).size;
    if (uniqueChars < 8) {
      throw new Error(
        "[INSECURE JWT_SECRET]: The provided secret lacks sufficient complexity. " +
        "Ensure it is a high-entropy string with a variety of characters (e.g., openssl rand -base64 32)."
      );
    }

    // Check for common insecure fallbacks explicitly
    const insecureFallbacks = ["dreamland-secret-key", "secret", "password", "1234567890"];
    if (insecureFallbacks.includes(secret.toLowerCase())) {
       throw new Error(
        "[INSECURE JWT_SECRET]: Using a known insecure or default fallback string as your JWT_SECRET is prohibited. " +
        "Please generate a unique, random secret key."
      );
    }

    return secret;
  }

  /**
   * @returns {string} The validated JWT secret key.
   */
  public get jwtSecret(): string {
    return this._jwtSecret;
  }

  /**
   * @returns {string} The current application environment (e.g., 'production', 'development').
   */
  public get nodeEnv(): string {
    return this._nodeEnv;
  }

  /**
   * Helper to check if the current environment is production.
   */
  public isProduction(): boolean {
    return this._nodeEnv === 'production';
  }
}

// Export pre-initialized instance for convenience
export const authConfig = AuthConfig.getInstance();
