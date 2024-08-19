import getUserById from './getUserById.js';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'check',
    password: '48?Oracle',
    port: 5432,
});
const ensureAdmin = async (req, res, next) => {
    try {
      const userId = req.user.iduser;
  
      const user = await getUserById(userId);
  
      if (user && user.function === 'admin') {
        next(); // User is an Admin, proceed to the route
      } else {
        res.status(404).render('404', { message: 'You do not have the required permissions for this operation.' , title:'403 Error'});
      }
    } catch (error) {
      console.error('Error ensuring admin:', error);
      res.status(500).send('Internal Server Error');
    }
  };
  
  export default ensureAdmin;
