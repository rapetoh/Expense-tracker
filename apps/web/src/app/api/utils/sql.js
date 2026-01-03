import pg from 'pg';

const { Pool } = pg;

// Use standard pg.Pool for local PostgreSQL connections
// This works reliably with local PostgreSQL databases
let pool = null;

function ensurePool() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'No database connection string was provided. Please set process.env.DATABASE_URL'
    );
  }
  
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Handle connection errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  
  return pool;
}

// Create sql function that lazily initializes the pool (only when first called)
async function sql(query, params) {
  const poolInstance = ensurePool();
  const result = await poolInstance.query(query, params);
  return result.rows;
}

// Add transaction support
sql.transaction = async (callback) => {
  const poolInstance = ensurePool();
  const client = await poolInstance.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(async (query, params) => {
      const res = await client.query(query, params);
      return res.rows;
    });
    // If result is an array of promises, await them all
    const resolvedResult = Array.isArray(result) 
      ? await Promise.all(result)
      : result;
    await client.query('COMMIT');
    return resolvedResult;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export default sql;