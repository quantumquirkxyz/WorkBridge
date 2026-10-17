create table if not exists candidate_profiles (
  candidate_id text primary key,
  profile jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists candidate_preferences (
  candidate_id text primary key,
  preferences jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists candidate_profiles_updated_at_idx on candidate_profiles (updated_at);
create index if not exists candidate_preferences_updated_at_idx on candidate_preferences (updated_at);
