/**
 * Security-focused API tests (malicious inputs, authz, uploads, rate limits).
 * Requires `.env.test` and applies the same DB seed as other integration tests.
 *
 * Rate limiters are mocked with stricter auth limits so we can trigger 429 without
 * thousands of requests; global limit stays high so the rest of the suite can run.
 */
jest.mock('../../src/middlewares/rateLimit.middleware', () => {
  const rateLimit = require('express-rate-limit');
  const strictHandler = {
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: {
          message: 'Too many requests. Please wait a moment and try again.',
          retryAfter: Math.ceil(res.getHeader('Retry-After') || 60),
        },
      });
    },
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  };
  return {
    authLimiter: rateLimit({
      windowMs: 60 * 1000,
      max: 6,
      skipSuccessfulRequests: false,
      ...strictHandler,
    }),
    globalApiLimiter: rateLimit({
      windowMs: 60 * 1000,
      max: 20000,
      ...strictHandler,
    }),
    writeOperationLimiter: rateLimit({
      windowMs: 60 * 1000,
      max: 2000,
      ...strictHandler,
    }),
    healthLimiter: rateLimit({
      windowMs: 60 * 1000,
      max: 2000,
      ...strictHandler,
    }),
  };
});

const request = require('supertest');
const {
  IDS,
  EMAILS,
  PASSWORD,
  isIntegrationEnvConfigured,
  ensureSchema,
  resetDatabase,
  seedBase,
} = require('../helpers/integrationDb');
const { MAX_FILE_BYTES } = require('../../src/middlewares/upload.middleware');

const describeSec = isIntegrationEnvConfigured() ? describe : describe.skip;

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

describeSec('Security: API hardening', () => {
  let app;
  let tokens;

  beforeAll(async () => {
    // Other integration files load `app` first with real rate limiters; clear cache so this file's mock applies.
    jest.resetModules();
    const { getTestApp } = require('../helpers/testApp');
    app = getTestApp();
    await ensureSchema();
    await resetDatabase();
    await seedBase();

    async function login(email) {
      const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
      if (res.status !== 200) {
        throw new Error(`Login failed for ${email}: ${res.status}`);
      }
      return res.body.data.token;
    }

    tokens = {
      police: await login(EMAILS.police),
      admin: await login(EMAILS.admin),
      hotelA: await login(EMAILS.hotelA),
      hotelB: await login(EMAILS.hotelB),
    };
  });

  afterAll(async () => {
    await resetDatabase();
  });

  describe('Authentication', () => {
    it('rejects protected route without token', async () => {
      const res = await request(app).get('/api/guests');
      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/Authentication required/i);
    });

    it('rejects invalid Bearer token', async () => {
      const res = await request(app)
        .get('/api/guests')
        .set({ Authorization: 'Bearer not.a.valid.jwt.token' });
      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/Invalid or expired token/i);
    });

    it('rejects malformed Authorization header (no Bearer)', async () => {
      const res = await request(app).get('/api/guests').set({ Authorization: 'Basic xyz' });
      expect(res.status).toBe(401);
    });
  });

  describe('Authorization', () => {
    it('hotel user cannot read guest tied only to another hotel (cross-tenant)', async () => {
      const res = await request(app).get(`/api/guests/${IDS.guest1}`).set(bearer(tokens.hotelB));
      expect(res.status).toBe(404);
    });

    it('police can read guest data (allowed)', async () => {
      const res = await request(app).get(`/api/guests/${IDS.guest1}`).set(bearer(tokens.police));
      expect(res.status).toBe(200);
      expect(res.body.data.guest.id).toBe(IDS.guest1);
    });

    it('hotel user cannot create guest for a hotel they are not assigned to', async () => {
      const res = await request(app)
        .post('/api/guests')
        .set(bearer(tokens.hotelA))
        .send({
          fullName: 'Cross Hotel',
          idNumber: `SEC-${Date.now()}`,
          hotelId: IDS.hotelB,
          checkIn: new Date().toISOString(),
        });
      expect(res.status).toBe(403);
    });

    it('hotel role cannot access police-only report endpoints (e.g. blacklist export)', async () => {
      const res = await request(app).get('/api/reports/blacklist').set(bearer(tokens.hotelA));
      expect(res.status).toBe(403);
    });

    it('police and admin can access reports API', async () => {
      const policeRes = await request(app).get('/api/reports/guests').set(bearer(tokens.police));
      expect(policeRes.status).toBe(200);
      expect(policeRes.body.success).toBe(true);
      const adminRes = await request(app).get('/api/reports/alerts').set(bearer(tokens.admin));
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.success).toBe(true);
    });

    it('hotel role can access guest report only (scoped to assigned hotels)', async () => {
      const res = await request(app).get('/api/reports/guests').set(bearer(tokens.hotelA));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.rows)).toBe(true);
    });
  });

  describe('Malicious / abusive input', () => {
    it('does not execute SQL passed into idNumber (parameterized query; no 500)', async () => {
      const idNumber = `SEC-SQL-${Date.now()}' OR 1=1; DROP TABLE guests; --`;
      const res = await request(app)
        .post('/api/guests')
        .set(bearer(tokens.police))
        .send({
          fullName: 'SQL Test',
          idNumber,
          hotelId: IDS.hotelA,
          checkIn: new Date().toISOString(),
        });
      expect(res.status).not.toBe(500);
      expect([201, 400, 409]).toContain(res.status);

      const health = await request(app).get('/api/health');
      expect(health.status).toBe(200);
    });

    it('accepts XSS-like strings in JSON without server error (stored as data; clients must escape)', async () => {
      const xss = '<script>alert(1)</script><img src=x onerror=alert(1)>';
      const res = await request(app)
        .post('/api/guests')
        .set(bearer(tokens.police))
        .send({
          fullName: xss,
          idNumber: `SEC-XSS-${Date.now()}`,
          hotelId: IDS.hotelA,
          checkIn: new Date().toISOString(),
        });
      expect(res.status).not.toBe(500);
      if (res.status === 201) {
        expect(res.body.data.guest.full_name).toContain('script');
      }
    });
  });

  describe('File upload', () => {
    it('rejects disallowed MIME type', async () => {
      const res = await request(app)
        .post('/api/documents')
        .set(bearer(tokens.police))
        .field('stayId', IDS.stay1)
        .field('title', 'malware')
        .attach('file', Buffer.from('MZ fake exe'), {
          filename: 'evil.exe',
          contentType: 'application/octet-stream',
        });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/Invalid file type|file type/i);
    });

    it('rejects file larger than max (5 MB)', async () => {
      const big = Buffer.alloc(MAX_FILE_BYTES + 1, 0x41);
      const res = await request(app)
        .post('/api/documents')
        .set(bearer(tokens.police))
        .field('stayId', IDS.stay1)
        .field('title', 'big')
        .attach('file', big, {
          filename: 'huge.pdf',
          contentType: 'application/pdf',
        });
      expect(res.status).toBe(413);
      expect(res.body.error.message).toMatch(/5 MB|large/i);
    });
  });

  describe('Rate limiting', () => {
    it('returns 429 after excessive login attempts (auth limiter)', async () => {
      let last;
      for (let i = 0; i < 20; i += 1) {
        last = await request(app)
          .post('/api/auth/login')
          .send({ email: 'attacker@example.com', password: 'wrong' });
        if (last.status === 429) break;
      }
      expect(last.status).toBe(429);
      expect(last.body.error.message).toMatch(/Too many requests/i);
    });
  });
});
