/**
 * Tests for the app-level routes in src/app.js (everything outside /tasks).
 */
const request = require('supertest');
const app = require('../src/app');

describe('GET /', () => {
  test('describes the API and lists its endpoints', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Task Manager API');
    expect(res.body.endpoints).toContain('PATCH /tasks/:id/assign');
  });
});

describe('GET /health', () => {
  test('reports that the service is up', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('unknown routes', () => {
  test('return a JSON 404 instead of an HTML page', async () => {
    const res = await request(app).get('/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  test('include unsupported methods on existing paths', async () => {
    const res = await request(app).post('/tasks/stats');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });
});
