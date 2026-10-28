import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

const enabled = process.env.DB_NAME === 'cleango' && process.env.RUN_DB_TESTS === '1';
const suite = enabled ? describe : describe.skip;

suite('booking reviews against the database (RUN_DB_TESTS=1)', () => {
  let db: mysql.Connection;
  let customerA = 0;
  let customerB = 0;
  let adminId = 0;
  let cleanerId = 0;
  let serviceId = 0;
  let addressId = 0;
  const bookings: number[] = [];

  beforeAll(async () => {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'cleango',
    });
    const stamp = Date.now();
    const [a] = await db.execute<ResultSetHeader>(
      `INSERT INTO users (name, email, password_hash, role) VALUES ('uji-review-a', ?, 'x', 'customer')`,
      [`uji-review-a-${stamp}@test.local`],
    );
    customerA = Number(a.insertId);
    const [b] = await db.execute<ResultSetHeader>(
      `INSERT INTO users (name, email, password_hash, role) VALUES ('uji-review-b', ?, 'x', 'customer')`,
      [`uji-review-b-${stamp}@test.local`],
    );
    customerB = Number(b.insertId);
    const [ad] = await db.execute<ResultSetHeader>(
      `INSERT INTO users (name, email, password_hash, role) VALUES ('uji-review-admin', ?, 'x', 'admin')`,
      [`uji-review-admin-${stamp}@test.local`],
    );
    adminId = Number(ad.insertId);
    const [addr] = await db.execute<ResultSetHeader>(
      `INSERT INTO addresses (user_id, label, recipient_name, recipient_phone, street_address, is_primary)
       VALUES (?, 'Uji', 'Uji', '081200000000', 'Jl. Uji 1', TRUE)`,
      [customerA],
    );
    addressId = Number(addr.insertId);
    const [s] = await db.execute<ResultSetHeader>(
      `INSERT INTO services (category_id, name, slug, description, price, duration_minutes, is_active)
       VALUES (5, ?, ?, 'uji', 100000, 60, TRUE)`,
      [`Uji Review ${stamp}`, `uji-review-${stamp}`],
    );
    serviceId = Number(s.insertId);
    const [c] = await db.execute<ResultSetHeader>(
      `INSERT INTO cleaners (name, phone, area, status, average_rating, is_active)
       VALUES (?, ?, 'Uji', 'available', 0, TRUE)`,
      [`Uji Review Cleaner ${stamp}`, '081200000099'],
    );
    cleanerId = Number(c.insertId);
    for (const status of ['completed', 'confirmed']) {
      const [row] = await db.execute<ResultSetHeader>(
        `INSERT INTO bookings (booking_code, customer_id, service_id, address_id,
           scheduled_date, scheduled_start_time, service_price, service_duration_minutes,
           platform_fee, discount_amount, total_amount, status, completed_at)
         VALUES (?, ?, ?, ?, '2026-12-12', '09:00:00', 100000, 60, 5000, 0, 105000, ?,
           ${status === 'completed' ? 'NOW()' : 'NULL'})`,
        [`UR${stamp}${status.slice(0, 3)}`, customerA, serviceId, addressId, status],
      );
      bookings.push(Number(row.insertId));
    }
    await db.execute(
      `INSERT INTO cleaner_assignments
         (booking_id, cleaner_id, assigned_by, link_token_hash, link_expires_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY))`,
      [bookings[0], cleanerId, adminId, randomBytes(32).toString('hex')],
    );
  });

  afterAll(async () => {
    if (db && bookings.length) {
      await db.query('DELETE FROM reviews WHERE booking_id IN (?)', [bookings]);
      await db.query('DELETE FROM cleaner_assignments WHERE booking_id IN (?)', [bookings]);
      await db.query('DELETE FROM bookings WHERE id IN (?)', [bookings]);
      await db.execute('DELETE FROM cleaners WHERE id = ?', [cleanerId]);
      await db.execute('DELETE FROM services WHERE id = ?', [serviceId]);
      await db.execute('DELETE FROM addresses WHERE user_id = ?', [customerA]);
      await db.query('DELETE FROM users WHERE id IN (?)', [[customerA, customerB, adminId]]);
      await db.end();
    }
  });

  it('stores a review for a completed owned booking including the cleaner', async () => {
    const { createBookingReview } = await import('../src/model/review.model.js');
    const result = await createBookingReview(customerA, bookings[0], {
      rating: 5,
      comment: 'Bersih dan rapi',
    });
    expect(result).toMatchObject({ ok: true });
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT rating, comment, cleaner_id AS cleanerId FROM reviews WHERE booking_id = ?',
      [bookings[0]],
    );
    expect(rows[0]?.rating).toBe(5);
    expect(rows[0]?.comment).toBe('Bersih dan rapi');
    expect(Number(rows[0]?.cleanerId)).toBe(cleanerId);
  });

  it('rejects a duplicate review for the same booking', async () => {
    const { createBookingReview } = await import('../src/model/review.model.js');
    const result = await createBookingReview(customerA, bookings[0], { rating: 4, comment: null });
    expect(result).toEqual({ ok: false, reason: 'DUPLICATE' });
  });

  it('reads and updates a review inside the 7 day window', async () => {
    const { findBookingReview, updateBookingReview } = await import('../src/model/review.model.js');
    const found = await findBookingReview(customerA, bookings[0]);
    expect(found?.rating).toBe(5);
    expect(found?.editable).toBe(true);

    const updated = await updateBookingReview(customerA, bookings[0], {
      rating: 3,
      comment: 'Diperbarui',
    });
    expect(updated).toEqual({ ok: true });
    const after = await findBookingReview(customerA, bookings[0]);
    expect(after?.rating).toBe(3);
    expect(after?.comment).toBe('Diperbarui');
  });

  it('stores, limits, lists and deletes review photos', async () => {
    const { addBookingReviewPhoto, deleteBookingReviewPhoto, findBookingReview } =
      await import('../src/model/review.model.js');
    const first = await addBookingReviewPhoto(
      customerA,
      bookings[0],
      '/uploads/review-photos/1.jpg',
    );
    expect(first.ok).toBe(true);
    await addBookingReviewPhoto(customerA, bookings[0], '/uploads/review-photos/2.jpg');
    await addBookingReviewPhoto(customerA, bookings[0], '/uploads/review-photos/3.jpg');
    expect(
      await addBookingReviewPhoto(customerA, bookings[0], '/uploads/review-photos/4.jpg'),
    ).toEqual({ ok: false, reason: 'LIMIT_REACHED' });

    const withPhotos = await findBookingReview(customerA, bookings[0]);
    expect(withPhotos?.photos.map((photo) => photo.url)).toEqual([
      '/uploads/review-photos/1.jpg',
      '/uploads/review-photos/2.jpg',
      '/uploads/review-photos/3.jpg',
    ]);

    if (!first.ok) throw new Error('first photo was not stored');
    const removed = await deleteBookingReviewPhoto(
      customerA,
      bookings[0],
      Number(first.photo.id),
    );
    expect(removed).toEqual({
      ok: true,
      url: '/uploads/review-photos/1.jpg',
    });
    expect((await findBookingReview(customerA, bookings[0]))?.photos).toHaveLength(2);
  });

  it('exposes public review data for the requested service', async () => {
    const { findServiceReviewStats, listServiceReviews } = await import(
      '../src/model/service.model.js'
    );
    await db.execute("UPDATE users SET avatar_url = '/uploads/avatars/a.png' WHERE id = ?", [
      customerA,
    ]);
    const stats = await findServiceReviewStats(serviceId);
    expect(stats.reviewCount).toBeGreaterThanOrEqual(1);
    expect(stats.rating).toBeGreaterThan(0);

    const reviews = await listServiceReviews(serviceId, 1, 10);
    expect(reviews[0]).toMatchObject({
      name: 'uji-review-a',
      avatarUrl: '/uploads/avatars/a.png',
      rating: 3,
      comment: 'Diperbarui',
    });
    expect(reviews[0]?.photos).toHaveLength(2);
  });

  it('closes create and edit after 7 days from completion', async () => {
    const { createBookingReview, updateBookingReview } = await import('../src/model/review.model.js');
    await db.execute(
      "UPDATE bookings SET completed_at = DATE_SUB(NOW(), INTERVAL 8 DAY) WHERE id = ?",
      [bookings[0]],
    );
    expect(
      await updateBookingReview(customerA, bookings[0], { rating: 4, comment: null }),
    ).toEqual({ ok: false, reason: 'WINDOW_CLOSED' });

    const [fresh] = await db.execute<ResultSetHeader>(
      `INSERT INTO bookings (booking_code, customer_id, service_id, address_id,
         scheduled_date, scheduled_start_time, service_price, service_duration_minutes,
         platform_fee, discount_amount, total_amount, status, completed_at)
       VALUES (?, ?, ?, ?, '2026-12-13', '09:00:00', 100000, 60, 5000, 0, 105000, 'completed',
         DATE_SUB(NOW(), INTERVAL 8 DAY))`,
      [`URW${Date.now()}`, customerA, serviceId, addressId],
    );
    bookings.push(Number(fresh.insertId));
    expect(
      await createBookingReview(customerA, Number(fresh.insertId), { rating: 5, comment: null }),
    ).toEqual({ ok: false, reason: 'WINDOW_CLOSED' });
  });

  it('rejects another customer and an unfinished booking', async () => {
    const { createBookingReview } = await import('../src/model/review.model.js');
    expect(await createBookingReview(customerB, bookings[0], { rating: 5, comment: null })).toEqual({
      ok: false,
      reason: 'NOT_FOUND',
    });
    expect(await createBookingReview(customerA, bookings[1], { rating: 5, comment: null })).toEqual({
      ok: false,
      reason: 'NOT_COMPLETED',
    });
  });
});
