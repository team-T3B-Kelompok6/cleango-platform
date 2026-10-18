import 'server-only';
import { cache } from 'react';
import { ApiError, request } from '@/lib/api';
import { demoEnabled, demoTaskSummaries } from '@/lib/cleaner/demo-store';
import { adminDemoEnabled } from '@/lib/demo/mode';
import { workTimeRange } from '@/lib/order-flow';
import type { RecordData } from '@/types';

export type WorkRecord = {
  orderId: string;
  staffName: string;
  stage: string;
  startedAt?: string;
  completedAt?: string;
  departedAt?: string;
  arrivedAt?: string;
  updatedAt?: string;
};

const workRecords = cache(async (): Promise<WorkRecord[]> => {
  const records: WorkRecord[] = demoEnabled()
    ? (await demoTaskSummaries()).map(({ task }) => task)
    : [];
  if (adminDemoEnabled()) return records;
  try {
    const response = await request<{ data: { task: WorkRecord }[] }>(
      '/cleaner-tasks',
    );
    if (Array.isArray(response.data))
      for (const item of response.data) {
        const task = item?.task;
        if (
          task &&
          typeof task.orderId === 'string' &&
          typeof task.staffName === 'string' &&
          ['assigned', 'en_route', 'working', 'completed'].includes(task.stage)
        )
          records.push(task);
      }
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    // Booking times remain available when work records are not provided yet.
  }
  return records;
});

export async function withOrderWorkTimes<T extends RecordData>(
  orders: T[],
  providedRecords?: WorkRecord[],
): Promise<T[]> {
  if (!orders.length) return orders;
  const records = providedRecords ?? (await workRecords());
  return orders.map((order) => {
    const crew = Array.isArray(order.staff) ? order.staff : [];
    const related = records.filter(
      (task) => task.orderId === order.id && crew.includes(task.staffName),
    );
    const activity = [
      order.updatedAt,
      order.updated_at,
      ...related.flatMap((task) => [
        task.updatedAt,
        task.departedAt,
        task.arrivedAt,
        task.startedAt,
        task.completedAt,
      ]),
    ]
      .map((value) => Date.parse(String(value ?? '')))
      .filter(Number.isFinite);
    let status = order.status;
    if (
      !['Selesai', 'Batal', 'Menunggu Assign'].includes(String(status)) &&
      related.length
    ) {
      status =
        related.length === crew.length &&
        related.every((task) => task.stage === 'completed')
          ? 'Selesai'
          : related.some((task) =>
                ['working', 'completed'].includes(task.stage),
              )
            ? 'Sedang Dikerjakan'
            : related.some((task) => task.stage === 'en_route')
              ? 'Menuju Lokasi'
              : 'Menunggu Lokasi';
    }
    const result = {
      ...order,
      status,
      staffProgress: related.map(({ staffName, stage }) => ({
        staffName,
        stage,
      })),
      ...(activity.length
        ? { activityAt: new Date(Math.max(...activity)).toISOString() }
        : {}),
    };
    if (status !== 'Selesai' || workTimeRange(result) || !crew.length)
      return result;
    const tasks = crew.map((name) =>
      records.find(
        (task) =>
          task.orderId === order.id &&
          task.staffName === name &&
          task.stage === 'completed' &&
          workTimeRange({ ...task, id: '', status: 'Selesai' }),
      ),
    );
    if (tasks.some((task) => !task)) return result;
    return {
      ...result,
      startedAt: new Date(
        Math.min(...tasks.map((task) => Date.parse(task!.startedAt!))),
      ).toISOString(),
      completedAt: new Date(
        Math.max(...tasks.map((task) => Date.parse(task!.completedAt!))),
      ).toISOString(),
    };
  });
}
