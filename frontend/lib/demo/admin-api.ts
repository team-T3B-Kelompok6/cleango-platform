import 'server-only';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Customer, Order, RecordData, Resource, Schedule } from '@/types';
import {
  demoAdminMediaDirectory,
  demoMutation,
  demoTransaction,
  seedDemo,
  issueDemoTasks,
  demoEvent,
  sendDemo,
} from '../cleaner/demo-store';
import { TaskError } from '../cleaner/errors';
import { adminDemoEnabled } from './mode';
import { adminSeed } from './admin-seed';
import { sampleContact } from './contacts';
import { scheduleShifts, shiftOf } from '../resources';
import { linkedOrders, overlaps, scheduleIssue } from '../staff-schedules';
import { recordDemoAudit, seedAuditExamples } from './audit-store';
import { auditFilters, filterAuditLogs } from '../audit';

const core = ['orders', 'staff', 'customers'];
function addFreshOrders(
  orders: Order[],
  customers: Customer[],
  services: RecordData[],
  today: string,
) {
  for (let index = 0; index < 3; index++) {
    const id = 'DEMO-CHECK-0' + (index + 1);
    if (orders.some((order) => order.id === id)) continue;
    const customer = customers.find(
      (person) => person.id === 'DEMO-CUS-0' + (index + 1),
    );
    if (!customer) continue;
    const service = services[index];
    orders.push({
      id,
      customerId: customer.id,
      customer: customer.name,
      address: customer.address,
      service: String(service.name),
      serviceId: service.id,
      date: today,
      time: ['08.00–12.00 WIB', '13.00–17.00 WIB', '18.00–21.00 WIB'][index],
      price: Number(service.discountPrice ?? service.price),
      staff: [],
      status: 'Menunggu Assign',
      notes:
        'Pesanan baru fiktif untuk mencoba penugasan dari awal. Pengiriman pesan hanya simulasi.',
      isDemo: true,
    });
  }
}
function sameToken(a: string, b: string) {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
async function initialize() {
  if (!adminDemoEnabled())
    throw new TaskError('Mode demo admin tidak aktif.', 404);
  if (
    await demoTransaction((store) => {
      if (!store.admin) return false;
      seedAuditExamples(store.admin);
      if (store.admin.contentRevision !== 1) {
        const replacements = new Map([
          [
            'Contoh layanan nonaktif untuk menguji filter serta perubahan publikasi.',
            'Pembersihan sebelum atau setelah pindah, termasuk lantai, jendela bagian dalam, dan permukaan ruangan.',
          ],
          [
            'Riwayat fiktif untuk menguji laporan, filter tanggal, dan detail customer.',
            '',
          ],
          [
            'Customer baru tanpa riwayat. Gunakan untuk menguji keadaan kosong.',
            '',
          ],
          ['Akun nonaktif fiktif.', ''],
          [
            'Contoh pada mode uji: QRIS, transfer bank, dan tunai. Ketersediaan sebenarnya mengikuti aplikasi dan backend tim.',
            'Pilihan metode pembayaran ditampilkan saat checkout. Hubungi admin jika metode yang diinginkan belum tersedia.',
          ],
          [
            'Bukti transaksi tersedia setelah pembayaran terkonfirmasi. Jawaban ini masih draf dalam data uji.',
            'Bukti transaksi tersedia setelah pembayaran terkonfirmasi. Hubungi admin jika bukti pembayaran belum diterima.',
          ],
        ]);
        for (const records of [
          ...Object.values(store.entities),
          ...Object.values(store.admin.records),
        ]) {
          for (const record of records) {
            if (!record.id.startsWith('DEMO-')) continue;
            for (const field of ['description', 'answer', 'notes']) {
              const value = record[field];
              if (typeof value === 'string' && replacements.has(value))
                record[field] = replacements.get(value);
            }
          }
        }
        store.admin.contentRevision = 1;
      }
      if (store.admin.contactRevision !== 1) {
        for (const [kind, people] of [
          ['customer', store.entities.customers],
          ['staff', store.entities.staff],
        ] as const) {
          for (const person of people) {
            const number = Number(/-(\d+)$/.exec(person.id)?.[1]);
            if (!person.id.startsWith('DEMO-') || !number) continue;
            const contact = sampleContact(kind, number, person.name);
            if (!person.phone || /^0+$/.test(person.phone.replace(/\D/g, '')))
              person.phone = contact.phone;
            if (
              kind === 'customer' &&
              typeof person.email === 'string' &&
              /@example\.test$/.test(person.email)
            )
              person.email = contact.email;
          }
        }
        store.admin.contactRevision = 1;
      }
      if (store.admin.visualRevision !== 1) {
        const clean = (value: unknown): unknown =>
          typeof value === 'string'
            ? value.replace(/\[UJI(?: UTS)?\]\s*/g, '')
            : Array.isArray(value)
              ? value.map(clean)
              : value;
        for (const records of [
          ...Object.values(store.entities),
          ...Object.values(store.admin.records),
        ]) {
          for (const record of records) {
            for (const field of [
              'name',
              'customer',
              'service',
              'staff',
              'question',
            ]) {
              if (record[field] !== undefined)
                record[field] = clean(record[field]);
            }
            if (
              typeof record.notes === 'string' &&
              /skenario uji|fiktif|pengiriman.*simulasi|tugas contoh/i.test(
                record.notes,
              )
            )
              record.notes = '';
            if ('discountPrice' in record) record.discountPrice = null;
            if ('stackable' in record) record.stackable = false;
          }
        }
        store.admin.visualRevision = 1;
      }
      if (store.admin.staffShiftRevision !== 1) {
        // Convert old order-shaped schedules into staff shifts once. Task records
        // and order assignments are deliberately left intact.
        const shifts: Schedule[] = [];
        for (const old of store.admin.records.schedules ?? []) {
          for (const name of String(old.staff ?? '')
            .split(' & ')
            .filter(Boolean)) {
            const time = scheduleShifts.find(
              (shift) => shift.name === shiftOf(String(old.time)),
            )!.time;
            const existing = shifts.find(
              (shift) =>
                shift.staff === name &&
                shift.date === old.date &&
                shift.time === time,
            );
            if (existing) {
              if (old.status !== 'Selesai') existing.status = 'Terjadwal';
              continue;
            }
            shifts.push({
              id: shifts.some((shift) => shift.id === old.id)
                ? 'DEMO-JD-' + randomUUID()
                : old.id,
              staff: name,
              date: String(old.date),
              time,
              status: String(old.status || 'Terjadwal'),
              isDemo: true,
            });
          }
        }
        const today = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Jakarta',
        }).format(new Date());
        for (const person of store.entities.staff.filter((person) =>
          ['Tersedia', 'Bertugas'].includes(person.status),
        )) {
          for (const shift of scheduleShifts) {
            if (
              !shifts.some(
                (existing) =>
                  existing.staff === person.name &&
                  existing.date === today &&
                  overlaps(existing.time, shift.time),
              )
            )
              shifts.push({
                id: 'DEMO-JD-' + randomUUID(),
                staff: person.name,
                date: today,
                time: shift.time,
                status: 'Terjadwal',
                isDemo: true,
              });
          }
        }
        store.admin.records.schedules = shifts;
        store.admin.staffShiftRevision = 1;
      }
      if (!store.admin.freshOrdersSeeded) {
        const today = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Jakarta',
        }).format(new Date());
        addFreshOrders(
          store.entities.orders,
          store.entities.customers,
          store.admin.records.services,
          today,
        );
        store.admin.freshOrdersSeeded = true;
      }
      return true;
    })
  )
    return;
  // Only the first initialization seeds the cleaner scenarios. Later reads never
  // recreate deleted records or reset assignment, reports, tokens, or timestamps.
  await seedDemo();
  const initialOrders = await demoTransaction((store) => {
    if (store.admin) return [];
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
    }).format(new Date());
    const seed = adminSeed(today);
    store.admin = {
      version: 1,
      freshOrdersSeeded: true,
      sessionToken: 'admin-demo-' + randomBytes(32).toString('hex'),
      records: seed.records,
    };
    seedAuditExamples(store.admin);
    store.entities.orders.push(...seed.historical);
    // Keep three fresh unassigned orders even if earlier cleaner scenarios have
    // already been assigned/completed by the user.
    addFreshOrders(
      store.entities.orders,
      store.entities.customers,
      seed.records.services,
      today,
    );
    store.entities.staff.push(...seed.extraStaff);
    store.entities.customers.push(...seed.extraCustomers);
    store.entities.staff.forEach((person, index) => {
      person.joined ??= seed.date(-90 - index * 30);
      person.rating ??= [4.9, 4.8, 4.7][index % 3];
    });
    store.entities.customers.forEach((person, index) => {
      person.crewRating ??= [4.9, 4.8, 5][index % 3];
      person.notes ??= [
        'Gunakan cairan tanpa aroma menyengat. Fokus area dapur.',
        'Sofa berwarna terang; periksa bahan sebelum ekstraksi.',
        'Akses ruko melalui pintu samping; parkir di area belakang.',
      ][index % 3];
    });
    const newOrders: string[] = [];
    for (let index = 0; index < 2; index++) {
      const suffix = String(index + 6).padStart(2, '0');
      const name = '' + ['Arif Ramadhan', 'Salsa Maharani'][index];
      const customer = '' + ['Dewi Anggraini', 'Reno Saputra'][index];
      store.entities.staff.push({
        id: 'DEMO-PT-' + suffix,
        name,
        phone: sampleContact('staff', index + 6, name).phone,
        skills: ['Deep Cleaning', 'Sanitasi'],
        joined: seed.date(-120),
        rating: 4.9,
        area: ['Depok', 'Jakarta Selatan'][index],
        status: 'Bertugas',
        isDemo: true,
      });
      store.entities.customers.push({
        id: 'DEMO-CUS-' + suffix,
        name: customer,
        ...sampleContact('customer', index + 6, customer),
        address: [
          'Jl. Flamboyan No. 8, Depok',
          'Apartemen Taman Hijau Tower B, Jakarta Selatan',
        ][index],
        joined: seed.date(-45),
        active: true,
        notes: 'Data fiktif untuk preview tugas aktif.',
        isDemo: true,
      });
      const person = store.entities.customers.at(-1)!;
      const order: Order = {
        id: 'DEMO-ACTIVE-' + suffix,
        customerId: person.id,
        customer,
        address: person.address,
        service: String(seed.records.services[index].name),
        date: today,
        time: index ? '13.00–17.00 WIB' : '08.00–12.00 WIB',
        price: index ? 180000 : 299000,
        staff: [name],
        status: 'Menunggu Lokasi',
        notes: 'Tugas contoh aktif. Semua pengiriman pesan disimulasikan.',
        isDemo: true,
      };
      store.entities.orders.push(order);
      newOrders.push(order.id);
    }
    store.admin.records.schedules = store.entities.orders
      .filter((order) => order.staff.length && order.status !== 'Batal')
      .map((order, index) => ({
        id: 'DEMO-JD-' + String(index + 1).padStart(2, '0'),
        orderId: order.id,
        customer: order.customer,
        service: order.service,
        address: order.address,
        date: order.date,
        time: order.time,
        staff: order.staff.join(' & '),
        status: order.status === 'Selesai' ? 'Selesai' : 'Terjadwal',
        isDemo: true,
      }));
    return newOrders;
  });
  for (const [index, orderId] of initialOrders.entries()) {
    const entry = (await issueDemoTasks(orderId))[0];
    await sendDemo(entry.task.id, 'link');
    const token = entry.publicPath.split('/').at(-1)!;
    await demoEvent(token, { kind: 'depart' });
    if (index === 1) await demoEvent(token, { kind: 'arrive' });
  }
}
async function authorize(token: string) {
  await initialize();
  const valid = await demoTransaction((store) =>
    sameToken(token, store.admin!.sessionToken),
  );
  if (!valid) throw new TaskError('Masuk dengan akun demo admin.', 401);
}
function jsonBody(options: RequestInit): Record<string, unknown> {
  try {
    const body = JSON.parse(
      typeof options.body === 'string' ? options.body : '{}',
    );
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new Error();
    return body;
  } catch {
    throw new TaskError('Isian data tidak valid.', 400);
  }
}
export async function adminDemoRequest(
  route: string,
  options: RequestInit,
  token: string,
) {
  if (!adminDemoEnabled())
    throw new TaskError('Mode demo admin tidak aktif.', 404);
  const url = new URL(route, 'http://demo.local');
  const method = options.method ?? 'GET';
  if (url.pathname === '/auth/login' && method === 'POST') {
    const input = jsonBody(options);
    if (input.username !== 'admin' || input.password !== 'admin')
      throw new TaskError('Gunakan akun demo: admin / admin.', 401);
    await initialize();
    return demoTransaction((store) => {
      recordDemoAudit(store.admin!, 'login', 'auth', 'demo-admin', null, null);
      return { accessToken: store.admin!.sessionToken, expiresIn: 86400 };
    });
  }
  await authorize(token);
  if (url.pathname === '/audit-logs') {
    if (method !== 'GET')
      throw new TaskError('Riwayat aktivitas hanya dapat dibaca.', 405);
    const { filters, error } = auditFilters(
      Object.fromEntries(url.searchParams),
    );
    if (error) throw new TaskError(error, 400);
    return demoTransaction((store) => {
      const logs = store.admin!.auditLogs ?? [];
      const visible = filterAuditLogs(logs, filters);
      const pageSize = 8;
      return {
        data: structuredClone(
          visible.slice((filters.page - 1) * pageSize, filters.page * pageSize),
        ),
        admins: [
          ...new Map(logs.map((log) => [log.admin.id, log.admin])).values(),
        ].sort((left, right) => left.name.localeCompare(right.name)),
        meta: { total: visible.length, page: filters.page, pageSize },
      };
    });
  }
  if (url.pathname === '/cleaner-tasks' && method === 'GET')
    return { data: [] };
  if (url.pathname === '/uploads' && method === 'POST') {
    if (!(options.body instanceof FormData))
      throw new TaskError('Pilih gambar.', 400);
    const file = options.body.get('file');
    if (
      !(file instanceof File) ||
      !file.size ||
      file.size > 5 * 1024 * 1024 ||
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
    )
      throw new TaskError(
        'Gunakan gambar JPG, PNG, atau WebP maksimal 5 MB.',
        400,
      );
    const id =
      randomUUID() +
      ({ 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' }[
        file.type
      ] ?? '.jpg');
    await mkdir(demoAdminMediaDirectory(), { recursive: true });
    await writeFile(
      path.join(demoAdminMediaDirectory(), id),
      Buffer.from(await file.arrayBuffer()),
      { flag: 'wx', mode: 0o600 },
    );
    return { data: { url: '/api/admin/demo-media/' + id } };
  }
  // Exact matches prevent dispatch URLs from accidentally creating blank orders.
  const match =
    /^\/(orders|staff|customers|services|faqs|schedules|categories|banners|promos)(?:\/([a-zA-Z0-9_-]+))?$/.exec(
      url.pathname,
    );
  if (!match)
    throw new TaskError('Fitur ini belum tersedia dalam demo frontend.', 404);
  const [, resource, id] = match;
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(method))
    throw new TaskError('Operasi tidak didukung.', 405);
  if (
    (method === 'POST' && id) ||
    (['PATCH', 'DELETE'].includes(method) && !id)
  )
    throw new TaskError('Alamat operasi tidak valid.', 405);
  if (core.includes(resource) && id)
    return demoMutation(resource as Resource, id, method, jsonBody(options));
  if (method === 'POST' && resource === 'orders')
    throw new TaskError('Pesanan dibuat melalui aplikasi customer.', 405);
  const body = jsonBody(options);
  return demoTransaction((store) => {
    const records: RecordData[] = core.includes(resource)
      ? store.entities[resource as keyof typeof store.entities]
      : store.admin!.records[resource];
    const index = records.findIndex((record) => record.id === id);
    if (resource === 'schedules' && method !== 'GET') {
      const previous = index >= 0 ? (records[index] as Schedule) : undefined;
      if (method === 'DELETE') {
        if (
          previous &&
          linkedOrders(previous, store.entities.orders).some(
            (order) => order.status !== 'Selesai',
          )
        )
          throw new TaskError(
            'Shift masih dipakai pesanan aktif. Pindahkan penugasan terlebih dahulu.',
            409,
          );
      } else {
        const next = { ...previous, ...body, id: id ?? '' } as Schedule;
        if (
          !store.entities.staff.some((person) => person.name === next.staff) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(next.date ?? '') ||
          !['Terjadwal', 'Berlangsung', 'Selesai', 'Nonaktif'].includes(
            next.status,
          )
        )
          throw new TaskError(
            'Isi petugas, tanggal, jam, dan status shift yang valid.',
            400,
          );
        const issue = scheduleIssue(
          next,
          records as Schedule[],
          store.entities.orders,
          previous,
        );
        if (issue) throw new TaskError(issue, 409);
      }
    }
    if (method === 'GET') {
      if (id && index < 0)
        throw new TaskError('Data uji tidak ditemukan.', 404);
      const visible =
        resource === 'categories'
          ? records.filter(
              (record) => record.resource === url.searchParams.get('resource'),
            )
          : records;
      return { data: structuredClone(id ? records[index] : visible) };
    }
    if (method === 'POST') {
      const created = {
        ...(resource === 'faqs'
          ? { viewCount: 0, updatedAt: new Date().toISOString() }
          : {}),
        ...(resource === 'promos' ? { usedCount: 0 } : {}),
        ...body,
        id: 'DEMO-' + resource.toUpperCase() + '-' + randomUUID(),
        isDemo: true,
      };
      records.push(created);
      recordDemoAudit(
        store.admin!,
        'create',
        resource,
        created.id,
        null,
        created,
      );
      return { data: structuredClone(created) };
    }
    if (index < 0) throw new TaskError('Data uji tidak ditemukan.', 404);
    if (
      method === 'PATCH' &&
      resource === 'categories' &&
      records[index].resource === 'services' &&
      typeof body.name === 'string' &&
      body.name !== records[index].name
    ) {
      const previousName = records[index].name;
      for (const service of store.admin!.records.services.filter(
        (service) => service.category === previousName,
      )) {
        const before = structuredClone(service);
        service.category = body.name;
        recordDemoAudit(
          store.admin!,
          'update',
          'services',
          service.id,
          before,
          service,
        );
      }
    }
    if (method === 'DELETE') {
      if (resource === 'categories' && records[index].resource === 'services') {
        const linkedServices = store.admin!.records.services.filter(
          (service) => service.category === records[index].name,
        );
        if (
          linkedServices.length &&
          url.searchParams.get('deleteServices') !== 'true'
        )
          throw new TaskError(
            'Kategori masih digunakan oleh layanan dan tidak dapat dihapus.',
            409,
          );
        if (url.searchParams.get('deleteServices') === 'true') {
          for (const service of linkedServices)
            recordDemoAudit(
              store.admin!,
              'delete',
              'services',
              service.id,
              service,
              null,
            );
          store.admin!.records.services = store.admin!.records.services.filter(
            (service) => service.category !== records[index].name,
          );
        }
      }
      recordDemoAudit(
        store.admin!,
        'delete',
        resource,
        id!,
        records[index],
        null,
      );
      records.splice(index, 1);
      return { message: 'Data uji dihapus.' };
    }
    const previous = records[index];
    const updated = {
      ...records[index],
      ...body,
      ...(resource === 'faqs' ? { updatedAt: new Date().toISOString() } : {}),
      id: id!,
      isDemo: true,
    };
    records[index] = updated;
    recordDemoAudit(store.admin!, 'update', resource, id!, previous, updated);
    return { data: structuredClone(updated) };
  });
}
export async function adminDemoMedia(id: string, token: string) {
  await authorize(token);
  if (!/^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(id))
    throw new TaskError('Gambar tidak ditemukan.', 404);
  try {
    return {
      bytes: await readFile(path.join(demoAdminMediaDirectory(), id)),
      type: id.endsWith('.png')
        ? 'image/png'
        : id.endsWith('.webp')
          ? 'image/webp'
          : 'image/jpeg',
    };
  } catch {
    throw new TaskError('Gambar tidak ditemukan.', 404);
  }
}
