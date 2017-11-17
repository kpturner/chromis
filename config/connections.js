/**
 * Connections
 * (sails.config.connections)
 *
 * `Connections` are like "saved settings" for your adapters.  What's the difference between
 * a connection and an adapter, you might ask?  An adapter (e.g. `sails-mysql`) is generic--
 * it needs some additional information to work (e.g. your database host, password, user, etc.)
 * A `connection` is that additional information.
 *
 * Each model must have a `connection` property (a string) which is references the name of one
 * of these connections.  If it doesn't, the default `connection` configured in `config/models.js`
 * will be applied.  Of course, a connection can (and usually is) shared by multiple models.
 * .
 * Note: If you're using version control, you should put your passwords/api keys
 * in `config/local.js`, environment variables, or use another strategy.
 * (this is to prevent you inadvertently sensitive credentials up to your repository.)
 *
 * For more information on configuration, check out:
 * http://sailsjs.org/#!/documentation/reference/sails.config/sails.config.connections.html
 */

module.exports.connections = {
    
        

    /***************************************************************************
     *                                                                          *
    * Local disk storage for DEVELOPMENT ONLY                                  *
    *                                                                          *
    * Installed by default.                                                    *
    *                                                                          *
    ***************************************************************************/
    localDiskDb: {
        adapter: 'sails-disk'
    },

    /***************************************************************************
     *                                                                          *
    * Redis adaptor for config storage                                         *
    *                                                                          *
    *                                                                          *
    ***************************************************************************/
    configDb: {
        adapter: process.env.SESS_ADAPTOR || process.env.SESS_ADAPTER || 'sails-redis', 
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        // ttl: <redis session TTL in seconds>,
        database: process.env.REDIS_DB || 0,
        password: process.env.REDIS_PASS || "", 
    },
    
    /***************************************************************************
     *                                                                          *
    * PostgreSQL is another officially supported relational database.          *
    * http://en.wikipedia.org/wiki/PostgreSQL                                  *
    *                                                                          *
    * Run: npm install sails-postgresql                                        *
    *                                                                          *
    *                                                                          *
    ***************************************************************************/
    rnsDb: {
        adapter: 'sails-postgresql',
        host: process.env.RNS_HOST || 'localhost',
        port: process.env.RNS_PORT || 5432,
        user: process.env.RNS_USER || 'renaissance',
        password: process.env.RNS_PASS || 'Hercule2',
        database: process.env.RNS_DB   || 'rns',
        poolSize: process.env.RNS_POOLSIZE || 5,
    },
  
    rnsdtaDb: {
        adapter: 'sails-postgresql',
        host: process.env.RNSDTA_HOST || 'localhost',
        port: process.env.RNSDTA_PORT || 5432,
        user: process.env.RNSDTA_USER || 'renaissance',
        password: process.env.RNSDTA_PASS || 'Hercule2',
        database: process.env.RNSDTA_DB   || 'rnsdta',
        poolSize: process.env.RNSDTA_POOLSIZE || 5,
    },
 

};
