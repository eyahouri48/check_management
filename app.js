import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import session from 'express-session';
import dotenv from 'dotenv';
import pkg from 'pg';
import bcrypt from 'bcryptjs';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

dotenv.config();
const { Pool } = pkg;
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
}));

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
        const result = await pool.query('SELECT * FROM users WHERE iduser = $1', [iduser]);
        const user = result.rows[0];
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Middleware to check if the user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

// Routes
app.get('/', ensureAuthenticated, (req, res) => {
    res.render('dashboard', { title: "management" });
});

app.get('/dashboard', ensureAuthenticated, (req, res) => {
    res.render('dashboard', { title: "management" });
});

app.get('/checks', ensureAuthenticated, (req, res) => {
    res.render('checks');
});

app.get('/404', (req, res) => {
    res.render('404');
});

app.get('/charts', ensureAuthenticated, (req, res) => {
    res.render('charts');
});

app.get('/tables', ensureAuthenticated, (req, res) => {
    res.render('tables');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/banks', ensureAuthenticated, (req, res) => {
    res.render('banks');
});

app.get('/accounts', ensureAuthenticated, (req, res) => {
    res.render('accounts');
});

app.get('/emission', ensureAuthenticated, (req, res) => {
    res.render('emission');
}); 

app.get('/logout', (req, res) => {
    req.logout(err => {
        if (err) {
            return next(err);
        }
        res.redirect('/login');
    });
});

app.post('/login',
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/login',
        failureFlash: false
    })
);

app.use((req, res) => {
    res.status(404).render('404');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;


