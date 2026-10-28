import type { Service } from '@/types';

export function serviceSkillOptions(
  services: Pick<Service, 'name'>[],
): string[] {
  return [
    ...new Set(services.map((service) => service.name.trim()).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, 'id'));
}
