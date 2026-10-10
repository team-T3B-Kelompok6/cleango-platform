import { tone } from '@/lib/resources';
export function Badge({ status }: { status: string }) {
  return (
    <span className={'status-badge ' + tone(status)}>
      <i />
      {status}
    </span>
  );
}
