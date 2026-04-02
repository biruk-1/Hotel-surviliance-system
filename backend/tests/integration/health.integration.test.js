const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { getTestApp } = require('../helpers/testApp');

const envTestPath = path.resolve(__dirname, '../../.env.test');
const describeIntegration = fs.existsSync(envTestPath) ? describe : describe.skip;

describeIntegration('GET /api/health', () => {
  it('returns 200 and ok payload when the test database is reachable', async () => {
    const app = getTestApp();
    const res = await request(app).get('/api/health').expect(200);

    expect(res.body).toMatchObject({
      success: true,
      data: {
        status: 'ok',
        database: 'connected',
      },
    });
    expect(res.body.data).toHaveProperty('timestamp');
    expect(res.body.data).toHaveProperty('uptime');
  });
});
