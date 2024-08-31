// filter/filter.js
import pool from '../db_con.js' ;

/**
 * Retrieves filtered checks from the database based on the provided filters.
 * @param {Object} filters - The filter criteria.
 * @param {string} [filters.creationDate] - The creation date to filter by.
 * @param {string} [filters.valueDate] - The value date to filter by.
 * @param {string} [filters.entryDate] - The entry date to filter by.
 * @param {string} [filters.issueDate] - The issue date to filter by.
 * @param {string} [filters.type] - The type to filter by (e.g., Personnel, Stagiaire, Fournisseur).
 * @param {string} [filters.status] - The status to filter by ("issued" or "notIssued").
 * @returns {Promise<Array>} - A promise that resolves to an array of filtered checks.
 */
export async function getFilteredChecks(filters) {
  let query = `
    SELECT *, 
      CASE 
        WHEN issuedate IS NOT NULL THEN 'issued' 
        ELSE 'notIssued' 
      END AS status
    FROM cheque 
    WHERE true`; // Start with a base query
  
  const values = [];
  let index = 1;

  // Add conditions based on the provided filters
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

  // Handle the new "Status" filter
  if (filters.status) {
    if (filters.status === 'issued') {
      query += ` AND issuedate IS NOT NULL AND supprime = false`;
    } else if (filters.status === 'notIssued') {
      query += ` AND issuedate IS NULL AND supprime = false`;
    }
  }

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error executing query', err.stack);
    throw err;
  }
}
