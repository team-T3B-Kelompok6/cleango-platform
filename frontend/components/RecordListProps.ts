import type { ReactNode } from 'react';
import type { Resource, RecordData } from '@/types';
export interface RecordListProps {
  shown: RecordData[];
  resource: Resource;
  tab: string;
  config: { path: string; singular: string };
  edit: (item: RecordData, label?: string) => ReactNode;
}
