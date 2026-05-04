alter type public.activity_event_type add value if not exists 'activity.anomaly';

create or replace function public.prevent_user_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_service_role() then
    if new.role is distinct from old.role then
      raise exception 'role cannot be changed by client users';
    end if;

    if new.status is distinct from old.status then
      raise exception 'status cannot be changed by client users';
    end if;

    if new.deleted_at is distinct from old.deleted_at then
      raise exception 'deleted_at cannot be changed by client users';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_user_privilege_escalation on public.users;
create trigger prevent_user_privilege_escalation
before update on public.users
for each row execute function public.prevent_user_privilege_escalation();

drop policy if exists "activity logs are service insertable" on public.activity_logs;

create policy "activity logs are service insertable"
on public.activity_logs for insert
with check (public.is_service_role());
