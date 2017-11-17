/**
 * Production environment settings
 *
 * This file can include shared settings for a production environment,
 * such as API keys or remote database passwords.  If you're using
 * a version control solution for your Sails app, this file will
 * be committed to your repository unless you add it to your .gitignore
 * file.  If your repository will be publicly viewable, don't add
 * any private information to this file!
 *
 */

var winston = require('winston');

var customLogger = new winston.Logger({
    transports: [
        new(winston.transports.File)({
            level: 'debug',
            filename: './logs/events-service.log'
        }),
    ],
});

module.exports = {

  /***************************************************************************
   * Set the default database connection for models in the production        *
   * environment (see config/connections.js and config/models.js )           *
   ***************************************************************************/

    models: {
        migrate: 'safe'  
    },

    // This is needed to ensure that passport authentication works properly on
    // Heroku, otherwise we end up with a redirect_uri of localhost:random port
    proxyHost: process.env.PROXYHOST || null, 
    proxyPort: process.env.PROXYPORT || null, 

    // Increase hook timeout
    hookTimeout: 90000, // 90 seconds

    /***************************************************************************
     * Set the port in the production environment to 80                        *
     ***************************************************************************/

    port: 80,

    /***************************************************************************
     * Set the log level in production environment to "error"                  *
     ***************************************************************************/

    log: {
        colors: (process.env.LOGTOCONSOLE)?true:false,  // To get clean logs without prefixes or color codings
        custom: (process.env.LOGTOCONSOLE)?null:customLogger,
        level: process.env.LOGLEVEL || "error"
    },

    blueprints: {
        actions: false,
        rest: true,
        shortcuts: false,
        index: false,
        defaultLimit: 1000,
    }

};
