create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger addresses_set_updated_at
  before update on public.addresses
  for each row execute function private.set_updated_at();

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function private.set_updated_at();

create trigger services_set_updated_at
  before update on public.services
  for each row execute function private.set_updated_at();

create trigger cleaners_set_updated_at
  before update on public.cleaners
  for each row execute function private.set_updated_at();

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function private.set_updated_at();

create trigger cleaner_schedules_set_updated_at
  before update on public.cleaner_schedules
  for each row execute function private.set_updated_at();

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function private.set_updated_at();

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function private.set_updated_at();

create trigger ai_conversations_set_updated_at
  before update on public.ai_conversations
  for each row execute function private.set_updated_at();

