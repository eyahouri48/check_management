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
const ensureAgentOrAdmin = async (req, res, next) => {
    try {
        const userId = req.user.iduser;

        const { rows } = await pool.query(
            `SELECT r.name FROM users u
             JOIN role r ON u.idRole = r.id
             WHERE u.iduser = $1`,
            [userId]
        );

        if (rows.length > 0 && rows[0].name) {
            console.log(`User role: ${rows[0].name}`);

            if (rows[0].name === 'agent' || rows[0].name === 'admin') {
                return next(); // Allow access if the user is an agent or admin
            } else {
                return res.status(403).send('Access denied: Agents or Admins only.');
            }
        } else {
            return res.status(403).send('Access denied: Role not found.');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
export default ensureAgentOrAdmin ;