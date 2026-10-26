export type TaskStage = 'assigned' | 'en_route' | 'working' | 'completed';
export type DeliveryStatus =
  'not_sent' | 'sending' | 'sent' | 'failed' | 'simulated' | 'manual_ready';
export interface Delivery {
  status: DeliveryStatus;
  mode: 'simulation' | 'chatbot' | 'manual';
  attempts: number;
  updatedAt?: string;
  message?: string;
  providerMessageId?: string;
  draftUrl?: string;
}
export interface TaskPhoto {
  id: string;
  type: string;
}
export interface CleanerTask {
  id: string;
  orderId: string;
  staffId: string;
  staffName: string;
  customer: string;
  customerPhone: string;
  address: string;
  date: string;
  time: string;
  service: string;
  serviceDurationMinutes?: number;
  estimatedCompletedAt?: string | null;
  notes: string;
  orderStatus: string;
  stage: TaskStage;
  demo: boolean;
  departedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
  expiresAt: string;
  report?: { summary: string; checked: boolean };
  photos: TaskPhoto[];
  linkDelivery: Delivery;
  reportDelivery: Delivery;
  location?: { latitude: number; longitude: number; updatedAt: string };
}
export interface AdminCleanerTask {
  estimatedCompletedAt?: string | null;
  startedAt?: string;
  completedAt?: string;
  orderId: string;
  customer: string;
  staffName: string;
  staffId?: string;
  service: string;
  address: string;
  destinationLocation?: { latitude: number; longitude: number };
  date: string;
  time: string;
  orderStatus: string;
  demo: boolean;
  task?: CleanerTask;
  publicPath?: string;
  linkDelivery: Delivery;
}
export interface TaskBoard {
  revision?: string;
  items: AdminCleanerTask[];
  staff?: { id: string; name: string; status: string }[];
  demoEnabled: boolean;
  publicOrigin: string;
  integrationMessage?: string;
}
export const stageLabels: Record<TaskStage, string> = {
  assigned: 'Siap Berangkat',
  en_route: 'Menuju Lokasi',
  working: 'Sedang Dikerjakan',
  completed: 'Selesai',
};
export const deliveryLabels: Record<DeliveryStatus, string> = {
  not_sent: 'Belum Dikirim',
  sending: 'Sedang Mengirim',
  sent: 'Terkirim',
  failed: 'Gagal Dikirim',
  simulated: 'Berhasil (percobaan)',
  manual_ready: 'Draf Manual Siap',
};
