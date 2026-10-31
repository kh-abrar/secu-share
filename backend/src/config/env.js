// Single source of runtime configuration. Validated once at startup so a
// misconfigured deployment fails fast with a readable message.
const { z } = require('zod');

const bool = (fallback) =>
  z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => (v === undefined ? fallback : v === 'true' || v === '1'));

const int = (fallback) =>
  z.coerce.number().int().positive().optional().transform((v) => v ?? fallback);

const isProd = (process.env.NODE_ENV || 'development') === 'production';

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: int(4000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

    // Public URL(s) of the web app. The first entry is used to build links in emails;
    // every entry is an allowed CORS origin.
    FRONTEND_URL: z.string().min(1, 'FRONTEND_URL is required'),
    // Optional extra origins, e.g. preview deployments. Must be fully anchored.
    CORS_ORIGIN_PATTERN: z
      .string()
      .optional()
      .refine((s) => !s || (s.startsWith('^https://') && s.endsWith('$')), {
        message: 'CORS_ORIGIN_PATTERN must start with ^https:// and end with $',
      }),

    // Cookies: "lax" when the API is served from the same site as the app (recommended,
    // e.g. behind the bundled nginx proxy); "none" when they live on different sites.
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    COOKIE_SECURE: bool(isProd),
    // Number of reverse proxies in front of the API (for client IPs / secure cookies).
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),

    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    STORAGE_DIR: z.string().default('./data/uploads'),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_ENDPOINT: z.string().url().optional(), // MinIO, Cloudflare R2, etc.
    S3_FORCE_PATH_STYLE: bool(false),

    MAX_FILE_SIZE: int(100 * 1024 * 1024),             // bytes, plaintext
    STORAGE_QUOTA_BYTES: int(10 * 1024 * 1024 * 1024), // per user

    SMTP_HOST: z.string().optional(),
    SMTP_PORT: int(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_SECURE: bool(false),
    MAIL_FROM: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.COOKIE_SAMESITE === 'none' && !env.COOKIE_SECURE) {
      ctx.addIssue({ code: 'custom', path: ['COOKIE_SECURE'], message: 'COOKIE_SAMESITE=none requires COOKIE_SECURE=true' });
    }
    if (env.STORAGE_DRIVER === 's3' && (!env.S3_BUCKET || !env.S3_REGION)) {
      ctx.addIssue({ code: 'custom', path: ['S3_BUCKET'], message: 'S3_BUCKET and S3_REGION are required when STORAGE_DRIVER=s3' });
    }
  });

function loadEnv(source = process.env) {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.') || 'env'}: ${i.message}`);
    throw new Error(`Invalid configuration:\n${lines.join('\n')}`);
  }
  const env = parsed.data;
  const origins = env.FRONTEND_URL.split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  return Object.freeze({
    ...env,
    isProduction: env.NODE_ENV === 'production',
    appUrl: origins[0],
    corsOrigins: origins,
    corsOriginPattern: env.CORS_ORIGIN_PATTERN ? new RegExp(env.CORS_ORIGIN_PATTERN) : null,
    smtpConfigured: Boolean(env.SMTP_HOST && env.MAIL_FROM),
  });
}

module.exports = { loadEnv };
