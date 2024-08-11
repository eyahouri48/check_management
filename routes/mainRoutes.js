// routes/mainRoutes.js

import express from 'express';

const router = express.Router();

export default function(passport) {

    // Middleware to check if the user is authenticated
    function ensureAuthenticated(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        res.redirect('/login');
    }

    router.get('/', ensureAuthenticated, (req, res) => {
        res.render('dashboard', { title: "management" });
    });

    router.get('/dashboard', ensureAuthenticated, (req, res) => {
        res.render('dashboard', { title: "management" });
    });

    router.get('/checks', ensureAuthenticated, (req, res) => {
        res.render('checks');
    });

    router.get('/404', (req, res) => {
        res.render('404');
    });

    router.get('/charts', ensureAuthenticated, (req, res) => {
        res.render('charts');
    });

    router.get('/tables', ensureAuthenticated, (req, res) => {
        res.render('tables');
    });

    router.get('/login', (req, res) => {
        const message = req.flash('error');
        res.render('login', { message });
    });

    router.get('/banks', ensureAuthenticated, (req, res) => {
        res.render('banks');
    });

    router.get('/accounts', ensureAuthenticated, (req, res) => {
        res.render('accounts');
    });

    router.get('/emission', ensureAuthenticated, (req, res) => {
        res.render('emission');
    });

    router.get('/logout', (req, res, next) => {
        req.logout(err => {
            if (err) {
                return next(err);
            }
            res.redirect('/login');
        });
    });

    router.post('/login',
        passport.authenticate('local', {
            successRedirect: '/dashboard',
            failureRedirect: '/login',
            failureFlash: true
        })
    );

    // Catch-all route for 404
    router.use((req, res) => {
        res.status(404).render('404');
    });

    return router;
}

