export interface RecordData {
  id: string;
  [key: string]: unknown;
}
export interface Order extends RecordData {
  latitude?: number | null;
  longitude?: number | null;
  updatedAt?: string;
  activityAt?: string;
  staffProgress?: { staffName: string; stage: string }[];
  startedAt?: string;
  completedAt?: string;
  started_at?: string;
  completed_at?: string;
  createdAt?: string;
  created_at?: string;
  customerId?: string;
  paymentMethod?: string;
  invoiceId?: string;
  customer: string;
  address: string;
  service: string;
  price: number;
  date: string;
  time: string;
  staff: string[];
  status: string;
  notes: string;
}
export interface Service extends RecordData {
  imageUrl?: string | null;
  discountPrice?: number | null;
  packageLabel?: string;
  isFavorite?: boolean;
  name: string;
  category: string;
  duration: string;
  price: number;
  description: string;
  active: boolean;
  features?: string[];
}
export interface Staff extends RecordData {
  photoUrl?: string | null;
  joined?: string;
  skills: string[];
  rating?: number;
  name: string;
  area?: string;
  phone: string;
  status: string;
}
export interface Customer extends RecordData {
  orderCount?: number;
  totalSpent?: number;
  area?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  joined: string;
  active: boolean;
}
export interface Faq extends RecordData {
  viewCount?: number;
  updatedAt?: string;
  category: string;
  question: string;
  answer: string;
  published: boolean;
}
export interface Schedule extends RecordData {
  // Optional legacy booking fields; staff shifts do not require these.
  address?: string;
  customer?: string;
  service?: string;
  date: string;
  time: string;
  staff: string;
  status: string;
}
export type Resource =
  'orders' | 'services' | 'staff' | 'customers' | 'faqs' | 'schedules';
export type FormState = {
  success?: boolean;
  message?: string;
  errors?: Record<string, string>;
  values?: Record<string, string | string[]>;
};
export type Search = Record<string, string | string[] | undefined>;
export interface Field {
  name: string;
  label: string;
  kind?:
    | 'text'
    | 'textarea'
    | 'number'
    | 'date'
    | 'email'
    | 'select'
    | 'boolean'
    | 'multiselect';
  required?: boolean;
  options?: string[];
  emptyMessage?: string;
  optionHints?: Record<string, string>;
  optionPhotos?: Record<string, string | null>;
  recommendedOptions?: string[];
  placeholder?: string;
  hint?: string;
  lines?: boolean;
}

export interface Category extends RecordData {
  name: string;
  resource: 'services' | 'faqs';
  icon?: string | null;
}

export interface Banner extends RecordData {
  imageUrl: string;
}
