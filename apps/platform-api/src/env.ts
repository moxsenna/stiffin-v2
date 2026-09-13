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

  /** Email provider mode: 'log' (default) or 'mailketing'. */
  EMAIL_MODE?: string;
  /** Mailketing API v2 token — Worker secret binding. Never committed. */
  MAILKETING_API_TOKEN?: string;
  /** Verified sender email, e.g. 'noreply@ralivo.biz.id'. */
  EMAIL_FROM?: string;
  /** Sender display name, e.g. 'Ralivo'. */
  EMAIL_FROM_NAME?: string;
  /** Shared secret for POST /api/admin/entitlements — Worker secret binding. */
  ADMIN_API_KEY?: string;

  /** Cloudflare R2 Bucket for public assets (profile photos, logos, etc.) */
  ASSETS_BUCKET?: R2Bucket;

  /** Inactivity sweep threshold in days (default: 7). */
  INACTIVITY_SWEEP_DAYS?: string;

  /** Paycore Integration Configuration (Cloudflare Worker bindings / env vars) */
  PAYCORE_BASE_URL?: string;
  PAYCORE_APP_UUID?: string;
  PAYCORE_KEY_ID?: string;
  PAYCORE_APP_SECRET?: string;
  PAYCORE_WEBHOOK_SECRET?: string;
}
