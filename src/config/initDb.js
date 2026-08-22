const pool = require('./db');

const initDb = async () => {
  try {
    // Delete feedback records for expired appointments
    await pool.query(`
      DELETE FROM feedback
      WHERE appointment_id IN (
        SELECT id FROM appointments WHERE end_time < NOW()
      );
    `);

    // Delete swap_requests referencing expired appointments
    await pool.query(`
      DELETE FROM swap_requests
      WHERE current_appointment_id IN (
        SELECT id FROM appointments WHERE end_time < NOW()
      ) OR target_appointment_id IN (
        SELECT id FROM appointments WHERE end_time < NOW()
      );
    `);

    // Delete expired appointments (end_time before current timestamp)
    await pool.query(`
      DELETE FROM appointments
      WHERE end_time < NOW();
    `);

    // Add role column to users table if it doesn't exist
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
    `);

    // Add specialization column to gps table if it doesn't exist
    await pool.query(`
      ALTER TABLE gps
      ADD COLUMN IF NOT EXISTS specialization VARCHAR(100);
    `);

    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        preferred_gp INTEGER,
        notification_preferences JSONB,
        google_tokens JSONB
      );

      CREATE TABLE IF NOT EXISTS practices (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        city VARCHAR(100) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS gps (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        practice_id INTEGER REFERENCES practices(id),
        specialization VARCHAR(100)
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        gp_id INTEGER REFERENCES gps(id),
        user_id INTEGER REFERENCES users(id),
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        is_booked BOOLEAN DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS swap_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        current_appointment_id INTEGER REFERENCES appointments(id),
        target_appointment_id INTEGER REFERENCES appointments(id),
        status VARCHAR(50) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        appointment_id INTEGER REFERENCES appointments(id),
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comments TEXT
      );
    `);

    // Insert practice only if 'Portsmouth' city doesn't exist
    await pool.query(`
      INSERT INTO practices (name, city)
      SELECT 'Portsmouth Health Clinic', 'Portsmouth'
      WHERE NOT EXISTS (
        SELECT 1 FROM practices WHERE city = 'Portsmouth'
      );
    `);

    // Insert hardcoded admin and GP users
    await pool.query(`
      INSERT INTO users (email, password, name, role)
      VALUES (
        'admin@system.com',
        '$2a$10$8qX9z2b2v7J8Z9X0Y7K3ueW8Z9X0Y7K3u9X0Y7K3u9X0Y7K3u9X0',
        'Admin User',
        'admin'
      )
      ON CONFLICT (email) DO NOTHING;

      INSERT INTO users (email, password, name, role)
      VALUES (
        'gp@system.com',
        '$2a$10$8qX9z2b2v7J8Z9X0Y7K3ueW8Z9X0Y7K3u9X0Y7K3u9X0Y7K3u9X0',
        'Dr. Smith',
        'gp'
      )
      ON CONFLICT (email) DO NOTHING;
    `);

    // Assign unique random specialization to each GP with NULL specialization
    const specializations = ['Bones', 'Chest', 'Stomach', 'Skin'];
    const unassignedGPs = await pool.query('SELECT id FROM gps WHERE specialization IS NULL');

    for (const gp of unassignedGPs.rows) {
      // Shuffle specializations
      const shuffled = [...specializations].sort(() => Math.random() - 0.5);
      const selectedSpecialization = shuffled[0];
      await pool.query('UPDATE gps SET specialization = $1 WHERE id = $2', [selectedSpecialization, gp.id]);
    }

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

module.exports = initDb;