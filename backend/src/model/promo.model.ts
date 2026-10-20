import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../lib/db.js';

export type DiscountType = 'percentage' | 'fixed';
export type PromoScope = 'all' | 'services';

export interface Promo {
  id: string;
  name: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minPurchase: number;
  scope: PromoScope;
  serviceIds: string[];
  startsOn: string;
  endsOn: string;
  usageLimit: number | null;
  perCustomerLimit: number;
  stackable: boolean;
  active: boolean;
  usedCount?: number;
}

export interface PromoInput {
  name: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minPurchase: number;
  scope: PromoScope;
  serviceIds: string[];
  startsOn: string;
  endsOn: string;
  usageLimit: number | null;
  perCustomerLimit: number;
  stackable: boolean;
  active: boolean;
}

interface PromoRow extends RowDataPacket {
  id: number;
  name: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maximumDiscount: number | null;
  minimumOrder: number;
  quota: number | null;
  usedCount: number;
  startsAt: Date;
  endsAt: Date;
  isActive: number;
  scope: PromoScope;
  serviceIds: string | string[] | null;
  perCustomerLimit: number;
  stackable: number;
}

const SELECT = `SELECT id, name, code, discount_type AS discountType,
  discount_value AS discountValue, maximum_discount AS maximumDiscount,
  minimum_order AS minimumOrder, quota, used_count AS usedCount,
  starts_at AS startsAt, ends_at AS endsAt, is_active AS isActive,
  scope, service_ids AS serviceIds, per_customer_limit AS perCustomerLimit,
  stackable
  FROM promos`;

function parseServiceIds(value: PromoRow['serviceIds']): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function mapPromo(row: PromoRow): Promo {
  return {
    id: String(row.id),
    name: row.name,
    code: row.code,
    discountType: row.discountType,
    discountValue: Number(row.discountValue),
    maxDiscount:
      row.maximumDiscount === null ? null : Number(row.maximumDiscount),
    minPurchase: Number(row.minimumOrder),
    scope: row.scope,
    serviceIds: parseServiceIds(row.serviceIds),
    startsOn: row.startsAt.toISOString().slice(0, 10),
    endsOn: row.endsAt.toISOString().slice(0, 10),
    usageLimit: row.quota === null ? null : Number(row.quota),
    perCustomerLimit: Number(row.perCustomerLimit),
    stackable: Boolean(row.stackable),
    active: Boolean(row.isActive),
    usedCount: Number(row.usedCount),
  };
}

export async function listPromos(): Promise<Promo[]> {
  const [rows] = await pool.query<PromoRow[]>(`${SELECT} ORDER BY created_at DESC`);
  return rows.map(mapPromo);
}

// Promos the customer app may show: active, inside the period, quota left.
export async function listActivePromos(): Promise<Promo[]> {
  const [rows] = await pool.query<PromoRow[]>(
    `${SELECT}
     WHERE is_active = TRUE AND starts_at <= NOW() AND ends_at > NOW()
       AND (quota IS NULL OR used_count < quota)
     ORDER BY ends_at ASC, id ASC`,
  );
  return rows.map(mapPromo);
}

export async function findPromo(id: number): Promise<Promo | null> {
  const [rows] = await pool.query<PromoRow[]>(`${SELECT} WHERE id = ? LIMIT 1`, [id]);
  return rows[0] ? mapPromo(rows[0]) : null;
}

export async function findPromoByCode(code: string): Promise<Promo | null> {
  const [rows] = await pool.query<PromoRow[]>(`${SELECT} WHERE code = ? LIMIT 1`, [
    code,
  ]);
  return rows[0] ? mapPromo(rows[0]) : null;
}

export async function insertPromo(input: PromoInput): Promise<Promo> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO promos
       (code, name, discount_type, discount_value, maximum_discount, minimum_order,
        quota, starts_at, ends_at, is_active, scope, service_ids,
        per_customer_limit, stackable)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.code,
      input.name,
      input.discountType,
      input.discountValue,
      input.maxDiscount,
      input.minPurchase,
      input.usageLimit,
      `${input.startsOn} 00:00:00`,
      `${input.endsOn} 00:00:00`,
      input.active,
      input.scope,
      JSON.stringify(input.scope === 'all' ? [] : input.serviceIds),
      input.perCustomerLimit,
      input.stackable,
    ],
  );
  const promo = await findPromo(result.insertId);
  if (!promo) throw new Error('Promo gagal dibaca setelah dibuat');
  return promo;
}

export async function updatePromoById(
  id: number,
  input: Partial<PromoInput>,
): Promise<Promo | null> {
  const existing = await findPromo(id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  const set = (column: string, value: string | number | null): void => {
    fields.push(`${column} = ?`);
    values.push(value);
  };

  if (input.name !== undefined) set('name', input.name);
  if (input.code !== undefined) set('code', input.code);
  if (input.discountType !== undefined) set('discount_type', input.discountType);
  if (input.discountValue !== undefined) set('discount_value', input.discountValue);
  if (input.maxDiscount !== undefined) set('maximum_discount', input.maxDiscount);
  if (input.minPurchase !== undefined) set('minimum_order', input.minPurchase);
  if (input.usageLimit !== undefined) set('quota', input.usageLimit);
  if (input.startsOn !== undefined) set('starts_at', `${input.startsOn} 00:00:00`);
  if (input.endsOn !== undefined) set('ends_at', `${input.endsOn} 00:00:00`);
  if (input.active !== undefined) set('is_active', input.active ? 1 : 0);
  if (input.scope !== undefined) set('scope', input.scope);
  if (input.serviceIds !== undefined)
    set('service_ids', JSON.stringify(input.scope === 'all' ? [] : input.serviceIds));
  if (input.perCustomerLimit !== undefined) set('per_customer_limit', input.perCustomerLimit);
  if (input.stackable !== undefined) set('stackable', input.stackable ? 1 : 0);

  if (!fields.length) return existing;
  values.push(id);
  await pool.execute(`UPDATE promos SET ${fields.join(', ')} WHERE id = ?`, values);
  return findPromo(id);
}

export async function deletePromoById(id: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>('DELETE FROM promos WHERE id = ?', [id]);
  return result.affectedRows > 0;
}