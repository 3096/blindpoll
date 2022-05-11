import crypto from 'crypto';

export const generateRandomAccessToken = () => crypto.randomBytes(16).toString('hex');
