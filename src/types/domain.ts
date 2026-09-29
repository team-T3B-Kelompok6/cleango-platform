export interface Pagination {
  page: number;
  limit: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination & { total: number; totalPages: number };
}

export interface AuthContext {
  userId: string;
  accessToken: string;
}

export type AddressInput = {
  label: string;
  recipientName: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
};

export type BookingInput = {
  serviceId: string;
  addressId: string;
  bookingDate: string;
  bookingTime: string;
  notes?: string | null;
  promoCode?: string | null;
};
