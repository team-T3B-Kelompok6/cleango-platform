import { Icon } from '@/components/ui/Icon';
import { SHELL_COPY } from './data';

export function Footer() {
  return (
    <footer className="mx-34 mt-20 flex flex-wrap justify-between gap-4 border-t border-line py-13 text-xs leading-[14px] text-ink-faint max-md:mx-24 max-sm:mx-18 max-sm:mt-10 max-sm:pb-18">
      <span className="flex items-center gap-5">
        <Icon name="engine" />
        Cleango · {SHELL_COPY.footer.note}
      </span>
      <span>{SHELL_COPY.footer.sop}</span>
    </footer>
  );
}
