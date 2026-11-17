import { logoutAction } from '@/app/actions';
import { DialogTrigger } from '@/components/shared/ui/DialogTrigger';
import { DialogBody } from '@/components/shared/ui/DialogBody';
import { Button } from '@/components/shared/ui/Button';
import { LOGIN_COPY } from './data';

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
