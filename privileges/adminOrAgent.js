import getUserById from './getUserById.js'; // Ensure this path is correct
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'check',
    password: '48?Oracle',
    port: 5432,
});
const ensureAdminOrAgent = async (req, res, next) => {
  try {
    const userId = req.user.iduser;

    // Fetch the user from the database using their ID
    const user = await getUserById(userId);

    // Check if the user is an Admin or Agent
    if (user && (user.function === 'admin' || user.function === 'agent')) {
      next(); // User is either Admin or Agent, proceed to the route
    } else {
      res.status(404).render('404', { message: 'You do not have the required permissions for this operation.' });
    }
  } catch (error) {
    console.error('Error ensuring admin or agent:', error);
    res.status(500).send('Internal Server Error');
  }
};

export default ensureAdminOrAgent;
