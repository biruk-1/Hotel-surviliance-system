/**
 * Full API integration tests against the test database (.env.test).
 * Seeds data in beforeAll and truncates all tables in afterAll.
 */
const request = require('supertest');
const { getTestApp } = require('../helpers/testApp');
const {
  IDS,
  EMAILS,
  PASSWORD,
  isIntegrationEnvConfigured,
  ensureSchema,
  resetDatabase,
  seedBase,
} = require('../helpers/integrationDb');

const describeApi = isIntegrationEnvConfigured() ? describe : describe.skip;

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

describeApi('API integration (auth, guests, stays, alerts, blacklist)', () => {
  let app;
  let tokens;

  beforeAll(async () => {
    app = getTestApp();
    await ensureSchema();
    await resetDatabase();
    await seedBase();

    async function login(email) {
      const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
      if (res.status !== 200) {
        throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
      }
      return res.body.data.token;
    }

    tokens = {
      admin: await login(EMAILS.admin),
      police: await login(EMAILS.police),
      hotelA: await login(EMAILS.hotelA),
      hotelB: await login(EMAILS.hotelB),
    };
  });

  afterAll(async () => {
    await resetDatabase();
  });

  describe('Auth', () => {
    it('POST /api/auth/register succeeds with valid payload', async () => {
      const email = `register-${Date.now()}@api-integration.test`;
      const res = await request(app).post('/api/auth/register').send({
        email,
        password: 'ValidPass1',
        fullName: 'Registered User',
        role: 'hotel',
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(email);
    });

    it('POST /api/auth/register returns 409 for duplicate email', async () => {
      const email = `dup-${Date.now()}@api-integration.test`;
      const first = await request(app).post('/api/auth/register').send({
        email,
        password: 'ValidPass1',
        fullName: 'First',
        role: 'hotel',
      });
      expect(first.status).toBe(201);
      const second = await request(app).post('/api/auth/register').send({
        email,
        password: 'ValidPass1',
        fullName: 'Second',
        role: 'hotel',
      });
      expect(second.status).toBe(409);
      expect(second.body.error.message).toMatch(/already registered/i);
    });

    it('POST /api/auth/register returns 400 for invalid input', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'not-email',
        password: 'ValidPass1',
        fullName: 'Name',
        role: 'hotel',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Validation failed');
    });

    it('POST /api/auth/login succeeds and returns a token', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: EMAILS.police,
        password: PASSWORD,
      });
      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
    });

    it('POST /api/auth/login returns 401 for wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: EMAILS.police,
        password: 'WrongPass999',
      });
      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/Invalid email or password/i);
    });
  });

  describe('Guests', () => {
    it('GET /api/guests returns 401 without token', async () => {
      const res = await request(app).get('/api/guests');
      expect(res.status).toBe(401);
    });

    it('GET /api/guests returns 200 with pagination for police', async () => {
      const res = await request(app).get('/api/guests?page=1&limit=10').set(bearer(tokens.police));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.guests)).toBe(true);
      expect(res.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
      });
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/guests supports limit for pagination', async () => {
      const res = await request(app).get('/api/guests?limit=1').set(bearer(tokens.police));
      expect(res.status).toBe(200);
      expect(res.body.data.guests.length).toBeLessThanOrEqual(1);
    });

    it('GET /api/guests/:id returns seeded guest for police', async () => {
      const res = await request(app).get(`/api/guests/${IDS.guest1}`).set(bearer(tokens.police));
      expect(res.status).toBe(200);
      expect(res.body.data.guest.id).toBe(IDS.guest1);
      expect(Array.isArray(res.body.data.stays)).toBe(true);
    });

    it('GET /api/guests/:id returns 404 for unknown UUID', async () => {
      const res = await request(app)
        .get('/api/guests/00000000-0000-4000-8000-000000000099')
        .set(bearer(tokens.police));
      expect(res.status).toBe(404);
    });

    it('GET /api/guests/:id returns 400 for invalid id format', async () => {
      const res = await request(app).get('/api/guests/not-a-uuid').set(bearer(tokens.police));
      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Validation failed');
    });

    it('GET /api/guests/:id returns 404 when hotel user cannot access guest (wrong hotel)', async () => {
      const res = await request(app).get(`/api/guests/${IDS.guest1}`).set(bearer(tokens.hotelB));
      expect(res.status).toBe(404);
      expect(res.body.error.message).toMatch(/not found/i);
    });

    it('POST /api/guests creates guest and stay (hotel scope)', async () => {
      const idNumber = `ID-NEW-${Date.now()}`;
      const res = await request(app)
        .post('/api/guests')
        .set(bearer(tokens.hotelA))
        .send({
          fullName: 'New Guest',
          idNumber,
          hotelId: IDS.hotelA,
          checkIn: new Date().toISOString(),
          dateOfBirth: '1992-06-01',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.guest.full_name).toBe('New Guest');
      expect(res.body.data.stay.hotel_id).toBe(IDS.hotelA);
    });

    it('POST /api/guests returns 403 when hotel user targets another hotel', async () => {
      const res = await request(app)
        .post('/api/guests')
        .set(bearer(tokens.hotelA))
        .send({
          fullName: 'Wrong Hotel',
          idNumber: `ID-WH-${Date.now()}`,
          hotelId: IDS.hotelB,
          checkIn: new Date().toISOString(),
        });
      expect(res.status).toBe(403);
    });

    it('POST /api/guests returns 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/guests')
        .set(bearer(tokens.hotelA))
        .send({ hotelId: IDS.hotelA });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Validation failed');
    });

    it('POST /api/guests returns 404 when hotelId does not exist', async () => {
      const res = await request(app)
        .post('/api/guests')
        .set(bearer(tokens.police))
        .send({
          fullName: 'Orphan Guest',
          idNumber: `ID-O-${Date.now()}`,
          hotelId: '33333333-3333-4333-8333-333333333333',
          checkIn: new Date().toISOString(),
        });
      expect(res.status).toBe(404);
    });
  });

  describe('Stays', () => {
    it('POST /api/stays returns 401 without token', async () => {
      const res = await request(app).post('/api/stays').send({
        guestId: IDS.guest1,
        hotelId: IDS.hotelA,
        checkIn: new Date().toISOString(),
      });
      expect(res.status).toBe(401);
    });

    it('POST /api/stays creates a stay when authorized', async () => {
      const res = await request(app)
        .post('/api/stays')
        .set(bearer(tokens.police))
        .send({
          guestId: IDS.guest1,
          hotelId: IDS.hotelA,
          checkIn: new Date().toISOString(),
          roomNumber: '202',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.stay.guest_id).toBe(IDS.guest1);
    });

    it('POST /api/stays returns 404 when guest does not exist', async () => {
      const res = await request(app)
        .post('/api/stays')
        .set(bearer(tokens.police))
        .send({
          guestId: '00000000-0000-4000-8000-000000000088',
          hotelId: IDS.hotelA,
          checkIn: new Date().toISOString(),
        });
      expect(res.status).toBe(404);
    });

    it('POST /api/stays returns 404 when hotel does not exist', async () => {
      const res = await request(app)
        .post('/api/stays')
        .set(bearer(tokens.police))
        .send({
          guestId: IDS.guest1,
          hotelId: '33333333-3333-4333-8333-333333333333',
          checkIn: new Date().toISOString(),
        });
      expect(res.status).toBe(404);
    });

    it('POST /api/stays returns 403 when hotel user uses a hotel outside their scope', async () => {
      const res = await request(app)
        .post('/api/stays')
        .set(bearer(tokens.hotelB))
        .send({
          guestId: IDS.guest1,
          hotelId: IDS.hotelA,
          checkIn: new Date().toISOString(),
        });
      expect(res.status).toBe(403);
    });

    it('POST /api/stays returns 400 for invalid body', async () => {
      const res = await request(app).post('/api/stays').set(bearer(tokens.police)).send({
        guestId: 'nope',
        hotelId: IDS.hotelA,
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Alerts', () => {
    it('GET /api/alerts returns 401 without token', async () => {
      const res = await request(app).get('/api/alerts');
      expect(res.status).toBe(401);
    });

    it('GET /api/alerts lists alerts for police', async () => {
      const res = await request(app).get('/api/alerts').set(bearer(tokens.police));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.alerts)).toBe(true);
      const ids = res.body.data.alerts.map((a) => a.id);
      expect(ids).toContain(IDS.alert1);
    });

    it('PATCH /api/alerts/:id marks alert as reviewed', async () => {
      const res = await request(app)
        .patch(`/api/alerts/${IDS.alert1}`)
        .set(bearer(tokens.hotelA));
      expect(res.status).toBe(200);
      expect(res.body.data.reviewed).toBe(true);
      expect(res.body.data.alert.acknowledged_at).not.toBeNull();
    });

    it('PATCH /api/alerts/:id returns 404 for unknown alert', async () => {
      const res = await request(app)
        .patch('/api/alerts/00000000-0000-4000-8000-000000000077')
        .set(bearer(tokens.police));
      expect(res.status).toBe(404);
    });

    it('PATCH /api/alerts/:id returns 403 when hotel user cannot access alert hotel', async () => {
      const res = await request(app)
        .patch(`/api/alerts/${IDS.alert1}`)
        .set(bearer(tokens.hotelB));
      expect(res.status).toBe(403);
    });

    it('PATCH /api/alerts/:id returns 400 for invalid id', async () => {
      const res = await request(app).patch('/api/alerts/bad-id').set(bearer(tokens.police));
      expect(res.status).toBe(400);
    });

    it('GET /api/alerts/unread-count returns unseen total for police', async () => {
      const res = await request(app).get('/api/alerts/unread-count').set(bearer(tokens.police));
      expect(res.status).toBe(200);
      expect(typeof res.body.data.count).toBe('number');
      expect(res.body.data.count).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/alerts/:id/read marks alert seen for current user', async () => {
      const res = await request(app)
        .post(`/api/alerts/${IDS.alert1}/read`)
        .set(bearer(tokens.police));
      expect(res.status).toBe(200);
      expect(res.body.data.seen).toBe(true);
      expect(res.body.data.alert.seen).toBe(true);

      const countRes = await request(app).get('/api/alerts/unread-count').set(bearer(tokens.police));
      expect(countRes.status).toBe(200);
      expect(countRes.body.data.count).toBe(0);
    });

    it('GET /api/alerts includes seen flag on rows', async () => {
      const res = await request(app).get('/api/alerts').set(bearer(tokens.police));
      expect(res.status).toBe(200);
      const row = res.body.data.alerts.find((a) => a.id === IDS.alert1);
      expect(row).toBeDefined();
      expect(row.seen).toBe(true);
    });
  });

  describe('Blacklist', () => {
    it('GET /api/blacklist returns 401 without token', async () => {
      const res = await request(app).get('/api/blacklist');
      expect(res.status).toBe(401);
    });

    it('GET /api/blacklist returns 403 for hotel role (police/admin only)', async () => {
      const res = await request(app).get('/api/blacklist').set(bearer(tokens.hotelA));
      expect(res.status).toBe(403);
    });

    it('GET /api/blacklist returns 200 for police', async () => {
      const res = await request(app).get('/api/blacklist').set(bearer(tokens.police));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.entries)).toBe(true);
    });

    it('POST /api/blacklist returns 403 for hotel user (police only)', async () => {
      const res = await request(app)
        .post('/api/blacklist')
        .set(bearer(tokens.hotelA))
        .send({
          name: 'Blocked',
          idNumber: `BL-H-${Date.now()}`,
          dateOfBirth: '1980-01-01',
        });
      expect(res.status).toBe(403);
    });

    it('POST /api/blacklist creates global entry for police', async () => {
      const idNumber = `BL-OK-${Date.now()}`;
      const res = await request(app)
        .post('/api/blacklist')
        .set(bearer(tokens.police))
        .send({
          name: 'Blocked Person',
          idNumber,
          dateOfBirth: '1985-03-20',
          reason: 'Integration test',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.entry.hotel_id).toBeNull();
    });

    it('POST /api/blacklist returns 400 for invalid input', async () => {
      const res = await request(app)
        .post('/api/blacklist')
        .set(bearer(tokens.police))
        .send({
          name: '',
          idNumber: 'X',
          dateOfBirth: '1985-03-20',
        });
      expect(res.status).toBe(400);
    });

    it('POST /api/blacklist returns 409 for duplicate id number', async () => {
      const idNumber = `BL-DUP-${Date.now()}`;
      const payload = {
        name: 'Dup Test',
        idNumber,
        dateOfBirth: '1991-01-01',
      };
      const first = await request(app).post('/api/blacklist').set(bearer(tokens.police)).send(payload);
      expect(first.status).toBe(201);
      const second = await request(app).post('/api/blacklist').set(bearer(tokens.police)).send(payload);
      expect(second.status).toBe(409);
    });

    it('DELETE /api/blacklist/:id returns 204 for police', async () => {
      const created = await request(app)
        .post('/api/blacklist')
        .set(bearer(tokens.police))
        .send({
          name: 'To Delete',
          idNumber: `BL-DEL-${Date.now()}`,
          dateOfBirth: '1990-06-15',
        });
      expect(created.status).toBe(201);
      const entryId = created.body.data.entry.id;
      const del = await request(app).delete(`/api/blacklist/${entryId}`).set(bearer(tokens.police));
      expect(del.status).toBe(204);
      const again = await request(app).delete(`/api/blacklist/${entryId}`).set(bearer(tokens.police));
      expect(again.status).toBe(404);
    });
  });

  describe('Cross-cutting', () => {
    it('admin token can access guest detail', async () => {
      const res = await request(app).get(`/api/guests/${IDS.guest1}`).set(bearer(tokens.admin));
      expect(res.status).toBe(200);
    });
  });
});
