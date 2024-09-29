const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client('595795541220-o3jg825f2dkslk48eonl9qbv5f28u0o3.apps.googleusercontent.com');

async function authenticateToken(req, res, next) {
    const token = req.header('Authorization').split(' ')[1];
    if (!token) return res.status(401).send('Access denied. No token provided.');

    try {
        const ticket = await client.verifyIdToken({
            idToken: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjQ1MjljNDA5Zjc3YTEwNmZiNjdlZTFhODVkMTY4ZmQyY2ZiN2MwYjciLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI1OTU3OTU1NDEyMjAtbzNqZzgyNWYyZGtzbGs0OGVvbmw5cWJ2NWYyOHUwbzMuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI1OTU3OTU1NDEyMjAtbzNqZzgyNWYyZGtzbGs0OGVvbmw5cWJ2NWYyOHUwbzMuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMDQzNjYyNDg3MjA2MjQxMTQwMzAiLCJlbWFpbCI6ImRlb3JlLnJ1c2hpa2VzaC4xMml0MTA1MkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiYXRfaGFzaCI6IjVIM0RWY08yRnh4d2VmUk9WZmI0ZVEiLCJuYW1lIjoiUnVzaGlrZXNoIERlb3JlIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0pBcU9LMkVmQ2lnVTRtem00c0JoTkUxVFVJT3p2cWlOb3N2dDFtODhIbHRweUF4Y2lqPXM5Ni1jIiwiZ2l2ZW5fbmFtZSI6IlJ1c2hpa2VzaCIsImZhbWlseV9uYW1lIjoiRGVvcmUiLCJpYXQiOjE3MjMzMjIyOTMsImV4cCI6MTcyMzMyNTg5M30.UJokEsX46B5pYBrh8otHrXel5I17xDp--2RedLD6tweDgwRsAmDsEInRVVhpLXrxmbH7Y4MdZEcsVtG1YjHuF4FN7oXhwg0YS4Qy1POhh4etxU-h0uBS9OkJH0TtSElUr_P-bU9Frhkc2ltMBZv3a5StXycHg9x7GRkGqpN2BMFX7t8Yxt-K2zq_L4tOED3vWtMK0AuFIDamVOUTFdCJebr5uyLR2eL2_HHxs_w_te3YtrAgZkxscBJU5zp3sqjcSNR4o8CT5RhZwJkuQTqlgJyiXrkjx56NORxc171f4sCV-DYAfQ_Ak_3qwU8TGbJOBdHjsxElideR-qz1F1pB8w',
            audience: '595795541220-o3jg825f2dkslk48eonl9qbv5f28u0o3.apps.googleusercontent.com',  // Specify the CLIENT_ID of the app that accesses the backend
        });
        const payload = ticket.getPayload();
        req.user = payload;
        next();
    } catch (err) {
        res.status(403).send('Invalid token.');
    }
}

module.exports = authenticateToken;