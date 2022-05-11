const config = {
    API_PATH: process.env.API_PATH || 'http://127.0.0.1:3001/blindpoll/api',
    WS_PATH: process.env.WS_PATH || 'ws://127.0.0.1:3002/blindpoll/ws',
};

export default config;
