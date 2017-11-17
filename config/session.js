/**
 * Session Configuration
 * (sails.config.session)
 *
 * Sails session integration leans heavily on the great work already done by
 * Express, but also unifies Socket.io with the Connect session store. It uses
 * Connect's cookie parser to normalize configuration differences between Express
 * and Socket.io and hooks into Sails' middleware interpreter to allow you to access
 * and auto-save to `req.session` with Socket.io the same way you would with Express.
 *
 * For more information on configuring the session, check out:
 * http://sailsjs.org/#!/documentation/reference/sails.config/sails.config.session.html
 */

/**
 * NOTE:  We have disabled the use of the standard Sails (Express) sessionsvia a cookie
 *        and instead use JWT.  However, the secret etc is still used for JWT and in case we want
 *        to make use of signed cookies later.   It is disabled in .sailsrc.  
 */

module.exports.session = {

  /***************************************************************************
  *                                                                          *
  * Session secret is automatically generated when your new app is created   *
  * Replace at your own risk in production-- you will invalidate the cookies *
  * of your users, forcing them to log in again.                             *
  *                                                                          *
  ***************************************************************************/
  secret: 'f1f6016d27f78f1e559bda2b4c4f7057',
  
  /***************************************************************************
   * Session expiry is different to TTL on the session data.                 *
   * This is the default length of time an authenticated session will live   *
   * for in seconds.                                                         * 
   ***************************************************************************/
   sessionExpiry: 30*60,
   
   /***************************************
    * Namespace for RNS sessions
    */
   namespace: "rns:sessions",
   
  /***************************
   * 
   * Key represents the name of the session cookie (Not in use)
   * 
   */ 
   key: 'rns.sid',

  /***************************************************************************
  *                                                                          *
  * Set the session cookie expire time The maxAge is set by milliseconds,    *
  * the example below is for 24 hours                                        *
  *                                                                          *
  ***************************************************************************/

   cookie: {
     maxAge: 24 * 60 * 60 * 1000
     //maxAge: 10 *1000
   },

  /***************************************************************************
  *                                                                          *
  * In production, uncomment the following lines to set up a shared redis    *
  * session store that can be shared across multiple Sails.js servers        *
  ***************************************************************************/

  //adapter: 'memory',

  /***************************************************************************
  *                                                                          *
  * The following values are optional, if no options are set a redis         *
  * instance running on localhost is expected. Read more about options at:   *
  * https://github.com/visionmedia/connect-redis                             *
  *                                                                          *
  *                                                                          *
  ***************************************************************************/

    adapter: process.env.SESS_ADAPTOR || process.env.SESS_ADAPTER || 'connect-redis', 
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    ttl: 24*60*60,   // This is how long the data remains in redis, not the session expiry time
    db: process.env.REDIS_DB || 0,
    pass: process.env.REDIS_PASS || "",
    prefix: 'rns:sess:', 


  /***************************************************************************
  *                                                                          *
  * Uncomment the following lines to use your Mongo adapter as a session     *
  * store                                                                    *
  *                                                                          *
  ***************************************************************************/

  // adapter: 'mongo',
  // host: 'localhost',
  // port: 27017,
  // db: 'sails',
  // collection: 'sessions',

  /***************************************************************************
  *                                                                          *
  * Optional Values:                                                         *
  *                                                                          *
  * # Note: url will override other connection settings url:                 *
  * 'mongodb://user:pass@host:port/database/collection',                     *
  *                                                                          *
  ***************************************************************************/

  // username: '',
  // password: '',
  // auto_reconnect: false,
  // ssl: false,
  // stringify: true

};
