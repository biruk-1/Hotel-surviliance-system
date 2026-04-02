/**
 * Auth validation rules + validateRequest middleware (no database).
 */
const express = require('express');
const request = require('supertest');
const { registerRules, loginRules } = require('../../src/modules/auth/auth.validation');
const validateRequest = require('../../src/middlewares/validate.middleware');

function appPost(path, rules) {
  const app = express();
  app.use(express.json());
  app.post(path, rules, validateRequest, (req, res) => res.status(200).json({ success: true }));
  return app;
}

describe('auth.validation + validateRequest', () => {
  describe('registerRules', () => {
    const app = appPost('/register', registerRules);

    it('rejects missing required fields', async () => {
      const res = await request(app).post('/register').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Validation failed');
      const fields = res.body.error.details.map((d) => d.path);
      expect(fields).toEqual(expect.arrayContaining(['email', 'password', 'fullName', 'role']));
    });

    it('rejects invalid email format', async () => {
      const res = await request(app)
        .post('/register')
        .send({
          email: 'not-an-email',
          password: 'ValidPass1',
          fullName: 'Valid Name',
          role: 'hotel',
        });
      expect(res.status).toBe(400);
      const emailErr = res.body.error.details.find((d) => d.path === 'email');
      expect(emailErr).toBeDefined();
    });

    it('rejects password missing uppercase, lowercase, or digit', async () => {
      const res = await request(app)
        .post('/register')
        .send({
          email: 'a@b.com',
          password: 'alllowercase1',
          fullName: 'Valid Name',
          role: 'hotel',
        });
      expect(res.status).toBe(400);
    });

    it('rejects invalid role', async () => {
      const res = await request(app)
        .post('/register')
        .send({
          email: 'a@b.com',
          password: 'ValidPass1',
          fullName: 'Valid Name',
          role: 'superuser',
        });
      expect(res.status).toBe(400);
      const roleErr = res.body.error.details.find((d) => d.path === 'role');
      expect(roleErr).toBeDefined();
    });

    it('rejects control characters in fullName', async () => {
      const res = await request(app)
        .post('/register')
        .send({
          email: 'a@b.com',
          password: 'ValidPass1',
          fullName: 'Bad\x00Name',
          role: 'hotel',
        });
      expect(res.status).toBe(400);
    });

    it('accepts valid payload', async () => {
      const res = await request(app)
        .post('/register')
        .send({
          email: 'new.user@example.com',
          password: 'ValidPass1',
          fullName: 'Valid Name',
          role: 'hotel',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('loginRules', () => {
    const app = appPost('/login', loginRules);

    it('rejects missing email', async () => {
      const res = await request(app).post('/login').send({ password: 'any' });
      expect(res.status).toBe(400);
    });

    it('rejects empty password', async () => {
      const res = await request(app).post('/login').send({ email: 'a@b.com', password: '' });
      expect(res.status).toBe(400);
    });

    it('accepts valid login body', async () => {
      const res = await request(app).post('/login').send({
        email: 'a@b.com',
        password: 'secret',
      });
      expect(res.status).toBe(200);
    });
  });
});
