import getUserById from './getUserById.js'; // Ensure this path is correct

const ensureAdminOrCashier = async (req, res, next) => {
  try {
    const userId = req.user.iduser;

    // Fetch the user from the database using their ID
    const user = await getUserById(userId);

    // Check if the user is an Admin or Cashier
    if (user && (user.function === 'admin' || user.function === 'cashier')) {
      next(); // User is either Admin or Cashier, proceed to the route
    } else {
      res.status(404).render('404', { message: 'You do not have the required permissions for this operation.', title:'403 Error' });
    }
  } catch (error) {
    console.error('Error ensuring admin or cashier:', error);
    res.status(500).send('Internal Server Error');
  }
};

export default ensureAdminOrCashier;
