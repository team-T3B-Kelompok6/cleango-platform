import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../lib/db.js';

export interface Banner {
  id: string;
  imageUrl: string;
}

interface BannerRow extends RowDataPacket {
  id: number;
  imageUrl: string;
}

const SELECT = 'SELECT id, image_url AS imageUrl FROM banners';

export async function listBanners(): Promise<Banner[]> {
  const [rows] = await pool.query<BannerRow[]>(`${SELECT} ORDER BY created_at ASC`);
  return rows.map(mapBanner);
}

export async function findBanner(id: number): Promise<Banner | null> {
  const [rows] = await pool.query<BannerRow[]>(`${SELECT} WHERE id = ? LIMIT 1`, [id]);
  return rows[0] ? mapBanner(rows[0]) : null;
}

function mapBanner(row: BannerRow): Banner {
  return { id: String(row.id), imageUrl: row.imageUrl };
}

export async function insertBanner(imageUrl: string): Promise<Banner> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO banners (image_url) VALUES (?)',
    [imageUrl],
  );
  const banner = await findBanner(result.insertId);
  if (!banner) throw new Error('Banner gagal dibaca setelah dibuat');
  return banner;
}

export async function updateBannerById(
  id: number,
  imageUrl: string,
): Promise<Banner | null> {
  const [result] = await pool.execute<ResultSetHeader>(
    'UPDATE banners SET image_url = ? WHERE id = ?',
    [imageUrl, id],
  );
  if (result.affectedRows === 0) return null;
  return findBanner(id);
}

export async function deleteBannerById(id: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>('DELETE FROM banners WHERE id = ?', [id]);
  return result.affectedRows > 0;
}