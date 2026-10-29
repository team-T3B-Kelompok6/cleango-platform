import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createAccessToken } from '../src/lib/jwt.js';
import { createApp } from '../src/app.js';

vi.mock('../src/model/user.model.js', () => ({
  isTokenRevoked: vi.fn().mockResolvedValue(false),
}));

const services = ['AC Repair', 'Carpentry', 'Electrical Work'];

const staffModel = vi.hoisted(() => ({
  listStaff: vi.fn(),
  findStaff: vi.fn(),
  insertStaff: vi.fn(),
  updateStaffById: vi.fn(),
  deleteStaffById: vi.fn(),
}));
vi.mock('../src/model/staff.model.js', () => staffModel);

const serviceModel = vi.hoisted(() => ({
  findServices: vi.fn(),
}));
vi.mock('../src/model/service.model.js', () => serviceModel);

const app = createApp();
const adminToken = createAccessToken({
  id: 1,
  email: 'admin@cleango.id',
  role: 'admin',
} as never);

const authHeader = { Authorization: `Bearer ${adminToken}` };

function list() {
  return request(app).get('/api/staff').set(authHeader);
}
function get(id: number | string) {
  return request(app).get(`/api/staff/${id}`).set(authHeader);
}
function post(body: unknown) {
  return request(app)
    .post('/api/staff')
    .set(authHeader)
    .send(body as object);
}
function patch(id: number | string, body: unknown) {
  return request(app)
    .patch(`/api/staff/${id}`)
    .set(authHeader)
    .send(body as object);
}
function del(id: number | string) {
  return request(app).delete(`/api/staff/${id}`).set(authHeader);
}

const baseBody = {
  name: 'Sari',
  phone: '081234567890',
  area: 'Pasar Baru',
  status: 'Tersedia',
};

beforeEach(() => {
  staffModel.listStaff.mockReset();
  staffModel.findStaff.mockReset();
  staffModel.insertStaff.mockReset();
  staffModel.updateStaffById.mockReset();
  staffModel.deleteStaffById.mockReset();
  serviceModel.findServices.mockReset();
  serviceModel.findServices.mockResolvedValue(
    services.map((name) => ({ name })),
  );
});

describe('staff controller: authentication + authorization', () => {
  it('rejects anonymous access to the staff list', async () => {
    const res = await request(app).get('/api/staff');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_REQUIRED');
    expect(staffModel.listStaff).not.toHaveBeenCalled();
  });

  it('rejects a revoked session token as SESSION_REVOKED', async () => {
    const { isTokenRevoked } = await import('../src/model/user.model.js');
    isTokenRevoked.mockResolvedValueOnce(true);
    const res = await request(app).get('/api/staff').set(authHeader);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('SESSION_REVOKED');
  });

  it('503s when the revocation check itself fails', async () => {
    const { isTokenRevoked } = await import('../src/model/user.model.js');
    isTokenRevoked.mockRejectedValueOnce(new Error('db down'));
    const res = await request(app).get('/api/staff').set(authHeader);
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('AUTH_UNAVAILABLE');
    expect(JSON.stringify(res.body)).not.toContain('db down');
  });

  it('rejects a non-admin token with FORBIDDEN', async () => {
    const customerToken = createAccessToken({
      id: 5,
      email: 'c@e.com',
      role: 'customer',
    } as never);
    const res = await request(app)
      .get('/api/staff')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });
});

describe('staff controller: GET /api/staff', () => {
  it('returns the staff list', async () => {
    staffModel.listStaff.mockResolvedValue([{ id: '1', name: 'Sari' }]);
    const res = await list();
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: '1', name: 'Sari' }]);
    expect(staffModel.listStaff).toHaveBeenCalled();
  });
});

describe('staff controller: GET /api/staff/:id', () => {
  it('404s for a missing staff', async () => {
    staffModel.findStaff.mockResolvedValue(null);
    const res = await get(999);
    expect(res.status).toBe(404);
    expect(res.body.message).toContain('tidak ditemukan');
    expect(staffModel.findStaff).toHaveBeenCalledWith(999);
  });

  it('400s for a non-numeric id', async () => {
    const res = await get('abc');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('400s for a non-positive id', async () => {
    const res = await get(-3);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});

describe('staff controller: POST /api/staff (create)', () => {
  it('creates a staff member from a minimal valid body when skills are omitted', async () => {
    staffModel.insertStaff.mockResolvedValue({ id: '1', ...baseBody });
    const res = await post(baseBody);
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Petugas berhasil dibuat.');
    const passed = staffModel.insertStaff.mock.calls[0]![0];
    expect(passed).toMatchObject({
      name: 'Sari',
      phone: '081234567890',
      area: 'Pasar Baru',
      status: 'Tersedia',
    });
    expect(passed.skills).toEqual([]);
    expect(passed.photoUrl).toBeNull();
  });

  it('accepts a training staff form without area, photo or skills', async () => {
    staffModel.insertStaff.mockResolvedValue({ id: '1' });
    const res = await post({
      name: 'Petugas Training',
      phone: '081234567890',
      status: 'Masa Training',
    });
    expect(res.status).toBe(201);
    expect(staffModel.insertStaff).toHaveBeenCalledWith({
      name: 'Petugas Training',
      phone: '081234567890',
      area: 'Malang',
      status: 'Masa Training',
      photoUrl: null,
      skills: [],
    });
  });

  it('accepts an explicit empty skills array', async () => {
    staffModel.insertStaff.mockResolvedValue({ id: '1', ...baseBody });
    const res = await post({ ...baseBody, skills: [] });
    expect(res.status).toBe(201);
    expect(staffModel.insertStaff.mock.calls[0]![0].skills).toEqual([]);
  });

  it('passes through valid skills after verifying them against active services', async () => {
    staffModel.insertStaff.mockResolvedValue({ id: '1', ...baseBody });
    const res = await post({ ...baseBody, skills: ['AC Repair', 'Carpentry'] });
    expect(res.status).toBe(201);
    expect(serviceModel.findServices).toHaveBeenCalledWith({
      search: null,
      categoryId: null,
      activeOnly: true,
    });
    expect(staffModel.insertStaff.mock.calls[0]![0].skills).toEqual([
      'AC Repair',
      'Carpentry',
    ]);
  });

  it('dedupes and trims skills before they reach the model', async () => {
    staffModel.insertStaff.mockResolvedValue({ id: '1', ...baseBody });
    const res = await post({
      ...baseBody,
      skills: ['  AC Repair  ', 'AC Repair', '', 'Carpentry'],
    });
    expect(res.status).toBe(201);
    expect(staffModel.insertStaff.mock.calls[0]![0].skills).toEqual([
      'AC Repair',
      'Carpentry',
    ]);
  });

  it('rejects more than MAX_SKILLS entries before hitting the model', async () => {
    const tooMany = Array.from({ length: 21 }, (_, i) => `Skill-${i}`);
    const res = await post({ ...baseBody, skills: tooMany });
    expect(res.status).toBe(400);
    expect(res.body.errors.skills).toBeDefined();
    expect(staffModel.insertStaff).not.toHaveBeenCalled();
  });

  it('rejects a skill longer than 150 characters', async () => {
    const res = await post({ ...baseBody, skills: ['X'.repeat(151)] });
    expect(res.status).toBe(400);
    expect(res.body.errors.skills).toBeDefined();
  });

  it('rejects a skill that is not an active service name', async () => {
    const res = await post({ ...baseBody, skills: ['Ghost Service'] });
    expect(res.status).toBe(400);
    expect(res.body.errors.skills).toBeDefined();
    expect(res.body.errors.skills).toContain('berubah');
    expect(staffModel.insertStaff).not.toHaveBeenCalled();
  });

  it('rejects a non-array skills value', async () => {
    const res = await post({ ...baseBody, skills: 'AC Repair' });
    expect(res.status).toBe(400);
    expect(res.body.errors.skills).toBeDefined();
  });

  it('rejects an array containing a non-string entry', async () => {
    const res = await post({ ...baseBody, skills: ['AC Repair', 42] });
    expect(res.status).toBe(400);
    expect(res.body.errors.skills).toBeDefined();
  });

  it('rejects a missing name', async () => {
    const res = await post({ ...baseBody, name: undefined });
    expect(res.status).toBe(400);
    expect(res.body.errors.name).toBeDefined();
  });

  it('rejects an overlong name', async () => {
    const res = await post({ ...baseBody, name: 'X'.repeat(121) });
    expect(res.status).toBe(400);
    expect(res.body.errors.name).toBeDefined();
  });
});

describe('staff controller: POST /api/staff photoUrl handling', () => {
  beforeEach(() => {
    staffModel.insertStaff.mockResolvedValue({ id: '1', ...baseBody });
  });

  it('stores a null photoUrl when omitted', async () => {
    await post(baseBody);
    expect(staffModel.insertStaff.mock.calls[0]![0].photoUrl).toBeNull();
  });

  it('stores a null photoUrl when explicitly null', async () => {
    await post({ ...baseBody, photoUrl: null });
    expect(staffModel.insertStaff.mock.calls[0]![0].photoUrl).toBeNull();
  });

  it('stores a null photoUrl when blank string is sent', async () => {
    await post({ ...baseBody, photoUrl: '' });
    expect(staffModel.insertStaff.mock.calls[0]![0].photoUrl).toBeNull();
  });

  it('rejects whitespace-only photoUrl (BUG: inconsistent with empty string)', async () => {
    const res = await post({ ...baseBody, photoUrl: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.errors.photoUrl).toBeDefined();
    expect(staffModel.insertStaff).not.toHaveBeenCalled();
  });

  it('stores a local path photoUrl', async () => {
    await post({ ...baseBody, photoUrl: '/uploads/foto.png' });
    expect(staffModel.insertStaff.mock.calls[0]![0].photoUrl).toBe(
      '/uploads/foto.png',
    );
  });

  it('stores an https photoUrl', async () => {
    const url = 'https://cdn.example.com/a.png';
    await post({ ...baseBody, photoUrl: url });
    expect(staffModel.insertStaff.mock.calls[0]![0].photoUrl).toBe(url);
  });

  it('rejects a javascript: url (XSS) before reaching the model', async () => {
    const res = await post({ ...baseBody, photoUrl: 'javascript:alert(1)' });
    expect(res.status).toBe(400);
    expect(res.body.errors.photoUrl).toBeDefined();
    expect(staffModel.insertStaff).not.toHaveBeenCalled();
  });

  it('rejects a protocol-relative url', async () => {
    const res = await post({ ...baseBody, photoUrl: '//evil.example/x.png' });
    expect(res.status).toBe(400);
    expect(res.body.errors.photoUrl).toBeDefined();
    expect(staffModel.insertStaff).not.toHaveBeenCalled();
  });

  it('accepts local paths including ../ traversal segments (BUG: no traversal guard)', async () => {
    const res = await post({
      ...baseBody,
      photoUrl: '/etc/../secret/../../passwords.txt',
    });
    expect(res.status).toBe(201);
    expect(staffModel.insertStaff).toHaveBeenCalled();
    expect(staffModel.insertStaff.mock.calls[0]![0].photoUrl).toBe(
      '/etc/../secret/../../passwords.txt',
    );
  });

  it('rejects an overlong photoUrl (>500)', async () => {
    const res = await post({ ...baseBody, photoUrl: '/' + 'a'.repeat(500) });
    expect(res.status).toBe(400);
    expect(res.body.errors.photoUrl).toBeDefined();
  });

  it('rejects a non-string photoUrl', async () => {
    const res = await post({ ...baseBody, photoUrl: 12345 });
    expect(res.status).toBe(400);
    expect(res.body.errors.photoUrl).toBeDefined();
  });
});

describe('staff controller: PATCH /api/staff/:id', () => {
  it('patches skills by re-validating them against active services', async () => {
    staffModel.updateStaffById.mockResolvedValue({ id: '1', name: 'Sari' });
    const res = await patch(1, { skills: ['Carpentry'] });
    expect(res.status).toBe(200);
    expect(serviceModel.findServices).toHaveBeenCalledWith({
      search: null,
      categoryId: null,
      activeOnly: true,
    });
    expect(staffModel.updateStaffById).toHaveBeenCalledWith(1, {
      skills: ['Carpentry'],
    });
  });

  it('patches photoUrl to null when explicitly null', async () => {
    staffModel.updateStaffById.mockResolvedValue({ id: '1', name: 'Sari' });
    const res = await patch(1, { photoUrl: null });
    expect(res.status).toBe(200);
    expect(staffModel.updateStaffById.mock.calls[0]![1]).toEqual({
      photoUrl: null,
    });
  });

  it('patches photoUrl to a new local path', async () => {
    staffModel.updateStaffById.mockResolvedValue({ id: '1', name: 'Sari' });
    const res = await patch(1, { photoUrl: '/uploads/baru.png' });
    expect(res.status).toBe(200);
    expect(staffModel.updateStaffById.mock.calls[0]![1]).toEqual({
      photoUrl: '/uploads/baru.png',
    });
  });

  it('preserves unchanged fields when skills is omitted, passing only changes', async () => {
    staffModel.updateStaffById.mockResolvedValue({ id: '1', name: 'Sari' });
    const res = await patch(1, { name: 'Budi' });
    expect(res.status).toBe(200);
    const passed = staffModel.updateStaffById.mock.calls[0]![1];
    expect(passed).toEqual({ name: 'Budi' });
    expect(Object.keys(passed)).toEqual(['name']);
    expect(passed).not.toHaveProperty('skills');
    expect(passed).not.toHaveProperty('photoUrl');
  });

  it('preserves all fields when neither skills nor photoUrl is sent', async () => {
    staffModel.updateStaffById.mockResolvedValue({ id: '1', name: 'Sari' });
    const res = await patch(1, { status: 'Bertugas' });
    expect(res.status).toBe(200);
    expect(staffModel.updateStaffById.mock.calls[0]![1]).toEqual({
      status: 'Bertugas',
    });
  });

  it('rejects an empty PATCH body (400 no changes)', async () => {
    const res = await patch(1, {});
    expect(res.status).toBe(400);
    expect(staffModel.updateStaffById).not.toHaveBeenCalled();
  });

  it('rejects an unknown active-only skill on PATCH', async () => {
    const res = await patch(1, { skills: ['Ghost Service'] });
    expect(res.status).toBe(400);
    expect(res.body.errors.skills).toBeDefined();
    expect(staffModel.updateStaffById).not.toHaveBeenCalled();
  });

  it('404s when the model finds no row to update', async () => {
    staffModel.updateStaffById.mockResolvedValue(null);
    const res = await patch(999, { name: 'Budi' });
    expect(res.status).toBe(404);
    expect(res.body.message).toContain('tidak ditemukan');
  });
});

describe('staff controller: DELETE /api/staff/:id', () => {
  it('deletes an existing staff', async () => {
    staffModel.deleteStaffById.mockResolvedValue(true);
    const res = await del(1);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Petugas berhasil dihapus.');
    expect(staffModel.deleteStaffById).toHaveBeenCalledWith(1);
  });

  it('404s for a missing staff on delete', async () => {
    staffModel.deleteStaffById.mockResolvedValue(false);
    const res = await del(999);
    expect(res.status).toBe(404);
    expect(res.body.message).toContain('tidak ditemukan');
  });

  it('400s for a non-numeric id on delete', async () => {
    const res = await del('xyz');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(staffModel.deleteStaffById).not.toHaveBeenCalled();
  });
});
