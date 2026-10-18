import 'server-only';
import { request, ApiError, list } from '@/lib/api';
import type { Order, Staff } from '@/types';
import type {
  AdminCleanerTask,
  CleanerTask,
  Delivery,
  TaskBoard,
} from '@/types/cleaner';
import {
  demoEnabled,
  demoTaskByToken,
  demoEvent,
  demoTaskSummaries,
  issueDemoTasks,
  isDemoId,
  sendDemo,
  demoUpload,
  demoPhoto,
  tokenHash,
} from './demo-store';
import { TaskError } from './errors';
import { whatsappLink } from '@/lib/whatsapp';
import { withOrderWorkTimes, type WorkRecord } from '@/lib/order-work-times';

function validateTask(task: CleanerTask): CleanerTask {
  if (
    !task ||
    typeof task.id !== 'string' ||
    typeof task.orderId !== 'string' ||
    typeof task.staffName !== 'string' ||
    !['assigned', 'en_route', 'working', 'completed'].includes(task.stage) ||
    !Array.isArray(task.photos)
  )
    throw new TaskError('Respons halaman tugas tidak valid.', 502);
  for (const delivery of [task.linkDelivery, task.reportDelivery]) {
    if (
      !delivery ||
      ![
        'not_sent',
        'sending',
        'sent',
        'failed',
        'simulated',
        'manual_ready',
      ].includes(delivery.status)
    )
      throw new TaskError('Status pengiriman tidak valid.', 502);
    if (
      delivery.status === 'sent' &&
      (!delivery.providerMessageId || delivery.mode !== 'chatbot')
    )
      throw new TaskError('Konfirmasi pengiriman chatbot belum tersedia.', 502);
    if (
      delivery.draftUrl &&
      !/^https:\/\/wa\.me\/\d+(?:\?text=|$)/.test(delivery.draftUrl)
    )
      delete delivery.draftUrl;
    if (task.demo === true || delivery.mode === 'simulation')
      delete delivery.draftUrl;
  }
  const text = (value: unknown, max = 3000) =>
    typeof value === 'string' ? value.slice(0, max) : '';
  if (
    !Number.isFinite(Date.parse(task.date)) ||
    !Number.isFinite(Date.parse(task.expiresAt))
  )
    throw new TaskError('Jadwal tugas tidak valid.', 502);
  if (Date.parse(task.expiresAt) <= Date.now())
    throw new TaskError(
      'Link tugas sudah kedaluwarsa. Minta link baru kepada admin.',
      410,
    );
  const stageTime =
    task.stage === 'completed'
      ? task.completedAt
      : task.stage === 'working'
        ? task.startedAt
        : task.stage === 'en_route'
          ? task.departedAt
          : undefined;
  if (
    task.stage !== 'assigned' &&
    !Number.isFinite(Date.parse(stageTime || ''))
  )
    throw new TaskError(
      'Waktu tahap tugas belum tersedia dari layanan data.',
      502,
    );
  const delivery = (value: Delivery): Delivery => ({
    status: value.status,
    mode: ['simulation', 'manual', 'chatbot'].includes(value.mode)
      ? value.mode
      : 'manual',
    attempts: Number.isSafeInteger(value.attempts) ? value.attempts : 0,
    updatedAt: text(value.updatedAt, 50) || undefined,
    message: text(value.message, 1000) || undefined,
    providerMessageId: text(value.providerMessageId, 200) || undefined,
    draftUrl: value.draftUrl,
  });
  const reportDelivery = delivery(task.reportDelivery);
  // The report recipient always comes from this order, never an arbitrary draft URL.
  reportDelivery.draftUrl =
    task.demo !== true &&
    reportDelivery.mode !== 'simulation' &&
    task.stage === 'completed' &&
    task.report &&
    reportDelivery.status !== 'sent'
      ? (whatsappLink(
          text(task.customerPhone, 40),
          [
            'Halo ' +
              text(task.customer, 200) +
              ', berikut laporan CleanGo untuk pesanan #' +
              task.orderId +
              '.',
            'Layanan: ' + text(task.service, 300),
            'Petugas: ' + text(task.staffName, 200),
            'Selesai: ' +
              new Date(task.completedAt!).toLocaleString('id-ID', {
                timeZone: 'Asia/Jakarta',
              }) +
              ' WIB',
            text(task.report.summary, 2000),
            task.photos.length
              ? 'Foto bukti tersimpan bersama laporan. Foto dapat dilampirkan oleh petugas secara manual.'
              : '',
          ]
            .filter(Boolean)
            .join('\n\n'),
        ) ?? undefined)
      : undefined;
  // Public pages receive this allowlist, never the backend's full object.
  return {
    id: task.id,
    orderId: task.orderId,
    staffId: text(task.staffId, 150),
    staffName: text(task.staffName, 200),
    customer: text(task.customer, 200),
    customerPhone: text(task.customerPhone, 40),
    address: text(task.address),
    date: task.date,
    time: text(task.time, 100),
    service: text(task.service, 300),
    notes: text(task.notes),
    orderStatus: text(task.orderStatus, 80),
    stage: task.stage,
    demo: task.demo === true,
    departedAt: text(task.departedAt, 50) || undefined,
    arrivedAt: text(task.arrivedAt, 50) || undefined,
    startedAt: text(task.startedAt, 50) || undefined,
    completedAt: text(task.completedAt, 50) || undefined,
    updatedAt: text(task.updatedAt, 50),
    expiresAt: task.expiresAt,
    photos: task.photos
      .slice(0, 3)
      .filter(
        (photo) =>
          photo &&
          /^[a-zA-Z0-9_-]{1,100}$/.test(photo.id) &&
          ['image/png', 'image/jpeg'].includes(photo.type),
      )
      .map((photo) => ({ id: photo.id, type: photo.type })),
    report: task.report
      ? {
          summary: text(task.report.summary, 2000),
          checked: task.report.checked === true,
        }
      : undefined,
    linkDelivery: delivery(task.linkDelivery),
    reportDelivery,
    location:
      task.location &&
      Number.isFinite(task.location.latitude) &&
      Number.isFinite(task.location.longitude)
        ? {
            latitude: task.location.latitude,
            longitude: task.location.longitude,
            updatedAt: text(task.location.updatedAt, 50),
          }
        : undefined,
  };
}
async function publicRequest<T>(
  token: string,
  path = '',
  options: RequestInit = {},
): Promise<T> {
  if (!token || token.length > 2000 || /[\s\u0000-\u001f]/.test(token))
    throw new TaskError('Link tugas tidak berlaku.', 403);
  const base = process.env.API_URL;
  if (!base) throw new TaskError('Layanan halaman tugas belum tersedia.', 503);
  let response: Response;
  try {
    response = await fetch(base.replace(/\/$/, '') + '/cleaner-task' + path, {
      ...options,
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: 'Bearer ' + token,
        ...(!(options.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new TaskError('Layanan tugas belum dapat dihubungi. Coba lagi.', 503);
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new TaskError('Respons layanan tugas tidak valid.', 502);
  }
  if (!response.ok)
    throw new TaskError(
      typeof data.message === 'string'
        ? data.message
        : 'Link tugas tidak tersedia.',
      response.status,
    );
  return data.data as T;
}
export async function getCleanerTask(token: string) {
  return validateTask(
    token.startsWith('demo.')
      ? await demoTaskByToken(token)
      : await publicRequest<CleanerTask>(token),
  );
}
export async function cleanerEvent(
  token: string,
  input: Record<string, unknown>,
) {
  if (
    typeof input.key !== 'string' ||
    !/^[a-zA-Z0-9_-]{8,100}$/.test(input.key)
  )
    throw new TaskError('ID tindakan tidak valid. Muat ulang halaman.');
  if (token.startsWith('demo.')) {
    if (input.kind === 'retry_report') {
      const task = await getCleanerTask(token);
      await sendDemo(task.id, 'report');
      return getCleanerTask(token);
    }
    const task = await demoEvent(token, input);
    if (
      input.kind === 'complete' &&
      task.reportDelivery.status === 'not_sent'
    ) {
      try {
        await sendDemo(task.id, 'report');
      } catch {
        /* The saved completion remains valid; retry stays available. */
      }
    }
    return getCleanerTask(token);
  }
  return validateTask(
    await publicRequest<CleanerTask>(token, '/events', {
      method: 'POST',
      headers: { 'Idempotency-Key': input.key },
      body: JSON.stringify(input),
    }),
  );
}
export async function cleanerUpload(token: string, file: File) {
  if (token.startsWith('demo.')) return demoUpload(token, file);
  const form = new FormData();
  form.set('file', file);
  return validateTask(
    await publicRequest<CleanerTask>(token, '/photos', {
      method: 'POST',
      body: form,
    }),
  );
}
export async function cleanerPhoto(token: string, id: string) {
  const task = await getCleanerTask(token);
  const photo = task.photos.find((item) => item.id === id);
  if (!photo || !/^[a-zA-Z0-9_-]{1,100}$/.test(id))
    throw new TaskError('Foto tidak tersedia.', 404);
  if (task.demo) return { bytes: await demoPhoto(token, id), type: photo.type };
  const response = await fetch(
    process.env.API_URL!.replace(/\/$/, '') +
      '/cleaner-task/photos/' +
      encodeURIComponent(id),
    {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    },
  );
  const type = response.headers.get('content-type')?.split(';')[0];
  if (!response.ok || !['image/png', 'image/jpeg'].includes(type || ''))
    throw new TaskError('Foto tidak tersedia.', 404);
  return { bytes: new Uint8Array(await response.arrayBuffer()), type: type! };
}
export async function dispatchAssignment(order: Order) {
  if (
    !order.staff.length ||
    ['Menunggu Assign', 'Batal', 'Selesai'].includes(order.status)
  )
    return 'none';
  try {
    if (isDemoId(order.id)) {
      const tasks = await issueDemoTasks(order.id);
      for (const item of tasks)
        if (item.task.linkDelivery.status === 'not_sent')
          await sendDemo(item.task.id, 'link');
      const current = (await demoTaskSummaries()).filter(
        (item) => item.task.orderId === order.id,
      );
      return current.some((item) => item.task.linkDelivery.status === 'failed')
        ? 'failed'
        : 'simulation';
    }
    await request(
      '/orders/' + encodeURIComponent(order.id) + '/cleaner-tasks',
      {
        method: 'POST',
        headers: {
          'Idempotency-Key':
            'assignment-' +
            tokenHash(order.id + '|' + [...order.staff].sort().join('|')),
        },
        body: JSON.stringify({}),
      },
    );
    return 'requested';
  } catch {
    return 'unavailable';
  }
}
export async function adminTaskBoard(origin: string): Promise<TaskBoard> {
  const [orders, staff] = await Promise.all([
    list<Order>('orders'),
    list<Staff>('staff'),
  ]);
  const tasks = demoEnabled() ? await demoTaskSummaries() : [];
  const recordedTimes: WorkRecord[] = tasks.map(({ task }) => task);
  let integrationMessage = '';
  try {
    const response = await request<{
      data: { task: CleanerTask; publicPath: string }[];
    }>('/cleaner-tasks');
    if (!Array.isArray(response.data))
      throw new TaskError('Respons tugas tidak valid.', 502);
    for (const item of response.data) {
      if (
        item.task &&
        typeof item.task.orderId === 'string' &&
        typeof item.task.staffName === 'string'
      )
        recordedTimes.push(item.task);
      try {
        const task = validateTask(item.task);
        if (!/^\/tugas\/[a-zA-Z0-9._~-]+$/.test(item.publicPath))
          throw new TaskError('Tautan tugas tidak valid.', 502);
        tasks.push({ task, publicPath: item.publicPath });
      } catch (error) {
        if (!(error instanceof TaskError)) throw error;
        integrationMessage =
          'Sebagian link tugas belum tersedia. Catatan waktu pengerjaan tetap ditampilkan jika lengkap.';
      }
    }
  } catch (error) {
    if (!(error instanceof ApiError) && !(error instanceof TaskError))
      throw error;
    integrationMessage =
      'Chatbot/halaman tugas pada API tim belum tersedia. Data [UJI] memakai simulasi tersimpan; pesan sungguhan tidak dikirim.';
  }
  const timedOrders = await withOrderWorkTimes(orders, recordedTimes);
  const items: AdminCleanerTask[] = timedOrders
    .filter(
      (order) =>
        Array.isArray(order.staff) &&
        order.staff.length &&
        order.status !== 'Batal',
    )
    .flatMap((order) =>
      order.staff.map((name) => {
        const person = staff.find((item) => item.name === name);
        const record = tasks.find(
          (item) =>
            item.task.orderId === order.id && item.task.staffName === name,
        );
        return {
          orderId: order.id,
          customer: order.customer,
          staffName: name,
          staffId: person?.id,
          service: order.service,
          address: order.address,
          destinationLocation:
            Number.isFinite(order.latitude) && Number.isFinite(order.longitude)
              ? {
                  latitude: Number(order.latitude),
                  longitude: Number(order.longitude),
                }
              : undefined,
          date: order.date,
          time: order.time,
          startedAt: order.startedAt ?? order.started_at,
          completedAt: order.completedAt ?? order.completed_at,
          orderStatus: order.status,
          demo: isDemoId(order.id),
          ...record,
          linkDelivery:
            record?.task.linkDelivery ??
            ({ status: 'not_sent', mode: 'manual', attempts: 0 } as Delivery),
        };
      }),
    );
  const configured = process.env.APP_PUBLIC_URL;
  let publicOrigin = origin;
  if (configured) {
    try {
      const url = new URL(configured);
      if (['https:', 'http:'].includes(url.protocol)) publicOrigin = url.origin;
    } catch {
      /* Keep same-origin preview links. */
    }
  }
  for (const item of items) {
    if (
      item.demo ||
      item.linkDelivery.mode === 'simulation' ||
      !item.publicPath ||
      item.linkDelivery.status === 'sent'
    )
      continue;
    const person = staff.find((record) => record.name === item.staffName);
    item.linkDelivery.draftUrl = person?.phone
      ? (whatsappLink(
          person.phone,
          [
            'Halo ' +
              item.staffName +
              ', ada tugas CleanGo untuk pesanan #' +
              item.orderId +
              '.',
            item.service + ' · ' + item.date + ' · ' + item.time,
            'Buka halaman tugas: ' + publicOrigin + item.publicPath,
            'Gunakan link ini hanya untuk penugasan Anda.',
          ].join('\n\n'),
        ) ?? undefined)
      : undefined;
  }
  return {
    revision: tokenHash(
      JSON.stringify({
        orders: timedOrders,
        staff,
        tasks: tasks.map(({ task }) => task),
      }),
    ),
    items,
    demoEnabled: demoEnabled(),
    staff: staff.map(({ id, name, status }) => ({ id, name, status })),
    publicOrigin,
    integrationMessage,
  };
}
export async function resendAdmin(orderId: string, staffName: string) {
  const orders = await list<Order>('orders');
  const order = orders.find(
    (item) => item.id === orderId && item.staff.includes(staffName),
  );
  if (!order) throw new TaskError('Penugasan tidak ditemukan.', 404);
  if (isDemoId(orderId)) {
    const tasks = await issueDemoTasks(orderId);
    const record = tasks.find((item) => item.task.staffName === staffName);
    if (!record) throw new TaskError('Petugas tidak ditemukan.', 404);
    await sendDemo(record.task.id, 'link', true);
    return;
  }
  await request('/orders/' + encodeURIComponent(orderId) + '/cleaner-tasks', {
    method: 'POST',
    body: JSON.stringify({ staffName, resend: true }),
  });
}
const limits = new Map<string, { count: number; until: number }>();
export function rateLimit(token: string) {
  const key = tokenHash(token),
    now = Date.now(),
    entry = limits.get(key);
  if (entry && entry.until > now) {
    if (entry.count++ > 90)
      throw new TaskError('Terlalu banyak permintaan. Tunggu sebentar.', 429);
  } else {
    if (limits.size > 10000) limits.clear();
    limits.set(key, { count: 1, until: now + 60000 });
  }
}
