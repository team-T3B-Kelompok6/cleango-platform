import { logoutAction } from '@/lib/api/logoutAction';
import { DialogBody } from '@/components/ui/DialogBody';
import { DialogTrigger } from '@/components/ui/DialogTrigger';
import { Button } from '@/components/ui/Button';
import { LOGIN_COPY } from '../data/authConstants';

/** Dialog bantuan login; `demo`/`session` dipasok halaman, bukan diambil sendiri. */
export function LoginHelp({
  demo,
  session,
}: {
  demo: boolean;
  session: boolean;
}) {
  return (
    <DialogTrigger
      label={LOGIN_COPY.help.trigger}
      title={LOGIN_COPY.help.title}
      className="min-h-36 rounded-[20px] border border-transparent bg-surface px-15 text-base text-ink-muted transition-colors hover:border-accent-ring hover:text-success"
    >
      <DialogBody>
        <p>{demo ? LOGIN_COPY.help.demo : LOGIN_COPY.help.live}</p>
        {session && (
          <form action={logoutAction}>
            <Button variant="ghost" type="submit">
              {LOGIN_COPY.help.logout}
            </Button>
          </form>
        )}
      </DialogBody>
    </DialogTrigger>
  );
}
