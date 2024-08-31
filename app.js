import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import session from 'express-session';
import expressLayouts from 'express-ejs-layouts';
import pool from './db_con.js'; // Import the database connection
import bcrypt from 'bcryptjs';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import flash from 'connect-flash';
import mainRoutes from './routes/mainRoutes.js'; // Import the function

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressLayouts);
app.set('layout', './layout/main');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
}));

app.use(flash());

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Passport local strategy
passport.use(new LocalStrategy(async (username, password, done) => {
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (!user) {
            return done(null, false, { message: 'Invalid username or password' });
        }
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return done(null, false, { message: 'Invalid username or password' });
        }
        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

// Serialize user into the session
passport.serializeUser((user, done) => {
    done(null, user.iduser);
});

// Deserialize user from the session
passport.deserializeUser(async (iduser, done) => {
    try {
        const result = await pool.query(`
            SELECT u.*, r.name AS role
            FROM users u 
            LEFT JOIN role r ON u.idRole = r.id 
            WHERE u.iduser = $1
        `, [iduser]);

        const user = result.rows[0];

        if (user) {
            console.log('User role:', user.role); // Log the user's role
        }

        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Use the routes, passing passport as an argument
app.use('/', mainRoutes(passport));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;
