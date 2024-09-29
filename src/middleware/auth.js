const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
//require('dotenv').config();

//const CLIENT_ID = process.env.CLIENT_ID;
//const CLIENT_SECRET = process.env.JWT_SECRET;
//console.log(CLIENT_ID);
//console.log(CLIENT_SECRET);

const CLIENT_ID = '---';
const CLIENT_SECRET = '---';
const CALLBACK_URL = 'http://localhost:3000/auth/google/callback';

passport.use(new GoogleStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: CALLBACK_URL,
    scope: ['profile', 'email', 'openid'] // Add openid scope
}, (accessToken, refreshToken, params, profile, done) => {
    // ID token can be found in the accessToken if the scope 'openid' is requested
    const idToken = params.id_token; // This is the JWT token
    return done(null, { profile, idToken });
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

const app = express();

app.use(session({ secret: '---', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/google', passport.authenticate('google'));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        // Successful authentication, return the JWT token
        if (req.user && req.user.idToken) {
            res.json({ token: req.user.idToken });
        } else {
            res.status(500).json({ error: 'Failed to obtain ID token' });
        }
    }
);

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

app.listen(3001, () => {
    console.log('Server running on http://localhost:3001');
});

//http://localhost:3000/auth/google