export interface RecordData {
  id: string;
  [key: string]: unknown;
}
export interface Order extends RecordData {
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
  skills?: string[];
  rating?: number;
  name: string;
  area: string;
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
  address?: string;
  customer: string;
  service: string;
  date: string;
  time: string;
  staff: string;
  status: string;
}
export type Resource =
  'orders' | 'services' | 'staff' | 'customers' | 'faqs' | 'schedules';
export type FormState = {
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
}
