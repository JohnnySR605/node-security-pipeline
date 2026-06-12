import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { z, ZodError } from 'zod';
import { createLogger, format, transports } from 'winston';
import 'dotenv-safe/config';

// ─── Logger (Layer 5.6) ────────────────────────────────────────────────────
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});

// ─── App ──────────────────────────────────────────────────────────────────
const app = express();

// ─── Layer 5.1: HTTP Security Headers (Helmet) ────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'same-origin' },
  })
);

// ─── Layer 5.2: Rate Limiting ─────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: Number(process.env['RATE_LIMIT_WINDOW_MS']) || 15 * 60 * 1000,
  max: Number(process.env['RATE_LIMIT_MAX_REQUESTS']) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: _req.ip,
      path: _req.path,
    });
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  },
});

// Stricter limiter for sensitive routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    logger.warn('Auth rate limit exceeded', { ip: _req.ip });
    res.status(429).json({ error: 'Too many attempts, please try again later.' });
  },
});

app.use(globalLimiter);

// ─── HTTP Request Logging (Layer 5.6) ─────────────────────────────────────
app.use(
  morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  })
);

// ─── Body Parsing ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // limit body size
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// ─── Layer 5.3: Input Validation Schemas (Zod) ────────────────────────────
const UserSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must not exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  age: z.number().int().min(0).max(120).optional(),
});

type UserInput = z.infer<typeof UserSchema>;

// ─── Routes ───────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Example route with input validation
app.post('/api/users', authLimiter, (req: Request, res: Response) => {
  const result = UserSchema.safeParse(req.body);

  if (!result.success) {
    logger.warn('Validation failed on /api/users', {
      ip: req.ip,
      errors: result.error.flatten(),
    });
    return res.status(400).json({
      error: 'Invalid input',
      details: result.error.flatten().fieldErrors,
    });
  }

  const user: UserInput = result.data;

  // Audit log: data access event
  logger.info('User created', {
    ip: req.ip,
    username: user.username,
    action: 'CREATE_USER',
  });

  return res.status(201).json({ message: 'User created', username: user.username });
});

// ─── Global Error Handler ─────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, __next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation error', details: err.flatten() });
  }

  logger.error('Unhandled error', { error: err.message, stack: err.stack });

  // Never expose internal error details to clients
  return res.status(500).json({ error: 'Internal server error' });
});

// ─── Start Server ─────────────────────────────────────────────────────────
const PORT = Number(process.env['PORT']) || 3000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, { env: process.env['NODE_ENV'] });
});

export default app;
