import { Pool, type PoolClient } from 'pg';

const ROLE_ENV = (process.env.AUTH_SEED_ENV ?? process.env.NODE_ENV ?? 'development')
  .toLowerCase()
  .replace(/[^a-z0-9_-]/g, '-');

const counselorEmail = process.env.SEED_COUNSELOR_EMAIL ?? `counselor+${ROLE_ENV}@example.test`;
const employerEmail = process.env.SEED_EMPLOYER_EMAIL ?? `employer+${ROLE_ENV}@example.test`;
const employerOrgId = `employer_org_${ROLE_ENV}`;

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query('begin');
    await client.query(
      `insert into employer_organizations (id, name, environment)
       values ($1, $2, $3)
       on conflict (id) do update
         set name = excluded.name,
             environment = excluded.environment,
             "updatedAt" = now()`,
      [employerOrgId, `WorkBridge Employer ${ROLE_ENV}`, ROLE_ENV],
    );

    await upsertUser(client, {
      id: `counselor_${ROLE_ENV}`,
      name: `Orientador ${ROLE_ENV}`,
      email: counselorEmail,
      role: 'counselor',
      employerOrgId: null,
    });
    await upsertUser(client, {
      id: `employer_${ROLE_ENV}`,
      name: `Empresa ${ROLE_ENV}`,
      email: employerEmail,
      role: 'employer',
      employerOrgId,
    });

    await client.query('commit');
    console.info(`Seeded Better Auth roles for ${ROLE_ENV}: ${counselorEmail}, ${employerEmail}`);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function upsertUser(
  client: PoolClient,
  user: { id: string; name: string; email: string; role: 'employer' | 'counselor'; employerOrgId: string | null },
) {
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
    [user.id, user.name, user.email, user.role, user.employerOrgId],
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
