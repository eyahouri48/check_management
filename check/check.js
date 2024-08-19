import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'check',
    password: '48?Oracle',
    port: 5432,
});
const ensureCheckNotIssued = async (req, res, next) => {
    const checkNum = parseInt(req.params.num, 10);
    console.log(`Middleware called for check number: ${checkNum}`);
    try {
        const result = await pool.query('SELECT issueDate FROM cheque WHERE num = $1', [checkNum]);
        const check = result.rows[0];

        if (check && check.issuedate) {
            // Redirect to a 404 page or any other error page if the check is already issued
            return res.status(403).render('404', { message: 'This check has already been issued and cannot be modified.' });
        }
        next();
    } catch (error) {
        console.error(`Error checking issueDate for check ${checkNum}:`, error);
        res.status(500).send('Server error');
    }
};
export default ensureCheckNotIssued;