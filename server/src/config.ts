import { BinaryToTextEncoding } from 'crypto';

const config = {
    DB_URI: process.env.DB_URI || 'mongodb://127.0.0.1:27017/blindpoll_test',

    API_PORT: process.env.PORT ? parseInt(process.env.PORT) : 3001,
    API_ROUTE: process.env.API_ROUTE || '/blindpoll/api',
    API_ENABLE_CORS: process.env.API_ENABLE_CORS !== undefined ? process.env.API_ENABLE_CORS === 'true' : true,

    WS_PORT: process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 3002,
    WS_ROUTE: process.env.WS_ROUTE || '/blindpoll/ws',

    SIGNATURE_ALGORITHM: process.env.SIGNATURE_ALGORITHM || 'RSA-SHA256',
    SIGNATURE_ENCONDING: (process.env.SIGNATURE_ENCONDING || 'base64') as BinaryToTextEncoding,
};

export default config;
