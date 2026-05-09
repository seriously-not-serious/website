import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = import.meta.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 10_000,
});

// Convenience wrapper — returns rows typed as T[]
async function query<T extends object = Record<string, unknown>>(
  text: string,
  values?: unknown[]
): Promise<T[]> {
  const result = await pool.query<T>(text, values);
  return result.rows;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

/**
 * Run this once to set up the database schema.
 */
export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id             SERIAL PRIMARY KEY,
      discord_id     TEXT UNIQUE,
      steam_id       TEXT UNIQUE,
      discord_tag    TEXT,
      discord_avatar TEXT,
      steam_name     TEXT,
      steam_avatar   TEXT,
      linked_at      TIMESTAMPTZ DEFAULT now(),
      updated_at     TIMESTAMPTZ DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      data       JSONB NOT NULL DEFAULT '{}',
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  console.log('✅ Migration complete');
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = {
  id: number;
  discord_id: string | null;
  steam_id: string | null;
  discord_tag: string | null;
  discord_avatar: string | null;
  steam_name: string | null;
  steam_avatar: string | null;
  linked_at: Date;
  updated_at: Date;
};

// ─── User queries ─────────────────────────────────────────────────────────────

export async function upsertDiscordUser(
  discordId: string,
  discordTag: string,
  discordAvatar: string | null
): Promise<User> {
  const rows = await query<User>(
    `INSERT INTO users (discord_id, discord_tag, discord_avatar)
     VALUES ($1, $2, $3)
     ON CONFLICT (discord_id)
     DO UPDATE SET
       discord_tag    = EXCLUDED.discord_tag,
       discord_avatar = EXCLUDED.discord_avatar,
       updated_at     = now()
     RETURNING *`,
    [discordId, discordTag, discordAvatar]
  );
  return rows[0];
}

export async function upsertSteamUser(
  steamId: string,
  steamName: string,
  steamAvatar: string | null
): Promise<User> {
  const rows = await query<User>(
    `INSERT INTO users (steam_id, steam_name, steam_avatar)
     VALUES ($1, $2, $3)
     ON CONFLICT (steam_id)
     DO UPDATE SET
       steam_name   = EXCLUDED.steam_name,
       steam_avatar = EXCLUDED.steam_avatar,
       updated_at   = now()
     RETURNING *`,
    [steamId, steamName, steamAvatar]
  );
  return rows[0];
}

export async function linkSteamToDiscord(
  discordId: string,
  steamId: string,
  steamName: string,
  steamAvatar: string | null
): Promise<User> {
  // Remove any steam-only row to avoid unique conflict before linking
  await pool.query(
    `DELETE FROM users WHERE steam_id = $1 AND discord_id IS NULL`,
    [steamId]
  );

  const rows = await query<User>(
    `UPDATE users
     SET steam_id = $1, steam_name = $2, steam_avatar = $3, updated_at = now()
     WHERE discord_id = $4
     RETURNING *`,
    [steamId, steamName, steamAvatar, discordId]
  );
  return rows[0];
}

export async function linkDiscordToSteam(
  steamId: string,
  discordId: string,
  discordTag: string,
  discordAvatar: string | null
): Promise<User> {
  // Remove any discord-only row to avoid unique conflict before linking
  await pool.query(
    `DELETE FROM users WHERE discord_id = $1 AND steam_id IS NULL`,
    [discordId]
  );

  const rows = await query<User>(
    `UPDATE users
     SET discord_id = $1, discord_tag = $2, discord_avatar = $3, updated_at = now()
     WHERE steam_id = $4
     RETURNING *`,
    [discordId, discordTag, discordAvatar, steamId]
  );
  return rows[0];
}

export async function getUserById(id: number): Promise<User | null> {
  const rows = await query<User>(`SELECT * FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function getUserByDiscordId(discordId: string): Promise<User | null> {
  const rows = await query<User>(`SELECT * FROM users WHERE discord_id = $1`, [discordId]);
  return rows[0] ?? null;
}

export async function getUserBySteamId(steamId: string): Promise<User | null> {
  const rows = await query<User>(`SELECT * FROM users WHERE steam_id = $1`, [steamId]);
  return rows[0] ?? null;
}
