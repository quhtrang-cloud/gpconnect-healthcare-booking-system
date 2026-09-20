const pool = require('./db')

async function initDb() {
  try {
    // Create parent tables before tables that reference them.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS practices (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        city VARCHAR(100) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS gps (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        practice_id INTEGER REFERENCES practices(id) ON DELETE RESTRICT,
        specialization VARCHAR(100)
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        gp_id INTEGER REFERENCES gps(id) ON DELETE RESTRICT,
        preferred_gp INTEGER REFERENCES gps(id) ON DELETE SET NULL,
        notification_preferences JSONB NOT NULL DEFAULT '{"email": false, "sms": false}'::jsonb,
        google_tokens JSONB
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        gp_id INTEGER REFERENCES gps(id) ON DELETE RESTRICT,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        is_booked BOOLEAN NOT NULL DEFAULT false,
        CHECK (end_time > start_time)
      );

      CREATE TABLE IF NOT EXISTS swap_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        current_appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
        target_appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        CHECK (current_appointment_id <> target_appointment_id),
        CHECK (status IN ('pending', 'approved', 'rejected'))
      );

      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comments TEXT,
        UNIQUE (user_id, appointment_id)
      );
    `)

    // Safe migrations for databases created by an earlier project version.
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS gp_id INTEGER;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_gp INTEGER;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_tokens JSONB;
      ALTER TABLE gps ADD COLUMN IF NOT EXISTS specialization VARCHAR(100);
    `)

    // Add the GP relationship to databases created before users.gp_id existed.
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'users_gp_id_fkey'
            AND conrelid = 'users'::regclass
        ) THEN
          ALTER TABLE users
          ADD CONSTRAINT users_gp_id_fkey
          FOREIGN KEY (gp_id) REFERENCES gps(id) ON DELETE RESTRICT;
        END IF;
      END
      $$;
    `)

    // One GP profile can belong to only one login account.
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_gp_id_unique
      ON users (gp_id)
      WHERE gp_id IS NOT NULL;
    `)

    // One-time migration for existing GP accounts that previously matched by name.
    await pool.query(`
      UPDATE users AS u
      SET gp_id = g.id
      FROM gps AS g
      WHERE u.role = 'gp'
        AND u.gp_id IS NULL
        AND u.name = g.name;
    `)

    await pool.query(`
      INSERT INTO practices (name, city)
      SELECT 'Portsmouth Health Clinic', 'Portsmouth'
      WHERE NOT EXISTS (
        SELECT 1 FROM practices
        WHERE name = 'Portsmouth Health Clinic' AND city = 'Portsmouth'
      )
    `)

    const specializations = ['Bones', 'Chest', 'Stomach', 'Skin']
    const unassignedGps = await pool.query(
      'SELECT id FROM gps WHERE specialization IS NULL ORDER BY id'
    )

    for (const [index, gp] of unassignedGps.rows.entries()) {
      await pool.query(
        'UPDATE gps SET specialization = $1 WHERE id = $2',
        [specializations[index % specializations.length], gp.id]
      )
    }

    console.log('Database tables initialized successfully')
  } catch (error) {
    console.error('Error initializing database:', error)
    throw error
  }
}

module.exports = initDb
