import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool, type PoolClient } from 'pg';
import { makeCandidateId } from '../packages/domain/src/index.ts';
import {
  DEMO_PASSWORD,
  seedCounselors,
  seedEmployers,
  seedStudents,
  type SeedAccount,
  type SeedChatSession,
  type SeedSavedSearch,
} from './seed/demo-data.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireFromWeb = createRequire(path.join(root, 'apps/web/package.json'));

async function hashDemoPassword(): Promise<string> {
  const crypto = (await import(requireFromWeb.resolve('better-auth/crypto'))) as {
    hashPassword: (password: string) => Promise<string>;
  };
  return crypto.hashPassword(DEMO_PASSWORD);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  const password = await hashDemoPassword();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('begin');
    for (const org of seedEmployers.map((item) => item.organization)) {
      await client.query(
        `insert into employer_organizations (id, name, environment)
         values ($1, $2, 'seed')
         on conflict (id) do update
           set name = excluded.name,
               environment = 'seed',
               "updatedAt" = now()`,
        [org.id, org.name],
      );
    }
    for (const account of [...seedStudents, ...seedEmployers, ...seedCounselors].map((item) => item.account)) {
      await upsertUser(client, account);
      await upsertPassword(client, account, password);
    }
    for (const student of seedStudents) {
      const candidateId = makeCandidateId(student.account.userId);
      if (student.profile) {
        await client.query(
          `insert into candidate_profiles (candidate_id, profile)
           values ($1, $2::jsonb)
           on conflict (candidate_id) do update
             set profile = excluded.profile, updated_at = now()`,
          [student.profile.candidate_id, JSON.stringify(student.profile)],
        );
      }
      if (student.preferences) {
        await client.query(
          `insert into candidate_preferences (candidate_id, preferences)
           values ($1, $2::jsonb)
           on conflict (candidate_id) do update
             set preferences = excluded.preferences, updated_at = now()`,
          [student.preferences.candidate_id, JSON.stringify(student.preferences)],
        );
      }
      for (const search of student.searches ?? []) await upsertSearch(client, search);
      if (student.visitedAt) {
        await client.query(
          `insert into candidate_vacancy_visits (candidate_id, visited_at)
           values ($1, $2::timestamptz)
           on conflict (candidate_id) do update set visited_at = excluded.visited_at`,
          [candidateId, student.visitedAt],
        );
      }
      if (student.chat) await upsertChat(client, candidateId, student.chat);
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }

  console.info(`Seeded ${seedStudents.length} students, ${seedEmployers.length} employers, ${seedCounselors.length} counselors.`);
  console.info(`Shared password: ${DEMO_PASSWORD}`);
  for (const item of [...seedStudents, ...seedEmployers, ...seedCounselors]) {
    console.info(`${item.account.role}\t${item.account.email}\t${item.flow}`);
  }
}

async function upsertUser(client: PoolClient, account: SeedAccount) {
  await client.query(
    `insert into "user" (id, name, email, "emailVerified", role, "employerOrgId", "isAnonymous")
     values ($1, $2, $3, true, $4, $5, false)
     on conflict (id) do update
       set name = excluded.name,
           email = excluded.email,
           "emailVerified" = true,
           role = excluded.role,
           "employerOrgId" = excluded."employerOrgId",
           "isAnonymous" = false,
           "updatedAt" = now()`,
    [account.userId, account.name, account.email, account.role, account.employerOrgId],
  );
}

async function upsertPassword(client: PoolClient, account: SeedAccount, password: string) {
  await client.query(
    `insert into "account" (id, "accountId", "providerId", "userId", password)
     values ($1, $2, 'credential', $2, $3)
     on conflict ("providerId", "accountId") do update
       set "userId" = excluded."userId",
           password = excluded.password,
           "updatedAt" = now()`,
    [`acct_${account.userId}`, account.userId, password],
  );
}

async function upsertSearch(client: PoolClient, search: SeedSavedSearch) {
  await client.query(
    `insert into candidate_saved_searches (search_id, candidate_id, search)
     values ($1, $2, $3::jsonb)
     on conflict (search_id) do update
       set candidate_id = excluded.candidate_id,
           search = excluded.search,
           updated_at = now()`,
    [search.searchId, search.candidateId, JSON.stringify(search)],
  );
}

async function upsertChat(client: PoolClient, candidateId: string, session: SeedChatSession) {
  await client.query(
    `insert into candidate_chat_sessions (candidate_id, session, version)
     values ($1, $2::jsonb, 1)
     on conflict (candidate_id) do update
       set session = excluded.session,
           version = candidate_chat_sessions.version + 1,
           updated_at = now()`,
    [candidateId, JSON.stringify(session)],
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
