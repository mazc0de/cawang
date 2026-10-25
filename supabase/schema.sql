-- =====================================================================================
-- Cawang (Catat Keuangan) — database schema
--
-- Paste the whole file into Supabase → SQL Editor → Run. Safe to re-run: tables are
-- created only when missing, functions/views/policies/triggers are replaced.
-- Domain terms follow GLOSSARY.md; design in docs/spec.md; ADR 0001 (derived balances)
-- and ADR 0002 (Safe-Pay is its own table).
--
-- Errors raised for the app use a stable UPPER_SNAKE code as the message, e.g.
-- SAFE_PAY_EXCEEDS_AVAILABLE; the client maps each code to a translated sentence.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Tables
-- -------------------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  language text not null default 'id' check (language in ('en', 'id')),
  timezone text not null default 'Asia/Jakarta',
  cycle_start_day smallint not null default 1 check (cycle_start_day between 1 and 31),
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Added after v1 launch: amount templates the transaction form offers as one-tap chips.
alter table public.profiles
  add column if not exists amount_presets bigint[] not null default '{5000,10000,20000,50000,100000}';
do $$
begin
  alter table public.profiles add constraint profiles_amount_presets_check
    check (cardinality(amount_presets) <= 8 and 0 < all (amount_presets));
exception when duplicate_object then null;
end $$;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  type text not null check (type in ('bank', 'cash', 'ewallet', 'other')),
  initial_balance bigint not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  type text not null check (type in ('income', 'expense')),
  icon text not null,
  color text not null,
  -- Marks categories the app looks up by role ('admin_fee'), whatever the user renames them to.
  system_key text,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create unique index if not exists categories_user_system_key_idx
  on public.categories (user_id, system_key) where system_key is not null;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount bigint not null check (amount > 0),
  occurred_at timestamptz not null default now(),
  account_id uuid not null,
  to_account_id uuid,
  category_id uuid,
  note text check (note is null or char_length(note) <= 500),
  -- Admin Fee expense → the Transfer it belongs to.
  parent_transaction_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  foreign key (user_id, account_id) references public.accounts (user_id, id),
  foreign key (user_id, to_account_id) references public.accounts (user_id, id),
  foreign key (user_id, category_id) references public.categories (user_id, id),
  foreign key (user_id, parent_transaction_id)
    references public.transactions (user_id, id) on delete cascade,
  check (
    (type = 'transfer' and to_account_id is not null and to_account_id <> account_id
      and category_id is null)
    or (type <> 'transfer' and to_account_id is null and category_id is not null)
  )
);

create index if not exists transactions_user_occurred_idx
  on public.transactions (user_id, occurred_at desc);
create index if not exists transactions_account_idx on public.transactions (account_id);
create index if not exists transactions_to_account_idx on public.transactions (to_account_id);
create index if not exists transactions_category_idx on public.transactions (category_id);
create index if not exists transactions_parent_idx on public.transactions (parent_transaction_id);

create table if not exists public.safe_pays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null,
  category_id uuid not null,
  amount bigint not null check (amount > 0),
  note text check (note is null or char_length(note) <= 500),
  due_date date,
  status text not null default 'pending' check (status in ('pending', 'settled', 'cancelled')),
  transaction_id uuid,
  settled_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (transaction_id),
  foreign key (user_id, account_id) references public.accounts (user_id, id),
  foreign key (user_id, category_id) references public.categories (user_id, id),
  foreign key (user_id, transaction_id)
    references public.transactions (user_id, id) on delete set null (transaction_id),
  check ((status = 'settled') = (transaction_id is not null))
);

create index if not exists safe_pays_user_status_idx on public.safe_pays (user_id, status);
create index if not exists safe_pays_account_idx on public.safe_pays (account_id);

create table if not exists public.recurring_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount bigint not null check (amount > 0),
  account_id uuid not null,
  to_account_id uuid,
  category_id uuid,
  note text check (note is null or char_length(note) <= 500),
  day_of_month smallint not null check (day_of_month between 1 and 31),
  start_date date not null,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  foreign key (user_id, account_id) references public.accounts (user_id, id),
  foreign key (user_id, to_account_id) references public.accounts (user_id, id),
  foreign key (user_id, category_id) references public.categories (user_id, id),
  check (end_date is null or end_date >= start_date),
  check (
    (type = 'transfer' and to_account_id is not null and to_account_id <> account_id
      and category_id is null)
    or (type <> 'transfer' and to_account_id is null and category_id is not null)
  )
);

-- Only resolved occurrences are stored. Pending ones are computed from the template, so a
-- template edit reaches every unconfirmed occurrence. `period` = first day of the due month.
create table if not exists public.recurring_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  template_id uuid not null,
  period date not null check (extract(day from period) = 1),
  due_date date not null,
  status text not null check (status in ('confirmed', 'skipped')),
  transaction_id uuid,
  created_at timestamptz not null default now(),
  unique (template_id, period),
  unique (transaction_id),
  foreign key (user_id, template_id)
    references public.recurring_templates (user_id, id) on delete cascade,
  -- Deleting the Transaction deletes this row: the occurrence is pending again.
  foreign key (user_id, transaction_id)
    references public.transactions (user_id, id) on delete cascade,
  check ((status = 'confirmed') = (transaction_id is not null))
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid not null,
  amount bigint not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id),
  foreign key (user_id, category_id) references public.categories (user_id, id) on delete cascade
);

create table if not exists public.notification_dismissals (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null check (char_length(key) <= 200),
  dismissed_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- -------------------------------------------------------------------------------------
-- 2. Views (ADR 0001: balances are derived, never stored)
-- -------------------------------------------------------------------------------------

create or replace view public.account_balances
with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  a.initial_balance,
  a.initial_balance + coalesce(t.delta, 0) as balance,
  coalesce(s.locked, 0) as locked_funds,
  a.initial_balance + coalesce(t.delta, 0) - coalesce(s.locked, 0) as available_balance
from public.accounts a
left join (
  select account_id, sum(delta)::bigint as delta
  from (
    select account_id, case type when 'income' then amount else -amount end as delta
    from public.transactions
    union all
    select to_account_id, amount from public.transactions where type = 'transfer'
  ) moves
  group by account_id
) t on t.account_id = a.id
left join (
  select account_id, sum(amount)::bigint as locked
  from public.safe_pays
  where status = 'pending'
  group by account_id
) s on s.account_id = a.id;

-- -------------------------------------------------------------------------------------
-- 3. Internal helpers
-- -------------------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Today's date in the profile's timezone.
create or replace function public.user_today(p_user uuid default auth.uid())
returns date language sql stable set search_path = public as $$
  select (now() at time zone coalesce(
    (select timezone from public.profiles where id = p_user), 'Asia/Jakarta'))::date
$$;

create or replace function public.user_local_date(p_at timestamptz, p_user uuid default auth.uid())
returns date language sql stable set search_path = public as $$
  select (p_at at time zone coalesce(
    (select timezone from public.profiles where id = p_user), 'Asia/Jakarta'))::date
$$;

-- The due date of a template in a given month, with days 29–31 clamped to month end.
create or replace function public.clamped_day(p_period date, p_day smallint)
returns date language sql immutable as $$
  select make_date(
    extract(year from p_period)::int,
    extract(month from p_period)::int,
    least(p_day::int, extract(day from (date_trunc('month', p_period) + interval '1 month - 1 day'))::int)
  )
$$;

create or replace function public.assert_category_type(p_user uuid, p_category uuid, p_type text)
returns void language plpgsql stable set search_path = public as $$
begin
  if p_category is null then
    return;
  end if;
  if not exists (
    select 1 from public.categories where user_id = p_user and id = p_category and type = p_type
  ) then
    raise exception 'CATEGORY_TYPE_MISMATCH';
  end if;
end $$;

create or replace function public.account_available_balance(p_account uuid, p_exclude_safe_pay uuid default null)
returns bigint language sql stable set search_path = public as $$
  select b.balance - coalesce((
    select sum(amount) from public.safe_pays
    where account_id = p_account and status = 'pending'
      and (p_exclude_safe_pay is null or id <> p_exclude_safe_pay)
  ), 0)
  from public.account_balances b
  where b.account_id = p_account
$$;

-- Default categories in the signup language. Icons are lucide names; colours are palette keys
-- defined in the app (src/lib/palette.ts).
create or replace function public.seed_default_categories(p_user uuid, p_lang text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.categories (user_id, name, type, icon, color, system_key, sort_order)
  select p_user, case when p_lang = 'en' then name_en else name_id end, type, icon, color, system_key, sort_order
  from (values
    ('Food & Drinks',    'Makan & Minum',      'expense', 'utensils',        'orange', null,        10),
    ('Groceries',        'Belanja Bulanan',    'expense', 'shopping-basket', 'green',  null,        20),
    ('Transport',        'Transportasi',       'expense', 'bus',             'sky',    null,        30),
    ('Bills & Utilities','Tagihan',            'expense', 'receipt',         'blue',   null,        40),
    ('Shopping',         'Belanja',            'expense', 'shopping-bag',    'pink',   null,        50),
    ('Entertainment',    'Hiburan',            'expense', 'clapperboard',    'rose',   null,        60),
    ('Health',           'Kesehatan',          'expense', 'heart-pulse',     'teal',   null,        70),
    ('Education',        'Pendidikan',         'expense', 'graduation-cap',  'lime',   null,        80),
    ('Family & Giving',  'Keluarga & Sedekah', 'expense', 'hand-heart',      'brown',  null,        90),
    ('Admin Fee',        'Biaya Admin',        'expense', 'landmark',        'slate',  'admin_fee', 100),
    ('Other',            'Lainnya',            'expense', 'ellipsis',        'slate',  null,        110),
    ('Salary',           'Gaji',               'income',  'wallet',          'green',  null,        10),
    ('Bonus',            'Bonus',              'income',  'gift',            'teal',   null,        20),
    ('Freelance',        'Freelance',          'income',  'briefcase',       'blue',   null,        30),
    ('Investment',       'Investasi',          'income',  'trending-up',     'lime',   null,        40),
    ('Other',            'Lainnya',            'income',  'ellipsis',        'slate',  null,        50)
  ) as d (name_en, name_id, type, icon, color, system_key, sort_order);
end $$;

-- The Admin Fee category, recreated if the user deleted it while unused.
create or replace function public.admin_fee_category_id()
returns uuid language plpgsql set search_path = public as $$
declare
  v_id uuid;
  v_lang text;
begin
  select id into v_id from public.categories
  where user_id = auth.uid() and system_key = 'admin_fee';
  if v_id is null then
    select language into v_lang from public.profiles where id = auth.uid();
    insert into public.categories (name, type, icon, color, system_key, sort_order)
    values (case when v_lang = 'en' then 'Admin Fee' else 'Biaya Admin' end,
            'expense', 'landmark', 'slate', 'admin_fee', 100)
    returning id into v_id;
  end if;
  return v_id;
end $$;

-- -------------------------------------------------------------------------------------
-- 4. Triggers
-- -------------------------------------------------------------------------------------

-- New user → profile + default categories. Language comes from signup metadata
-- (`options.data.language`), then the OAuth locale, then Indonesian.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_lang text := lower(coalesce(
    new.raw_user_meta_data ->> 'language',
    left(new.raw_user_meta_data ->> 'locale', 2),
    'id'));
begin
  if v_lang not in ('en', 'id') then
    v_lang := 'id';
  end if;
  insert into public.profiles (id, language) values (new.id, v_lang)
  on conflict (id) do nothing;
  perform public.seed_default_categories(new.id, v_lang);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.check_profile()
returns trigger language plpgsql as $$
begin
  -- Raises for an unknown zone name.
  perform now() at time zone new.timezone;
  return new;
exception when others then
  raise exception 'INVALID_TIMEZONE';
end $$;

drop trigger if exists profiles_check on public.profiles;
create trigger profiles_check before insert or update of timezone on public.profiles
  for each row execute function public.check_profile();

-- Archiving needs a zero balance and no pending Safe-Pay.
create or replace function public.check_account_archive()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.archived_at is null and new.archived_at is not null then
    if exists (select 1 from public.safe_pays where account_id = new.id and status = 'pending') then
      raise exception 'ACCOUNT_HAS_PENDING_SAFE_PAY';
    end if;
    if (select balance from public.account_balances where account_id = new.id) <> 0 then
      raise exception 'ACCOUNT_BALANCE_NOT_ZERO';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists accounts_archive_check on public.accounts;
create trigger accounts_archive_check before update of archived_at on public.accounts
  for each row execute function public.check_account_archive();

-- A used category keeps its type.
create or replace function public.check_category_type_change()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.type <> old.type and (
    exists (select 1 from public.transactions where category_id = old.id)
    or exists (select 1 from public.safe_pays where category_id = old.id)
    or exists (select 1 from public.recurring_templates where category_id = old.id)
    or exists (select 1 from public.budgets where category_id = old.id)
  ) then
    raise exception 'CATEGORY_TYPE_LOCKED';
  end if;
  return new;
end $$;

drop trigger if exists categories_type_check on public.categories;
create trigger categories_type_check before update of type on public.categories
  for each row execute function public.check_category_type_change();

create or replace function public.check_transaction()
returns trigger language plpgsql set search_path = public as $$
begin
  perform public.assert_category_type(new.user_id, new.category_id, new.type);
  if public.user_local_date(new.occurred_at, new.user_id) > public.user_today(new.user_id) then
    raise exception 'TRANSACTION_IN_FUTURE';
  end if;
  return new;
end $$;

drop trigger if exists transactions_check on public.transactions;
create trigger transactions_check before insert or update on public.transactions
  for each row execute function public.check_transaction();

-- Deleting the Transaction made by Settle puts its Safe-Pay back to pending.
create or replace function public.revert_settled_safe_pay()
returns trigger language plpgsql set search_path = public as $$
begin
  update public.safe_pays
  set status = 'pending', transaction_id = null, settled_at = null
  where transaction_id = old.id;
  return old;
end $$;

drop trigger if exists transactions_revert_safe_pay on public.transactions;
create trigger transactions_revert_safe_pay before delete on public.transactions
  for each row execute function public.revert_settled_safe_pay();

-- Safe-Pay: Expense category, and never more than the account's Available Balance.
-- A revert (settled → pending) is not checked: it is caused by a delete and must not block it.
create or replace function public.check_safe_pay()
returns trigger language plpgsql set search_path = public as $$
begin
  perform public.assert_category_type(new.user_id, new.category_id, 'expense');
  if new.status = 'pending'
     and (tg_op = 'INSERT'
          or (old.status = 'pending'
              and (new.amount <> old.amount or new.account_id <> old.account_id))) then
    if new.amount > coalesce(public.account_available_balance(new.account_id, new.id), 0) then
      raise exception 'SAFE_PAY_EXCEEDS_AVAILABLE';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists safe_pays_check on public.safe_pays;
create trigger safe_pays_check before insert or update on public.safe_pays
  for each row execute function public.check_safe_pay();

create or replace function public.check_recurring_template()
returns trigger language plpgsql set search_path = public as $$
begin
  perform public.assert_category_type(new.user_id, new.category_id, new.type);
  return new;
end $$;

drop trigger if exists recurring_templates_check on public.recurring_templates;
create trigger recurring_templates_check before insert or update on public.recurring_templates
  for each row execute function public.check_recurring_template();

create or replace function public.check_budget()
returns trigger language plpgsql set search_path = public as $$
begin
  perform public.assert_category_type(new.user_id, new.category_id, 'expense');
  return new;
end $$;

drop trigger if exists budgets_check on public.budgets;
create trigger budgets_check before insert or update on public.budgets
  for each row execute function public.check_budget();

do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'accounts', 'categories', 'transactions', 'safe_pays',
                           'recurring_templates', 'budgets'] loop
    execute format('drop trigger if exists %I_updated_at on public.%I', t, t);
    execute format('create trigger %I_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- -------------------------------------------------------------------------------------
-- 5. Row Level Security: every user sees only their own rows
-- -------------------------------------------------------------------------------------

alter table public.profiles enable row level security;
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$
declare
  t text;
begin
  foreach t in array array['accounts', 'categories', 'transactions', 'safe_pays',
                           'recurring_templates', 'recurring_occurrences', 'budgets',
                           'notification_dismissals'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated
                    using (user_id = (select auth.uid()))
                    with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on
  public.accounts, public.categories, public.transactions, public.safe_pays,
  public.recurring_templates, public.recurring_occurrences, public.budgets,
  public.notification_dismissals
  to authenticated;
grant select on public.account_balances to authenticated;
revoke all on all tables in schema public from anon;

-- -------------------------------------------------------------------------------------
-- 6. RPCs — every action that touches more than one row is one atomic call
-- -------------------------------------------------------------------------------------

-- Create (p_id null) or update any Transaction, including a change of Transaction Type.
-- A Transfer's optional Admin Fee is a linked Expense in the Admin Fee category; it follows the
-- Transfer's date and source account, and disappears when the fee is cleared or the type changes.
create or replace function public.save_transaction(
  p_id uuid,
  p_type text,
  p_amount bigint,
  p_occurred_at timestamptz,
  p_account uuid,
  p_to_account uuid default null,
  p_category uuid default null,
  p_note text default null,
  p_admin_fee bigint default null
) returns uuid language plpgsql set search_path = public as $$
declare
  v_id uuid := p_id;
  v_note text := nullif(btrim(p_note), '');
begin
  if p_type = 'transfer' then
    p_category := null;
  else
    p_to_account := null;
    p_admin_fee := null;
  end if;

  if v_id is null then
    insert into public.transactions (type, amount, occurred_at, account_id, to_account_id, category_id, note)
    values (p_type, p_amount, p_occurred_at, p_account, p_to_account, p_category, v_note)
    returning id into v_id;
  else
    if p_type = 'transfer' and exists (
      select 1 from public.transactions where id = v_id and parent_transaction_id is not null
    ) then
      raise exception 'ADMIN_FEE_PART_OF_TRANSFER';
    end if;
    update public.transactions
    set type = p_type, amount = p_amount, occurred_at = p_occurred_at, account_id = p_account,
        to_account_id = p_to_account, category_id = p_category, note = v_note
    where id = v_id;
    if not found then
      raise exception 'TRANSACTION_NOT_FOUND';
    end if;
  end if;

  if coalesce(p_admin_fee, 0) > 0 then
    update public.transactions
    set amount = p_admin_fee, occurred_at = p_occurred_at, account_id = p_account
    where parent_transaction_id = v_id;
    if not found then
      insert into public.transactions
        (type, amount, occurred_at, account_id, category_id, parent_transaction_id)
      values ('expense', p_admin_fee, p_occurred_at, p_account,
              public.admin_fee_category_id(), v_id);
    end if;
  else
    delete from public.transactions where parent_transaction_id = v_id;
  end if;

  return v_id;
end $$;

-- Transfer-only shorthand for save_transaction, kept for callers from phase 1.
create or replace function public.save_transfer(
  p_id uuid,
  p_from_account uuid,
  p_to_account uuid,
  p_amount bigint,
  p_occurred_at timestamptz,
  p_note text default null,
  p_admin_fee bigint default null
) returns uuid language sql set search_path = public as $$
  select public.save_transaction(p_id, 'transfer', p_amount, p_occurred_at, p_from_account,
                                 p_to_account, null, p_note, p_admin_fee)
$$;

-- Record a Transaction now and repeat it monthly from next month, on the same day of month.
create or replace function public.create_transaction_with_recurring(
  p_type text,
  p_amount bigint,
  p_occurred_at timestamptz,
  p_account uuid,
  p_to_account uuid default null,
  p_category uuid default null,
  p_note text default null,
  p_admin_fee bigint default null,
  p_end_date date default null
) returns uuid language plpgsql set search_path = public as $$
declare
  v_id uuid;
  v_local date := public.user_local_date(p_occurred_at);
begin
  v_id := public.save_transaction(null, p_type, p_amount, p_occurred_at, p_account,
                                  p_to_account, p_category, p_note, p_admin_fee);

  insert into public.recurring_templates
    (type, amount, account_id, to_account_id, category_id, note, day_of_month, start_date, end_date)
  values (p_type, p_amount, p_account,
          case when p_type = 'transfer' then p_to_account end,
          case when p_type <> 'transfer' then p_category end,
          nullif(btrim(p_note), ''),
          extract(day from v_local)::smallint,
          (date_trunc('month', v_local) + interval '1 month')::date,
          p_end_date);

  return v_id;
end $$;

-- Bulk Entry: all rows or none. p_rows = [{type, amount, occurred_at, account_id,
-- to_account_id, category_id, note}, ...]
create or replace function public.bulk_insert_transactions(p_rows jsonb)
returns integer language plpgsql set search_path = public as $$
declare
  v_count integer;
begin
  insert into public.transactions (type, amount, occurred_at, account_id, to_account_id, category_id, note)
  select r.type, r.amount, r.occurred_at, r.account_id, r.to_account_id, r.category_id,
         nullif(btrim(r.note), '')
  from jsonb_to_recordset(p_rows) as r (
    type text, amount bigint, occurred_at timestamptz, account_id uuid,
    to_account_id uuid, category_id uuid, note text);
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- Settle: the Safe-Pay becomes an Expense Transaction; the amount and date may differ.
create or replace function public.settle_safe_pay(
  p_id uuid,
  p_amount bigint,
  p_occurred_at timestamptz
) returns uuid language plpgsql set search_path = public as $$
declare
  v_safe_pay public.safe_pays;
  v_tx uuid;
begin
  select * into v_safe_pay from public.safe_pays where id = p_id for update;
  if not found then
    raise exception 'SAFE_PAY_NOT_FOUND';
  end if;
  if v_safe_pay.status <> 'pending' then
    raise exception 'SAFE_PAY_NOT_PENDING';
  end if;

  insert into public.transactions (type, amount, occurred_at, account_id, category_id, note)
  values ('expense', p_amount, p_occurred_at, v_safe_pay.account_id, v_safe_pay.category_id,
          v_safe_pay.note)
  returning id into v_tx;

  update public.safe_pays
  set status = 'settled', transaction_id = v_tx, settled_at = now()
  where id = p_id;

  return v_tx;
end $$;

-- Confirm one Recurring Occurrence (one month of a template) as a Transaction.
create or replace function public.confirm_recurring_occurrence(
  p_template_id uuid,
  p_period date,
  p_amount bigint,
  p_occurred_at timestamptz
) returns uuid language plpgsql set search_path = public as $$
declare
  v_template public.recurring_templates;
  v_period date := date_trunc('month', p_period)::date;
  v_due date;
  v_tx uuid;
begin
  select * into v_template from public.recurring_templates where id = p_template_id for update;
  if not found then
    raise exception 'RECURRING_TEMPLATE_NOT_FOUND';
  end if;
  v_due := public.clamped_day(v_period, v_template.day_of_month);
  if v_due < v_template.start_date
     or (v_template.end_date is not null and v_due > v_template.end_date)
     or v_due > public.user_today() then
    raise exception 'OCCURRENCE_NOT_DUE';
  end if;
  if exists (select 1 from public.recurring_occurrences
             where template_id = p_template_id and period = v_period) then
    raise exception 'OCCURRENCE_ALREADY_RESOLVED';
  end if;

  insert into public.transactions (type, amount, occurred_at, account_id, to_account_id, category_id, note)
  values (v_template.type, p_amount, p_occurred_at, v_template.account_id,
          v_template.to_account_id, v_template.category_id, v_template.note)
  returning id into v_tx;

  insert into public.recurring_occurrences (template_id, period, due_date, status, transaction_id)
  values (p_template_id, v_period, v_due, 'confirmed', v_tx);

  return v_tx;
end $$;

create or replace function public.skip_recurring_occurrence(p_template_id uuid, p_period date)
returns void language plpgsql set search_path = public as $$
declare
  v_template public.recurring_templates;
  v_period date := date_trunc('month', p_period)::date;
begin
  select * into v_template from public.recurring_templates where id = p_template_id;
  if not found then
    raise exception 'RECURRING_TEMPLATE_NOT_FOUND';
  end if;
  insert into public.recurring_occurrences (template_id, period, due_date, status)
  values (p_template_id, v_period, public.clamped_day(v_period, v_template.day_of_month), 'skipped')
  on conflict (template_id, period) do nothing;
end $$;

-- During onboarding only: re-seed the untouched default categories in another language.
create or replace function public.reseed_default_categories(p_lang text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_lang not in ('en', 'id') then
    raise exception 'INVALID_LANGUAGE';
  end if;
  if exists (select 1 from public.profiles where id = v_user and onboarding_completed_at is not null)
     or exists (select 1 from public.transactions where user_id = v_user)
     or exists (select 1 from public.safe_pays where user_id = v_user)
     or exists (select 1 from public.recurring_templates where user_id = v_user) then
    return;
  end if;
  delete from public.categories where user_id = v_user;
  perform public.seed_default_categories(v_user, p_lang);
end $$;

-- Wipe the user's money data, keep the login; default categories return and onboarding reruns.
create or replace function public.reset_data()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_lang text;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  delete from public.safe_pays where user_id = v_user;
  delete from public.recurring_templates where user_id = v_user;
  delete from public.budgets where user_id = v_user;
  delete from public.transactions where user_id = v_user;
  delete from public.categories where user_id = v_user;
  delete from public.accounts where user_id = v_user;
  delete from public.notification_dismissals where user_id = v_user;
  update public.profiles set onboarding_completed_at = null where id = v_user
  returning language into v_lang;
  perform public.seed_default_categories(v_user, coalesce(v_lang, 'id'));
end $$;

-- Delete the login and, by cascade, every row the user owns.
create or replace function public.delete_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

-- -------------------------------------------------------------------------------------
-- 7. Function privileges: internal helpers are not callable from the API
-- -------------------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon;
revoke execute on function
  public.seed_default_categories(uuid, text),
  public.handle_new_user()
  from authenticated;
-- Helpers run as the calling user from triggers and RPCs.
grant execute on function
  public.user_local_date(timestamptz, uuid),
  public.clamped_day(date, smallint),
  public.assert_category_type(uuid, uuid, text),
  public.account_available_balance(uuid, uuid),
  public.admin_fee_category_id()
  to authenticated;
grant execute on function
  public.save_transaction(uuid, text, bigint, timestamptz, uuid, uuid, uuid, text, bigint),
  public.save_transfer(uuid, uuid, uuid, bigint, timestamptz, text, bigint),
  public.create_transaction_with_recurring(text, bigint, timestamptz, uuid, uuid, uuid, text, bigint, date),
  public.bulk_insert_transactions(jsonb),
  public.settle_safe_pay(uuid, bigint, timestamptz),
  public.confirm_recurring_occurrence(uuid, date, bigint, timestamptz),
  public.skip_recurring_occurrence(uuid, date),
  public.reseed_default_categories(text),
  public.reset_data(),
  public.delete_account(),
  public.user_today(uuid)
  to authenticated;
