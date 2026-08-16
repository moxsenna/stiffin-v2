export interface Env {
  HYPERDRIVE?: {
    connectionString: string;
  };
  /** Better Auth secret — Worker secret binding. Never committed. */
  BETTER_AUTH_SECRET?: string;
  /** Public base URL of the platform-api Worker. */
  BETTER_AUTH_URL?: string;
  /** Comma-separated additional trusted frontend origins. */
  BETTER_AUTH_TRUSTED_ORIGINS?: string;
}
