import 'server-only';
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { mkdir, open, readFile, rename, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import type {
  Customer,
  Order,
  RecordData,
  Resource,
  Staff,
  Schedule,
} from '@/types';
import type { CleanerTask, Delivery, TaskStage } from '@/types/cleaner';
import { TaskError } from './errors';
import { adminDemoEnabled } from '../demo/mode';
import { sampleContact } from '../demo/contacts';
import { assignmentIssue } from '../staff-schedules';
import { recordDemoAudit } from '../demo/audit-store';
import type { AuditLog } from '@/types/audit';

interface StoredTask {
  id: string;
  orderId: string;
  staffId: string;
  stage: TaskStage;
  updatedAt: string;
  expiresAt: string;
  departedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  report?: { summary: string; checked: boolean };
  photos: { id: string; type: string }[];
  linkDelivery: Delivery;
  reportDelivery: Delivery;
  location?: { latitude: number; longitude: number; updatedAt: string };
}
interface Store {
  version: 1;
  secret: string;
  entities: { orders: Order[]; staff: Staff[]; customers: Customer[] };
  tasks: StoredTask[];
  admin?: {
    version: 1;
    freshOrdersSeeded?: boolean;
    visualRevision?: number;
    contactRevision?: number;
    staffShiftRevision?: number;
    contentRevision?: number;
    sessionToken: string;
    auditLogs?: AuditLog[];
    auditSeeded?: boolean;
    records: Record<string, RecordData[]>;
  };
}
export const demoEnabled = () =>
  process.env.CLEANER_DEMO_ENABLED === 'true' || adminDemoEnabled();
export const isDemoId = (id: string) => id.startsWith('DEMO-');
const directory = () =>
  path.resolve(
    /*turbopackIgnore: true*/ process.env.CLEANER_DEMO_DATA_DIR ||
      path.join(process.cwd(), '.local', 'cleaner-demo'),
  );
export const demoAdminMediaDirectory = () =>
  path.join(directory(), 'admin-media');
const emptyStore = (): Store => ({
  version: 1,
  secret: randomBytes(48).toString('hex'),
  entities: { orders: [], staff: [], customers: [] },
  tasks: [],
});
const processStore = globalThis as typeof globalThis & {
  cleanGoDemoQueues?: Map<string, Promise<void>>;
};
const transactionQueues = (processStore.cleanGoDemoQueues ??= new Map());
export async function demoTransaction<T>(
  operation: (store: Store) => T | Promise<T>,
): Promise<T> {
  if (!demoEnabled()) throw new TaskError('Mode uji belum diaktifkan.', 404);
  const dir = directory();
  // Keep one queue across development reloads. Only one request may recover/read
  // the lock at a time; otherwise a stale-lock recovery can race with a new lock.
  const previous = transactionQueues.get(dir) ?? Promise.resolve();
  let releaseQueue!: () => void;
  const current = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });
  transactionQueues.set(dir, current);
  await previous;
  try {
    return await lockedTransaction(dir, operation);
  } finally {
    releaseQueue();
    if (transactionQueues.get(dir) === current) transactionQueues.delete(dir);
  }
}
async function lockedTransaction<T>(
  dir: string,
  operation: (store: Store) => T | Promise<T>,
): Promise<T> {
  await mkdir(dir, { recursive: true });
  const lockFile = path.join(dir, 'store.lock');
  let lock;
  const deadline = Date.now() + 5000;
  while (!lock) {
    try {
      lock = await open(lockFile, 'wx', 0o600);
      await lock.writeFile(String(process.pid));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      // Recover a lock left behind by a stopped development server.
      try {
        const info = await stat(lockFile);
        if (Date.now() - info.mtimeMs > 10000) {
          const owner = Number(await readFile(lockFile, 'utf8'));
          let alive = Number.isSafeInteger(owner) && owner > 0;
          if (alive) {
            try {
              process.kill(owner, 0);
            } catch (failure) {
              alive = (failure as NodeJS.ErrnoException).code !== 'ESRCH';
            }
          }
          if (!alive) {
            await unlink(lockFile);
            continue;
          }
        }
      } catch (failure) {
        if ((failure as NodeJS.ErrnoException).code !== 'ENOENT') throw failure;
      }
      if (Date.now() > deadline)
        throw new TaskError('Data sedang diperbarui. Coba lagi.', 503);
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  try {
    const file = path.join(dir, 'store.json');
    let store: Store;
    try {
      store = JSON.parse(await readFile(file, 'utf8')) as Store;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      store = emptyStore();
    }
    const result = await operation(store);
    const temp = path.join(dir, 'store-' + randomUUID() + '.tmp');
    const handle = await open(temp, 'wx', 0o600);
    try {
      await handle.writeFile(JSON.stringify(store));
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temp, file);
    return result;
  } finally {
    await lock.close();
    await unlink(lockFile);
  }
}
function newDelivery(): Delivery {
  return { status: 'not_sent', mode: 'simulation', attempts: 0 };
}
export async function seedDemo(reset = false) {
  return demoTransaction(async (store) => {
    if (reset) {
      const scenarioOrder = (id: string) => /^DEMO-ORD-0[1-3]$/.test(id);
      for (const task of store.tasks.filter((item) =>
        scenarioOrder(item.orderId),
      ))
        for (const photo of task.photos)
          await unlink(path.join(directory(), 'photos', photo.id)).catch(
            (error) => {
              if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
                throw error;
            },
          );
      store.entities.orders = store.entities.orders.filter(
        (item) => !scenarioOrder(item.id),
      );
      store.entities.staff = store.entities.staff.filter(
        (item) => !/^DEMO-PT-0[1-3]$/.test(item.id),
      );
      store.entities.customers = store.entities.customers.filter(
        (item) => !/^DEMO-CUS-0[1-3]$/.test(item.id),
      );
      store.tasks = store.tasks.filter((item) => !scenarioOrder(item.orderId));
    }
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
    }).format(new Date());
    const scenarios = [
      [
        'Amanda Pratama',
        'Cluster Anggrek 2 Blok B No. 15, Bintaro, Tangerang Selatan',
        'Deep Cleaning Rumah 2 Lantai',
        '13.30–16.30 WIB',
        'Anjing di halaman samping sudah dikandangkan. Fokus pada kamar utama dan dapur.',
      ],
      [
        'Bagas Wicaksono',
        'Jl. Melati No. 28, Kebayoran Baru, Jakarta Selatan',
        'Cuci Sofa & Kasur',
        '09.00–11.00 WIB',
        'Bersihkan sofa ruang keluarga dan kasur kamar utama. Skenario uji: pengiriman link pertama gagal.',
      ],
      [
        'Citra Lestari',
        'Ruko Permata Blok C4, Bekasi',
        'Pembersihan Kantor',
        '15.00–17.00 WIB',
        'Koordinasikan akses dengan resepsionis. Skenario uji: pengiriman laporan pertama gagal.',
      ],
    ];
    scenarios.forEach(([name, address, service, time, notes], index) => {
      const suffix = String(index + 1).padStart(2, '0');
      const customerId = 'DEMO-CUS-' + suffix,
        staffId = 'DEMO-PT-' + suffix,
        orderId = 'DEMO-ORD-' + suffix;
      if (!store.entities.customers.some((item) => item.id === customerId))
        store.entities.customers.push({
          id: customerId,
          name: '' + name,
          address,
          ...sampleContact('customer', index + 1, name),
          joined: today,
          active: true,
          isDemo: true,
        });
      if (!store.entities.staff.some((item) => item.id === staffId))
        store.entities.staff.push({
          id: staffId,
          name: '' + ['Raka Saputra', 'Dina Rahma', 'Fajar Hidayat'][index],
          phone: sampleContact(
            'staff',
            index + 1,
            ['Raka Saputra', 'Dina Rahma', 'Fajar Hidayat'][index],
          ).phone,
          skills: ['Deep Cleaning', 'Sanitasi'],
          area: ['Tangerang Selatan', 'Jakarta Selatan', 'Bekasi'][index],
          status: 'Tersedia',
          isDemo: true,
        });
      if (!store.entities.orders.some((item) => item.id === orderId))
        store.entities.orders.push({
          id: orderId,
          customerId,
          customer: '' + name,
          address,
          service,
          date: today,
          time,
          price: [300000, 180000, 450000][index],
          staff: [],
          status: 'Menunggu Assign',
          notes,
          isDemo: true,
        });
    });
    return {
      orders: store.entities.orders.length,
      message: reset
        ? 'Data uji diulang. Link tugas lama tidak berlaku.'
        : 'Tiga pesanan uji siap. Data yang sudah ada dipertahankan.',
    };
  });
}
export async function demoRecords(resource: Resource): Promise<RecordData[]> {
  if (!demoEnabled() || !['orders', 'staff', 'customers'].includes(resource))
    return [];
  return demoTransaction((store) =>
    structuredClone(store.entities[resource as keyof Store['entities']]),
  );
}
export async function demoMutation(
  resource: Resource,
  id: string,
  method: string,
  body?: Record<string, unknown>,
) {
  return demoTransaction((store) => {
    if (!['orders', 'staff', 'customers'].includes(resource))
      throw new TaskError('Data uji tidak ditemukan.', 404);
    const records = store.entities[
      resource as keyof Store['entities']
    ] as RecordData[];
    const index = records.findIndex((item) => item.id === id);
    if (index < 0) throw new TaskError('Data uji tidak ditemukan.', 404);
    if (method === 'GET') return { data: structuredClone(records[index]) };
    if (method === 'DELETE') {
      if (adminDemoEnabled() && store.admin)
        recordDemoAudit(
          store.admin,
          'delete',
          resource,
          id,
          records[index],
          null,
        );
      records.splice(index, 1);
      store.tasks = store.tasks.filter(
        (task) => task.orderId !== id && task.staffId !== id,
      );
      return { message: 'Data uji dihapus.' };
    }
    if (method !== 'PATCH' || !body)
      throw new TaskError('Operasi data uji tidak didukung.', 405);
    const current = records[index];
    const updated: RecordData = {
      ...current,
      ...body,
      id,
      isDemo: true,
      ...(resource === 'orders' ? { updatedAt: new Date().toISOString() } : {}),
    };
    if (
      resource === 'orders' &&
      current.status === 'Selesai' &&
      updated.status !== 'Selesai'
    ) {
      delete updated.startedAt;
      delete updated.completedAt;
      delete updated.started_at;
      delete updated.completed_at;
    }
    if (
      resource === 'orders' &&
      store.admin &&
      ['Menunggu Lokasi', 'Menuju Lokasi', 'Sedang Dikerjakan'].includes(
        String(updated.status),
      ) &&
      ['staff', 'date', 'time', 'status'].some((field) =>
        Object.hasOwn(body, field),
      )
    ) {
      for (const name of (updated as Order).staff) {
        const person = store.entities.staff.find(
          (person) => person.name === name,
        );
        const issue = person
          ? assignmentIssue(
              person,
              updated as Order,
              store.admin.records.schedules as Schedule[],
              store.entities.orders,
            )
          : 'Petugas tidak terdaftar.';
        if (issue) throw new TaskError(name + ': ' + issue, 409);
      }
    }
    records[index] = updated;
    if (resource === 'orders') {
      store.tasks = store.tasks.filter(
        (task) =>
          task.orderId !== id ||
          (Array.isArray(updated.staff) &&
            updated.staff.includes(
              store.entities.staff.find((person) => person.id === task.staffId)
                ?.name,
            ) &&
            !['Menunggu Assign', 'Batal'].includes(String(updated.status)) &&
            !(current.status === 'Selesai' && updated.status !== 'Selesai')),
      );
      if (updated.status === 'Selesai') {
        const now = new Date().toISOString();
        for (const task of store.tasks.filter((item) => item.orderId === id)) {
          task.stage = 'completed';
          task.completedAt ??= now;
          task.updatedAt = now;
        }
      }
      if (
        updated.status !== current.status &&
        ['Menuju Lokasi', 'Sedang Dikerjakan'].includes(String(updated.status))
      ) {
        const now = new Date().toISOString();
        for (const task of store.tasks.filter((item) => item.orderId === id)) {
          if (task.stage === 'completed') continue;
          if (updated.status === 'Menuju Lokasi' && task.stage === 'assigned') {
            task.stage = 'en_route';
            task.departedAt ??= now;
          } else if (updated.status === 'Sedang Dikerjakan') {
            task.stage = 'working';
            task.startedAt ??= now;
          }
          task.updatedAt = now;
        }
      }
    }
    if (adminDemoEnabled() && store.admin)
      recordDemoAudit(
        store.admin,
        resource === 'orders' && Object.hasOwn(body, 'staff')
          ? 'assign'
          : 'update',
        resource,
        id,
        current,
        updated,
      );
    return { data: structuredClone(updated) };
  });
}
function tokenFor(store: Store, task: StoredTask) {
  const payload = Buffer.from(
    JSON.stringify({ v: 1, id: task.id, exp: Date.parse(task.expiresAt) }),
  ).toString('base64url');
  return (
    'demo.' +
    payload +
    '.' +
    createHmac('sha256', store.secret).update(payload).digest('base64url')
  );
}
function resolveTask(store: Store, token: string) {
  const [prefix, payload, signature, ...rest] = token.split('.');
  if (
    prefix !== 'demo' ||
    !payload ||
    !signature ||
    rest.length ||
    token.length > 700
  )
    throw new TaskError('Link tugas tidak berlaku.', 403);
  const expected = createHmac('sha256', store.secret).update(payload).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (
    actual.toString('base64url') !== signature ||
    actual.length !== expected.length ||
    !timingSafeEqual(expected, actual)
  )
    throw new TaskError('Link tugas tidak berlaku.', 403);
  let data: { v: number; id: string; exp: number };
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    throw new TaskError('Link tugas tidak berlaku.', 403);
  }
  if (data.v !== 1 || !Number.isFinite(data.exp) || data.exp < Date.now())
    throw new TaskError(
      'Link tugas sudah kedaluwarsa. Minta link baru kepada admin.',
      410,
    );
  const task = store.tasks.find(
    (item) => item.id === data.id && Date.parse(item.expiresAt) === data.exp,
  );
  if (!task) throw new TaskError('Link tugas tidak berlaku.', 403);
  const order = store.entities.orders.find((item) => item.id === task.orderId);
  const staff = store.entities.staff.find((item) => item.id === task.staffId);
  if (
    !order ||
    !staff ||
    !order.staff.includes(staff.name) ||
    order.status === 'Batal'
  )
    throw new TaskError(
      'Penugasan telah berubah atau dibatalkan. Hubungi admin.',
      403,
    );
  return { task, order, staff };
}
function dto(store: Store, task: StoredTask): CleanerTask {
  for (const field of ['linkDelivery', 'reportDelivery'] as const)
    if (
      task[field].status === 'sending' &&
      Date.now() - Date.parse(task[field].updatedAt || '') > 30000
    )
      task[field] = {
        ...task[field],
        status: 'failed',
        message: 'Pengiriman terputus. Data tetap tersimpan; coba kirim ulang.',
      };
  const order = store.entities.orders.find((item) => item.id === task.orderId)!;
  const staff = store.entities.staff.find((item) => item.id === task.staffId)!;
  return {
    ...structuredClone(task),
    customer: order.customer,
    customerPhone:
      store.entities.customers.find(
        (customer) =>
          customer.id === order.customerId || customer.name === order.customer,
      )?.phone ?? '',
    address: order.address,
    date: order.date,
    time: order.time,
    service: order.service,
    notes: order.notes,
    orderStatus: order.status,
    staffName: staff.name,
    demo: true,
  };
}
export async function issueDemoTasks(orderId: string) {
  return demoTransaction((store) => {
    const order = store.entities.orders.find((item) => item.id === orderId);
    if (
      !order ||
      !order.staff.length ||
      ['Batal', 'Menunggu Assign'].includes(order.status)
    )
      throw new TaskError('Pesanan belum ditugaskan.', 409);
    return order.staff.map((name) => {
      const staff = store.entities.staff.find((item) => item.name === name);
      if (!staff)
        throw new TaskError(
          'Petugas yang dipilih tidak ditemukan untuk penugasan ini.',
          400,
        );
      let task = store.tasks.find(
        (item) => item.orderId === orderId && item.staffId === staff.id,
      );
      if (!task && order.status === 'Selesai')
        throw new TaskError(
          'Pesanan selesai tidak memiliki catatan tugas petugas. Halaman tugas baru tidak dibuat untuk pesanan historis.',
          409,
        );
      if (task && Date.parse(task.expiresAt) <= Date.now())
        task.expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
      if (!task) {
        store.tasks = store.tasks.filter(
          (item) => !(item.orderId === orderId && item.staffId === staff.id),
        );
        task = {
          id: randomUUID(),
          orderId,
          staffId: staff.id,
          stage: 'assigned',
          updatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
          photos: [],
          linkDelivery: newDelivery(),
          reportDelivery: newDelivery(),
        };
        store.tasks.push(task);
      }
      return {
        task: dto(store, task),
        publicPath: '/tugas/' + tokenFor(store, task),
      };
    });
  });
}
export async function demoTaskByToken(token: string) {
  return demoTransaction((store) => dto(store, resolveTask(store, token).task));
}
export async function demoTaskSummaries() {
  return demoTransaction((store) =>
    store.tasks
      .filter(
        (task) =>
          store.entities.orders.some(
            (order) => order.id === task.orderId && order.status !== 'Batal',
          ) && Date.parse(task.expiresAt) > Date.now(),
      )
      .map((task) => ({
        task: dto(store, task),
        publicPath: '/tugas/' + tokenFor(store, task),
      })),
  );
}
export async function sendDemo(
  taskId: string,
  kind: 'link' | 'report',
  force = false,
) {
  const field = kind === 'link' ? 'linkDelivery' : 'reportDelivery';
  const attempt = await demoTransaction((store) => {
    const task = store.tasks.find((item) => item.id === taskId);
    if (!task) throw new TaskError('Tugas tidak ditemukan.', 404);
    resolveTask(store, tokenFor(store, task));
    if (kind === 'report' && (task.stage !== 'completed' || !task.report))
      throw new TaskError('Laporan belum disimpan.', 409);
    const delivery = task[field];
    if (delivery.status === 'sending') return null;
    if (delivery.status === 'simulated' && !force) return null;
    const attempts = delivery.attempts + 1;
    task[field] = {
      status: 'sending',
      mode: 'simulation',
      attempts,
      updatedAt: new Date().toISOString(),
    };
    return attempts;
  });
  if (attempt !== null) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    await demoTransaction((store) => {
      const task = store.tasks.find((item) => item.id === taskId);
      if (
        !task ||
        task[field].attempts !== attempt ||
        task[field].status !== 'sending'
      )
        return;
      const failed =
        attempt === 1 &&
        ((kind === 'link' && task.orderId === 'DEMO-ORD-02') ||
          (kind === 'report' && task.orderId === 'DEMO-ORD-03'));
      task[field] = {
        status: failed ? 'failed' : 'simulated',
        mode: 'simulation',
        attempts: attempt,
        updatedAt: new Date().toISOString(),
        message: failed
          ? 'Kegagalan pengiriman uji. Data tetap tersimpan; coba kirim ulang.'
          : 'Simulasi berhasil. Tidak ada pesan atau nomor sungguhan yang dihubungi.',
      };
    });
  }
}
export async function demoEvent(token: string, input: Record<string, unknown>) {
  return demoTransaction(async (store) => {
    const { task, order, staff } = resolveTask(store, token);
    const now = new Date().toISOString();
    if (input.kind === 'depart' && task.stage === 'assigned') {
      task.stage = 'en_route';
      task.departedAt = now;
    } else if (input.kind === 'arrive' && task.stage === 'en_route') {
      task.stage = 'working';
      task.arrivedAt = now;
      task.startedAt = now;
    } else if (input.kind === 'complete' && task.stage !== 'completed') {
      if (task.stage !== 'working')
        throw new TaskError(
          'Konfirmasikan tiba dan mulai pengerjaan dahulu.',
          409,
        );
      const summary =
        typeof input.summary === 'string' ? input.summary.trim() : '';
      if (
        summary.length < 10 ||
        summary.length > 2000 ||
        input.checked !== true
      )
        throw new TaskError(
          'Isi ringkasan pekerjaan 10–2000 karakter dan konfirmasi pemeriksaan hasil.',
          400,
        );
      task.report = { summary, checked: true };
      task.stage = 'completed';
      task.completedAt = now;
    } else if (input.kind === 'remove_photo') {
      if (task.stage !== 'working')
        throw new TaskError(
          'Foto pada laporan selesai tidak dapat diubah.',
          409,
        );
      const photo = task.photos.find((item) => item.id === input.photoId);
      if (photo) {
        await unlink(path.join(directory(), 'photos', photo.id)).catch(
          (error) => {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
          },
        );
        task.photos = task.photos.filter((item) => item.id !== photo.id);
      }
    } else if (input.kind === 'location') {
      if (task.stage === 'completed')
        throw new TaskError('Tugas telah selesai.', 409);
      const { latitude, longitude } = input;
      if (
        typeof latitude !== 'number' ||
        !Number.isFinite(latitude) ||
        Math.abs(latitude) > 90 ||
        typeof longitude !== 'number' ||
        !Number.isFinite(longitude) ||
        Math.abs(longitude) > 180
      )
        throw new TaskError('Lokasi tidak valid.');
      task.location = { latitude, longitude, updatedAt: now };
    } else if (!['depart', 'arrive', 'complete'].includes(String(input.kind)))
      throw new TaskError('Tindakan tidak tersedia.', 400);
    else if (input.kind === 'arrive' && task.stage === 'assigned')
      throw new TaskError('Tekan Berangkat Sekarang dahulu.', 409);
    task.updatedAt = now;
    order.updatedAt = now;
    const all = store.tasks.filter((item) => item.orderId === order.id);
    order.status =
      all.length === order.staff.length &&
      all.every((item) => item.stage === 'completed')
        ? 'Selesai'
        : all.some((item) => ['working', 'completed'].includes(item.stage))
          ? 'Sedang Dikerjakan'
          : all.some((item) => item.stage === 'en_route')
            ? 'Menuju Lokasi'
            : 'Menunggu Lokasi';
    if (
      order.status === 'Selesai' &&
      all.every(
        (item) =>
          Number.isFinite(Date.parse(item.startedAt || '')) &&
          Number.isFinite(Date.parse(item.completedAt || '')),
      )
    ) {
      order.startedAt = new Date(
        Math.min(...all.map((item) => Date.parse(item.startedAt!))),
      ).toISOString();
      order.completedAt = new Date(
        Math.max(...all.map((item) => Date.parse(item.completedAt!))),
      ).toISOString();
    }
    if (['Tersedia', 'Bertugas'].includes(staff.status)) {
      const busy = store.tasks.some(
        (item) =>
          item.staffId === staff.id &&
          ['en_route', 'working'].includes(item.stage) &&
          store.entities.orders.some(
            (job) =>
              job.id === item.orderId &&
              !['Selesai', 'Batal'].includes(job.status),
          ),
      );
      staff.status = busy ? 'Bertugas' : 'Tersedia';
    }
    return dto(store, task);
  });
}
export async function demoUpload(token: string, file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const png = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg =
    bytes.length > 3 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255;
  if (file.size > 2 * 1024 * 1024 || !file.size || (!png && !jpeg))
    throw new TaskError('Gunakan JPG atau PNG asli, maksimal 2 MB per foto.');
  return demoTransaction(async (store) => {
    const { task } = resolveTask(store, token);
    if (task.stage !== 'working' || task.photos.length >= 3)
      throw new TaskError(
        'Foto hanya dapat ditambah saat pengerjaan, maksimal 3 foto.',
        409,
      );
    const photo = { id: randomUUID(), type: png ? 'image/png' : 'image/jpeg' };
    const dir = path.join(directory(), 'photos');
    await mkdir(dir, { recursive: true });
    await open(path.join(dir, photo.id), 'wx', 0o600).then(async (handle) => {
      try {
        await handle.writeFile(bytes);
      } finally {
        await handle.close();
      }
    });
    task.photos.push(photo);
    task.updatedAt = new Date().toISOString();
    return dto(store, task);
  });
}
export async function demoPhoto(token: string, id: string) {
  await demoTransaction((store) => {
    if (!resolveTask(store, token).task.photos.some((photo) => photo.id === id))
      throw new TaskError('Foto tidak tersedia.', 404);
  });
  return readFile(path.join(directory(), 'photos', id));
}
export const tokenHash = (token: string) =>
  createHash('sha256').update(token).digest('hex');
