import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/model/user.model.js', async (original) => ({
  ...(await original<typeof import('../src/model/user.model.js')>()),
  isTokenRevoked: vi.fn().mockResolvedValue(false),
}));

const reviewModel = vi.hoisted(() => ({
  createBookingReview: vi.fn(),
  findBookingReview: vi.fn(),
  updateBookingReview: vi.fn(),
  addBookingReviewPhoto: vi.fn(),
  deleteBookingReviewPhoto: vi.fn(),
}));
const imageStorage = vi.hoisted(() => ({
  saveImage: vi.fn(),
  removeStoredFile: vi.fn(),
  storedPathFromUrl: vi.fn(),
}));
vi.mock('../src/model/review.model.js', () => reviewModel);
vi.mock('../src/lib/image-storage.js', () => imageStorage);

import { createApp } from '../src/app.js';
import { createAccessToken } from '../src/lib/jwt.js';

const app = createApp();
const customerToken = createAccessToken({
  id: 10,
  email: 'c@e.com',
  role: 'customer',
} as never);
const adminToken = createAccessToken({ id: 1, email: 'a@e.com', role: 'admin' } as never);

beforeEach(() => {
  reviewModel.createBookingReview.mockReset();
  reviewModel.createBookingReview.mockResolvedValue({ ok: true, id: 7 });
  reviewModel.findBookingReview.mockResolvedValue({
    id: '7',
    rating: 4,
    comment: 'Bersih',
    createdAt: '2026-10-20T00:00:00.000Z',
    updatedAt: '2026-10-20T00:00:00.000Z',
    editable: true,
  });
  reviewModel.updateBookingReview.mockResolvedValue({ ok: true });
  reviewModel.addBookingReviewPhoto.mockReset();
  reviewModel.deleteBookingReviewPhoto.mockReset();
  reviewModel.addBookingReviewPhoto.mockResolvedValue({
    ok: true,
    photo: { id: '3', url: '/uploads/review-photos/a.jpg', sortOrder: 0 },
  });
  reviewModel.deleteBookingReviewPhoto.mockResolvedValue({
    ok: true,
    url: '/uploads/review-photos/a.jpg',
  });
  imageStorage.saveImage.mockReset();
  imageStorage.removeStoredFile.mockReset();
  imageStorage.storedPathFromUrl.mockReset();
  imageStorage.saveImage.mockResolvedValue({
    url: '/uploads/review-photos/a.jpg',
    storagePath: '/tmp/a.jpg',
  });
  imageStorage.storedPathFromUrl.mockReturnValue('/tmp/a.jpg');
});

describe('customer booking review', () => {
  it('requires a customer session', async () => {
    expect((await request(app).post('/api/customer/bookings/5/review').send({ rating: 5 })).status).toBe(401);
    expect(
      (
        await request(app)
          .post('/api/customer/bookings/5/review')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ rating: 5 })
      ).status,
    ).toBe(403);
  });

  it('rejects a rating outside 1 to 5 before touching the model', async () => {
    for (const rating of [0, 6, 4.5, 'lima', null]) {
      const response = await request(app)
        .post('/api/customer/bookings/5/review')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ rating });
      expect(response.status).toBe(400);
    }
    expect(reviewModel.createBookingReview).not.toHaveBeenCalled();
  });

  it('rejects an overlong comment', async () => {
    const response = await request(app)
      .post('/api/customer/bookings/5/review')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 5, comment: 'x'.repeat(1001) });
    expect(response.status).toBe(400);
  });

  it('creates a review with trimmed text and no extra private data', async () => {
    const response = await request(app)
      .post('/api/customer/bookings/5/review')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 4, comment: '  Bersih  ' });
    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({ id: '7', rating: 4, comment: 'Bersih' });
    expect(reviewModel.createBookingReview).toHaveBeenCalledWith(10, 5, {
      rating: 4,
      comment: 'Bersih',
    });
  });

  it('reads the review for the owner', async () => {
    const response = await request(app)
      .get('/api/customer/bookings/5/review')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.rating).toBe(4);
    expect(reviewModel.findBookingReview).toHaveBeenCalledWith(10, 5);
  });

  it('updates an existing review once', async () => {
    const response = await request(app)
      .put('/api/customer/bookings/5/review')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 3, comment: '  Lebih baik  ' });
    expect(response.status).toBe(200);
    expect(reviewModel.updateBookingReview).toHaveBeenCalledWith(10, 5, {
      rating: 3,
      comment: 'Lebih baik',
    });
  });

  it('maps missing and closed review windows on update', async () => {
    for (const [reason, status] of [
      ['MISSING', 404],
      ['WINDOW_CLOSED', 409],
    ] as const) {
      reviewModel.updateBookingReview.mockResolvedValueOnce({ ok: false, reason });
      const response = await request(app)
        .put('/api/customer/bookings/5/review')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ rating: 4 });
      expect(response.status).toBe(status);
    }
  });

  it('rejects an invalid rating on update before touching the model', async () => {
    reviewModel.updateBookingReview.mockClear();
    const response = await request(app)
      .put('/api/customer/bookings/5/review')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 9 });
    expect(response.status).toBe(400);
    expect(reviewModel.updateBookingReview).not.toHaveBeenCalled();
  });

  it('uploads one photo only for the owner and removes it when the limit is hit', async () => {
    reviewModel.addBookingReviewPhoto.mockResolvedValueOnce({
      ok: false,
      reason: 'LIMIT_REACHED',
    });
    const response = await request(app)
      .post('/api/customer/bookings/5/review/photos')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Content-Type', 'image/png')
      .send(Buffer.from([1, 2, 3]));
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('REVIEW_PHOTO_LIMIT');
    expect(imageStorage.removeStoredFile).toHaveBeenCalledWith('/tmp/a.jpg');

    reviewModel.addBookingReviewPhoto.mockResolvedValueOnce({
      ok: true,
      photo: { id: '3', url: '/uploads/review-photos/a.jpg', sortOrder: 0 },
    });
    const created = await request(app)
      .post('/api/customer/bookings/5/review/photos')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Content-Type', 'image/png')
      .send(Buffer.from([1, 2, 3]));
    expect(created.status).toBe(201);
    expect(reviewModel.addBookingReviewPhoto).toHaveBeenCalledWith(
      10,
      5,
      '/uploads/review-photos/a.jpg',
    );
  });

  it('requires auth before accepting a photo', async () => {
    const response = await request(app)
      .post('/api/customer/bookings/5/review/photos')
      .set('Content-Type', 'image/png')
      .send(Buffer.from([1]));
    expect(response.status).toBe(401);
    expect(imageStorage.saveImage).not.toHaveBeenCalled();
  });

  it('deletes an owned review photo and its stored file', async () => {
    const response = await request(app)
      .delete('/api/customer/bookings/5/review/photos/3')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(response.status).toBe(200);
    expect(reviewModel.deleteBookingReviewPhoto).toHaveBeenCalledWith(10, 5, 3);
    expect(imageStorage.removeStoredFile).toHaveBeenCalledWith('/tmp/a.jpg');
  });

  it('maps ownership, unfinished and duplicate results', async () => {
    const cases = [
      ['NOT_FOUND', 404],
      ['NOT_COMPLETED', 409],
      ['DUPLICATE', 409],
    ] as const;
    for (const [reason, status] of cases) {
      reviewModel.createBookingReview.mockResolvedValueOnce({ ok: false, reason });
      const response = await request(app)
        .post('/api/customer/bookings/5/review')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ rating: 5 });
      expect(response.status).toBe(status);
    }
  });
});
