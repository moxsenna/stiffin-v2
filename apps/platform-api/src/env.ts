export interface Env {
  HYPERDRIVE?: {
    connectionString: string;
  };
  CLASS_ASSETS?: R2Bucket;
  /** Better Auth secret — Worker secret binding. Never committed. */
  BETTER_AUTH_SECRET?: string;
  /** Public base URL of the platform-api Worker. */
  BETTER_AUTH_URL?: string;
  /** Comma-separated additional trusted frontend origins. */
  BETTER_AUTH_TRUSTED_ORIGINS?: string;
  R2_PUBLIC_BASE_URL?: string;
  MAX_COVER_BYTES?: string;
  ALLOWED_COVER_MIME?: string;
}
