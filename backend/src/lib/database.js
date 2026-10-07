import mysql from 'mysql2/promise';

const requiredDatabaseVariables = ['DB_HOST', 'DB_USER', 'DB_NAME'];

function readDatabaseConfig() {
  const missingVariables = requiredDatabaseVariables.filter(
    (variableName) => !process.env[variableName],
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Konfigurasi database belum lengkap: ${missingVariables.join(', ')}`,
    );
  }

  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
    queueLimit: 0,
  };
}

let pool;

export function getDatabasePool() {
  if (!pool) {
    pool = mysql.createPool(readDatabaseConfig());
  }

  return pool;
}

