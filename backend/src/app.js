const express = require('express');
const apiRoutes = require('./modules');
const errorMiddleware = require('./middlewares/error.middleware');
const notFoundMiddleware = require('./middlewares/notFound.middleware');

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use('/api', apiRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
