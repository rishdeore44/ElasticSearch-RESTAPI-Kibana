const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const resourceRoutes = require('./src/routes/resourceRoutes');

const app = express();
app.use(helmet());
app.use(bodyParser.json());

app.use('/api/v1/resource', resourceRoutes);

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
