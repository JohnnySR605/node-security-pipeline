"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const morgan_1 = __importDefault(require("morgan"));
const zod_1 = require("zod");
const winston_1 = require("winston");
require("dotenv-safe/config");
// ─── Logger (Layer 5.6) ────────────────────────────────────────────────────
const logger = (0, winston_1.createLogger)({
    level: 'info',
    format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.errors({ stack: true }), winston_1.format.json()),
    transports: [
        new winston_1.transports.Console(),
        new winston_1.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston_1.transports.File({ filename: 'logs/combined.log' }),
    ],
});
// ─── App ──────────────────────────────────────────────────────────────────
const app = (0, express_1.default)();
// ─── Layer 5.1: HTTP Security Headers (Helmet) ────────────────────────────
app.use((0, helmet_1.default)({
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
}));
// ─── Layer 5.2: Rate Limiting ─────────────────────────────────────────────
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: Number(process.env['RATE_LIMIT_WINDOW_MS']) || 15 * 60 * 1000,
    max: Number(process.env['RATE_LIMIT_MAX_REQUESTS']) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
        logger.warn('Rate limit exceeded', {
            ip: _req.ip,
            path: _req.path,
        });
        res.status(429).json({ error: 'Too many requests, please try again later.' });
    },
});
// Stricter limiter for sensitive routes
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
        logger.warn('Auth rate limit exceeded', { ip: _req.ip });
        res.status(429).json({ error: 'Too many attempts, please try again later.' });
    },
});
app.use(globalLimiter);
// ─── HTTP Request Logging (Layer 5.6) ─────────────────────────────────────
app.use((0, morgan_1.default)('combined', {
    stream: {
        write: (message) => logger.info(message.trim()),
    },
}));
// ─── Body Parsing ─────────────────────────────────────────────────────────
app.use(express_1.default.json({ limit: '10kb' })); // limit body size
app.use(express_1.default.urlencoded({ extended: false, limit: '10kb' }));
// ─── Layer 5.3: Input Validation Schemas (Zod) ────────────────────────────
const UserSchema = zod_1.z.object({
    username: zod_1.z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username must not exceed 30 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores'),
    email: zod_1.z.string().email('Invalid email address'),
    age: zod_1.z.number().int().min(0).max(120).optional(),
});
// ─── Routes ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
// Example route with input validation
app.post('/api/users', authLimiter, (req, res) => {
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
    const user = result.data;
    // Audit log: data access event
    logger.info('User created', {
        ip: req.ip,
        username: user.username,
        action: 'CREATE_USER',
    });
    return res.status(201).json({ message: 'User created', username: user.username });
});
// ─── Global Error Handler ─────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    if (err instanceof zod_1.ZodError) {
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
exports.default = app;
