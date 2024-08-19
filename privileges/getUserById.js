import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'check',
    password: '48?Oracle',
    port: 5432,
});
const getUserById = async (idUser) => {
    try {
      const query = 'SELECT * FROM users WHERE idUser = $1 AND supprime = false';
      const { rows } = await pool.query(query, [idUser]);
  
      return rows.length ? rows[0] : null;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  };
  
  export default getUserById;