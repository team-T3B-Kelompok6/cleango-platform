import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../lib/db.js';

// FAQ categories are managed in the admin dashboard (service_categories
// with resource='faqs'), so this is plain text, not a fixed union.
export type FaqCategory = string;
export interface FaqInput {
  category: FaqCategory;
  question: string;
  answer: string;
  published: boolean;
}
interface FaqRow extends RowDataPacket {
  id: number;
  category: FaqCategory;
  question: string;
  answer: string;
  published: number;
  updatedAt: Date;
}
export interface Faq {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  published: boolean;
  updatedAt: string;
}

function mapFaq(row: FaqRow): Faq {
  return {
    id: String(row.id),
    category: row.category,
    question: row.question,
    answer: row.answer,
    published: Boolean(row.published),
    updatedAt: row.updatedAt.toISOString(),
  };
}
const select = `SELECT id, category, question, answer, is_active AS published, updated_at AS updatedAt FROM faqs`;

export async function listFaqs(): Promise<Faq[]> {
  const [rows] = await pool.query<FaqRow[]>(
    `${select} ORDER BY sort_order, id`,
  );
  return rows.map(mapFaq);
}
export async function listPublishedFaqs(): Promise<Faq[]> {
  const [rows] = await pool.query<FaqRow[]>(
    `${select} WHERE is_active = TRUE ORDER BY sort_order, id`,
  );
  return rows.map(mapFaq);
}
export async function findFaq(id: number): Promise<Faq | null> {
  const [rows] = await pool.query<FaqRow[]>(`${select} WHERE id = ? LIMIT 1`, [
    id,
  ]);
  return rows[0] ? mapFaq(rows[0]) : null;
}
export async function insertFaq(input: FaqInput): Promise<Faq> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO faqs (category, question, answer, is_active) VALUES (?, ?, ?, ?)',
    [input.category, input.question, input.answer, input.published],
  );
  const faq = await findFaq(result.insertId);
  if (!faq) throw new Error('FAQ gagal dibaca setelah dibuat');
  return faq;
}
export async function updateFaqById(
  id: number,
  input: Partial<FaqInput>,
): Promise<Faq | null> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE faqs SET category = IF(?, ?, category), question = IF(?, ?, question),
     answer = IF(?, ?, answer), is_active = IF(?, ?, is_active) WHERE id = ?`,
    [
      input.category !== undefined,
      input.category ?? '',
      input.question !== undefined,
      input.question ?? '',
      input.answer !== undefined,
      input.answer ?? '',
      input.published !== undefined,
      input.published ?? false,
      id,
    ],
  );
  if (result.affectedRows === 0) return null;
  return findFaq(id);
}
export async function deleteFaqById(id: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM faqs WHERE id = ?',
    [id],
  );
  return result.affectedRows > 0;
}
