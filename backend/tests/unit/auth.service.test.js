/**
 * Auth service: password hashing and JWT sign/verify.
 * Config is mocked so tests do not depend on `.env.test`.
 */
jest.mock('../../src/config', () => ({
  auth: {
    jwtSecret: 'unit_test_jwt_secret_must_be_long_enough_32',
    jwtExpiresIn: '1h',
  },
}));

const jwt = require('jsonwebtoken');
const {
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
  BCRYPT_ROUNDS,
} = require('../../src/modules/auth/auth.service');

describe('auth.service', () => {
  describe('hashPassword / comparePassword', () => {
    it('hashes with bcrypt and comparePassword returns true for correct password', async () => {
      const hash = await hashPassword('ValidPass1');
      expect(hash).not.toBe('ValidPass1');
      expect(hash.startsWith('$2')).toBe(true);
      await expect(comparePassword('ValidPass1', hash)).resolves.toBe(true);
    });

    it('comparePassword returns false for wrong password', async () => {
      const hash = await hashPassword('CorrectHorse1');
      await expect(comparePassword('WrongPass1', hash)).resolves.toBe(false);
    });

    it('uses configured bcrypt cost (rounds)', async () => {
      const hash = await hashPassword('AnyPass123');
      const parts = hash.split('$');
      expect(parts[1]).toBe('2b');
      expect(parseInt(parts[2], 10)).toBe(BCRYPT_ROUNDS);
    });
  });

  describe('signToken / verifyToken', () => {
    const user = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      role: 'hotel',
    };

    it('verifyToken returns payload fields set by signToken', () => {
      const token = signToken(user);
      const payload = verifyToken(token);
      expect(payload.sub).toBe(user.id);
      expect(payload.email).toBe(user.email);
      expect(payload.role).toBe(user.role);
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
    });

    it('verifyToken rejects tampered token', () => {
      const token = signToken(user);
      const tampered = token.slice(0, -4) + 'xxxx';
      expect(() => verifyToken(tampered)).toThrow();
    });

    it('verifyToken rejects token signed with another secret', () => {
      const other = jwt.sign({ sub: user.id }, 'different_secret_key_for_jwt_tests_xxx', {
        expiresIn: '1h',
      });
      expect(() => verifyToken(other)).toThrow();
    });

    it('verifyToken rejects expired token', () => {
      const expired = jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        require('../../src/config').auth.jwtSecret,
        { expiresIn: '-1s' }
      );
      expect(() => verifyToken(expired)).toThrow();
    });
  });
});
