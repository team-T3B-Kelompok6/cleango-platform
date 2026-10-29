import type { Service } from '@/types';

export function serviceSkillOptions(
  services: Pick<Service, 'name' | 'active'>[],
): string[] {
  return [
    ...new Set(
      services
        .filter((service) => service.active)
        .map((service) => service.name.trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, 'id'));
}
