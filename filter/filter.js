// filter/filter.js
import pkg from 'pg';
const { Pool } = pkg;

// Configure the PostgreSQL connection pool
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'check',
  password: '48?Oracle',
  port: 5432, // Default PostgreSQL port
});

export async function getFilteredChecks(filters) {
  let query = 'SELECT * FROM cheque WHERE true'; // Start with a basic query that always returns true
  const values = [];
  let index = 1;

  // Add conditions to the query based on the filters
  if (filters.creationDate) {
    query += ` AND creationdate = $${index}`;
    values.push(filters.creationDate);
    index++;
  }
  if (filters.valueDate) {
    query += ` AND valuedate = $${index}`;
    values.push(filters.valueDate);
    index++;
  }
  if (filters.entryDate) {
    query += ` AND entrydate = $${index}`;
    values.push(filters.entryDate);
    index++;
  }
  if (filters.issueDate) {
    query += ` AND issuedate = $${index}`;
    values.push(filters.issueDate);
    index++;
  }
  if (filters.type) {
    query += ` AND type = $${index}`;
    values.push(filters.type);
    index++;
  }

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error executing query', err.stack);
    throw err;
  }
}

