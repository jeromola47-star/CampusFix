process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.JWT_SECRET = 'test-secret';
process.env.ADMIN_EMAIL = 'admin@test.edu';
process.env.ADMIN_PASSWORD = 'Admin@12345';

const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/models');
const { seedBase } = require('../src/seed');

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const validRequest = (title = 'Leaking pipe in Block A') => ({
  title, description: 'Water is leaking from the pipe near the stairs.', location: 'Block A', priority: 'High', categoryId: 3,
});

let adminToken, officerToken, adaToken, bolaToken, officerId, adaId, mainRequestId;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await seedBase();
  const login = await request(app).post('/api/auth/login').send({ email: 'admin@test.edu', password: 'Admin@12345' });
  adminToken = login.body.token;
  const officer = await request(app).post('/api/users').set(auth(adminToken))
    .send({ name: 'Officer Ola', email: 'ola@test.edu', password: 'Passw0rd!', role: 'officer' });
  officerId = officer.body.id;
  officerToken = (await request(app).post('/api/auth/login').send({ email: 'ola@test.edu', password: 'Passw0rd!' })).body.token;
  const bola = await request(app).post('/api/auth/register').send({ name: 'Bola Student', email: 'bola@test.edu', password: 'Passw0rd!' });
  bolaToken = bola.body.token;
});

afterAll(async () => { await sequelize.close(); });

describe('Authentication', () => {
  test('registers a Student/Staff user', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Ada Student', email: 'ada@test.edu', password: 'Passw0rd!', role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('student_staff'); // role in the body is ignored
    adaToken = res.body.token;
    adaId = res.body.user.id;
  });

  test('rejects a weak password and invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'X', email: 'not-an-email', password: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(1);
  });

  test('rejects a duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Ada Again', email: 'ada@test.edu', password: 'Passw0rd!' });
    expect(res.status).toBe(409);
  });

  test('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ada@test.edu', password: 'Passw0rd!' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('rejects a wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ada@test.edu', password: 'WrongPass1' });
    expect(res.status).toBe(401);
  });

  test('blocks a protected route without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('Access control', () => {
  test('student cannot list users', async () => {
    const res = await request(app).get('/api/users').set(auth(adaToken));
    expect(res.status).toBe(403);
  });

  test('officer cannot create a request', async () => {
    const res = await request(app).post('/api/requests').set(auth(officerToken)).send(validRequest());
    expect(res.status).toBe(403);
  });

  test('student cannot assign a request', async () => {
    const res = await request(app).patch('/api/requests/1/assign').set(auth(adaToken)).send({ officerId });
    expect(res.status).toBe(403);
  });

  test("student cannot view another student's request", async () => {
    const created = await request(app).post('/api/requests').set(auth(adaToken)).send(validRequest('Broken chair'));
    expect(created.status).toBe(201);
    const res = await request(app).get(`/api/requests/${created.body.id}`).set(auth(bolaToken));
    expect(res.status).toBe(403);
  });
});

describe('Service requests', () => {
  test('rejects a request with invalid data', async () => {
    const res = await request(app).post('/api/requests').set(auth(adaToken)).send({ title: 'x', priority: 'Urgent' });
    expect(res.status).toBe(400);
  });

  test('submits a valid request as Pending', async () => {
    const res = await request(app).post('/api/requests').set(auth(adaToken)).send(validRequest());
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('Pending');
    mainRequestId = res.body.id;
  });

  test('searches and paginates own requests', async () => {
    const search = await request(app).get('/api/requests?search=Leaking%20pipe').set(auth(adaToken));
    expect(search.status).toBe(200);
    expect(search.body.total).toBe(1);
    expect(search.body.data[0].title).toBe('Leaking pipe in Block A');
    const paged = await request(app).get('/api/requests?limit=1').set(auth(adaToken));
    expect(paged.body.data).toHaveLength(1);
    expect(paged.body.pages).toBe(2);
    const other = await request(app).get('/api/requests').set(auth(bolaToken));
    expect(other.body.total).toBe(0);
  });

  test('admin assigns a request to an officer', async () => {
    const res = await request(app).patch(`/api/requests/${mainRequestId}/assign`).set(auth(adminToken)).send({ officerId });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Assigned');
  });

  test('admin cannot assign to a non-officer', async () => {
    const res = await request(app).patch(`/api/requests/${mainRequestId}/assign`).set(auth(adminToken)).send({ officerId: adaId });
    expect(res.status).toBe(400);
  });

  test('officer sees only the assigned job and sets In Progress', async () => {
    const list = await request(app).get('/api/requests').set(auth(officerToken));
    expect(list.body.total).toBe(1);
    expect(list.body.data[0].id).toBe(mainRequestId);
    const res = await request(app).patch(`/api/requests/${mainRequestId}/status`).set(auth(officerToken)).send({ status: 'In Progress', comment: 'On my way' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('In Progress');
  });

  test('officer cannot set the status to Pending', async () => {
    const res = await request(app).patch(`/api/requests/${mainRequestId}/status`).set(auth(officerToken)).send({ status: 'Pending' });
    expect(res.status).toBe(403);
  });

  test('officer marks the job Completed and four history entries exist', async () => {
    const res = await request(app).patch(`/api/requests/${mainRequestId}/status`).set(auth(officerToken)).send({ status: 'Completed', comment: 'Pipe replaced' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Completed');
    const detail = await request(app).get(`/api/requests/${mainRequestId}`).set(auth(adminToken));
    expect(detail.body.logs).toHaveLength(4);
  });

  test('returns 404 for a request that does not exist', async () => {
    const res = await request(app).get('/api/requests/99999').set(auth(adminToken));
    expect(res.status).toBe(404);
  });
});

describe('Notifications, reports and documentation', () => {
  test('requester has at least two unread notifications', async () => {
    const res = await request(app).get('/api/notifications').set(auth(adaToken));
    expect(res.status).toBe(200);
    expect(res.body.unread).toBeGreaterThanOrEqual(2);
  });

  test('admin gets summary, CSV export and audit log', async () => {
    const summary = await request(app).get('/api/reports/summary').set(auth(adminToken));
    expect(summary.status).toBe(200);
    expect(summary.body.total).toBeGreaterThanOrEqual(2);
    expect(summary.body.byStatus.Completed).toBe(1);
    const csv = await request(app).get('/api/reports/export.csv').set(auth(adminToken));
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text).toContain('Leaking pipe in Block A');
    const log = await request(app).get('/api/reports/audit').set(auth(adminToken));
    expect(log.status).toBe(200);
    expect(log.body.total).toBeGreaterThan(0);
  });

  test('serves the Swagger documentation', async () => {
    const res = await request(app).get('/api/docs/');
    expect(res.status).toBe(200);
  });
});
