import { getServiceClient } from '../config/supabase.js';

export interface ServiceFilters {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
}

export const catalogRepository = {
  categories() {
    return getServiceClient()
      .from('categories')
      .select('id, name, description, icon')
      .eq('is_active', true)
      .order('name');
  },
  services(filters: ServiceFilters) {
    const from = (filters.page - 1) * filters.limit;
    let query = getServiceClient()
      .from('services')
      .select('id, category_id, name, description, price, duration_minutes, image_url, categories!inner(id, name)', { count: 'exact' })
      .eq('is_active', true)
      .eq('categories.is_active', true)
      .order('name')
      .range(from, from + filters.limit - 1);
    if (filters.search) query = query.ilike('name', `%${filters.search}%`);
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
    return query;
  },
  serviceById(id: string) {
    return getServiceClient()
      .from('services')
      .select('id, category_id, name, description, price, duration_minutes, image_url, categories!inner(id, name), service_inclusions(id, description, sort_order)')
      .eq('id', id)
      .eq('is_active', true)
      .eq('categories.is_active', true)
      .order('sort_order', { referencedTable: 'service_inclusions' })
      .single();
  },
};
