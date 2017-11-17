/**
 * BUSMQ configuration - used for back-end server messaging
 * (sails.config.bus)
 * 
 */

module.exports.bus = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || '6379',
    db: process.env.REDIS_DB || 0,
    pass: process.env.REDIS_PASS || '',  
};
