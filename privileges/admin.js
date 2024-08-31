import pool from '../db_con.js' ;

const ensureAdmin = async (req, res, next) => {
    try {
        const userId = req.user.iduser;

        // Query to get the role name of the logged-in user
        const { rows } = await pool.query(
            `SELECT r.name FROM users u
             JOIN role r ON u.idRole = r.id
             WHERE u.iduser = $1`,
            [userId]
        );

        // Check if rows[0] exists and has a name property
        if (rows.length > 0 && rows[0].name) {
            console.log(`User role: ${rows[0].name}`);

            if (rows[0].name === 'admin') {
                return next(); // Allow access if the user is an admin
            } else {
                return res.status(403).send('Access denied: Admins only.');
            }
        } else {
            // Handle the case where the role name could not be found
            return res.status(403).send('Access denied: Role not found.');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
export default ensureAdmin;
