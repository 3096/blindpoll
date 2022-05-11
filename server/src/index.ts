import express from 'express';
import mongoose from 'mongoose';

import config from './config';
import pollRouter from './routes/poll-router';

const apiServer = express();

if (config.API_ENABLE_CORS) {
    apiServer.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });
    console.log('API server enabled CORS');
}

apiServer.use(express.json());
apiServer.use(config.API_ROUTE, pollRouter);

mongoose.connect(config.DB_URI).catch(
    err => console.log(err)
).then(() => {
    console.log(`Connected to MongoDB at ${config.DB_URI}`);
    apiServer.listen(config.API_PORT, () => console.log(`API server is listening on port ${config.API_PORT}`));
});
