import { catalogRepository, type ServiceFilters } from '../repositories/catalog.repository.js';
import { AppError } from '../utils/app-error.js';

export const catalogService = {
  async categories() {
    const { data, error } = await catalogRepository.categories();
    if (error) throw error;
    return data;
  },
  async services(filters: ServiceFilters) {
    const { data, error, count } = await catalogRepository.services(filters);
    if (error) throw error;
    return {
      items: data,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / filters.limit),
      },
    };
  },
  async serviceById(id: string) {
    const { data, error } = await catalogRepository.serviceById(id);
    if (error || !data) throw new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found');
    return data;
  },
};
