create table if not exists "user" (
  id text primary key,
  name text not null,
  email text not null unique,
  "emailVerified" boolean not null default false,
  image text,
  role text not null default 'candidate' check (role in ('candidate', 'employer', 'counselor')),
  "employerOrgId" text,
  "isAnonymous" boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists "session" (
  id text primary key,
  "expiresAt" timestamptz not null,
  token text not null unique,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references "user"(id) on delete cascade
);

create table if not exists "account" (
  id text primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references "user"(id) on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope text,
  password text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists "verification" (
  id text primary key,
  identifier text not null,
  value text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists employer_organizations (
  id text primary key,
  name text not null,
  environment text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists session_user_id_idx on "session" ("userId");
create index if not exists account_user_id_idx on "account" ("userId");
create unique index if not exists account_provider_account_idx on "account" ("providerId", "accountId");
create index if not exists verification_identifier_idx on "verification" (identifier);
