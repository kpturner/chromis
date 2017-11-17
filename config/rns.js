/***** BEGIN LICENCE BLOCK ***************************/                  
/* The initial developer of the code is Kevin Turner   */ 
/* kpturner.co.uk     */ 
/*                                                   */
/* Portions created by Kevin Turner Systems Ltd" are   */
/* Copyright (c) 2005-2016 Kevin Turner Systems Ltd.    */
/* All Rights Reserved.                              */
/***** END LICENCE BLOCK *****************************/   

/**
 * @name    rns
 * @memberOf config
 * @description Chromis configuration. All values can be overridden at a 
 * local level in /config/local.js
 * All variables can be referred to in the code using their qualifed name prefix with "sails." 
 * - e.g.  sails.config.rns.version
 * @property {String}   config.rns.version          Current Chromis version 
 * @property {String}   config.rns.serverName       A handle that we want to give this server
 * @property {String}   config.rns.busProvider      Can be either "busmq" or "rsmq" 
 * @property {String}   config.rns.aeskey           A key used for AES encryption
 * @property {Array}    config.rns.developers       An array of user ids that will be treated as 
 * developers (to code stuff only relevant to developers)
 * @property {String}   config.rns.developer        Email address of the developer for diagnostic emails
 * @property {String}   config.rns.support          Email address for support related emails
 * @property {Boolean}  config.rns.generateDocs     Generate online documentation on startup (only works in development mode)
 * @property {Integer}  config.rns.heapdumpInterval Memory leak testing - set to null to switch this off,
 * otherwise set a value in milliseconds and the system will produce a headump on that interval in /heapdump
 * @property {Array}    config.rns.sessionBypass    Array of functions that can bypass session authentication checking
 * @property {Array}    config.rns.admins           Should only be used in development. Array of administrative users 
 * for the system. Each array element is an object containing the user name and password. These will automatically get created at 
 * startup and will be authorised to all functions
 * @property {Boolean}  config.rns.queueTestHarness  Run the test harness function at startup
 * @property {Function}  config.rns.bootstrapTestHarness  A function to run on boot up (for testing stuff)
 * @property {Boolean}  config.rns.hideloggedinusers Hide logged in users on login screen?
 * @property {Boolean}  config.rns.migrateConfig    Migrate config data?  Test data is config information
 * you have stored in sails/config/rns/foo/data that you would like to migrate onto the actual database
 * @property {Boolean}  config.rns.autoAddFunctions  If enabled, on startup sails will check for any new functions and create DB entries for them 
 * @property {Object}   config.rns.environments     Environments that you wish this server to support. For example
 *   <pre><code>
 *      rnsdta: {
 *                   host:       'localhost',
 *                   port:       5432,
 *                   user:       'renaissance',
 *                   password:   'Hercule2',
 *                   database:   'rnsdta',  
 *                   debug:      6000 // The server manager debug port.  All servers launched by the manager will listen on a port incremented from this         
 *        }
 *   </code></pre>
 * @property {Object}  config.rns.DKIM             DKIM details to help prevent our emails being flagged as spam. For example
  *   <pre><code>
 *      DKIM: {
 *          domainName: "renaissanceframework.com", 
 *          keySelector: "default",
 *          privateKey: "default.renaissanceframework.com.pem"	
 *      }
 *    </code></pre>
 * @property {String}   config.rns.listenerPrefix   Define a socket listener prefix. This can be overridden in local.js if we want to separate listeners by
 * server instance (for example)
 * @property {Integer}  config.rns.serverMaxMemory  If a server or server manager's memory usage exceeds this value it will kill itself and be restarted
 * @property {Boolean}  config.rns.serverHeapDump   Produce a periodic heapdump in server manager
 */

/********************************************************************/           
/*                                                                                    
/*  Modification log                                                                  
/*  ================                                                                  
/*                                                                                    
/*  Inits  Date    Modification                                                       
/*  =====  ====    ============                                                       
/*                               
/********************************************************************/


module.exports.rns = { 
    
    version:    "6.08",
    
    serverName: "rns-node", 

    // Bus (message queue) provider
    busProvider: "busmq",
    
    aeskey:     "ReNais5anceAe5Ky" , 
    
    developers: ["rnsadmin"],  
    
    developer:  process.env.DEVELOPER || null,
    support:    process.env.SUPPORT || null,
    
    
    generateDocs: true, 
     
    heapdumpInterval: null,  
    
    sessionBypass: ["testharness","xminit","xm0000","xm0058"],

     
    /*
    admins: [{
        username:   "rnsadmin",
        password:   "itsasecret"
    }],
    */
    
    serverMaxMemory:    1024*1024*400,
    serverHeapDump:     false,
    
    queueTestHarness: false,
    bootstrapTestHarness: null,

    autoAddFunctions: false,
     
    hideloggedinusers:  false,
         
    migrateConfig: false, 
    
    
    environments: {        
        rnsdta: {
                    host:       'localhost',
                    port:       5432,
                    user:       'renaissance',
                    password:   'Hercule2',
                    database:   'rnsdta',  
                    debug:      6000, // The server manager debug port.  All servers launched by the manager will listen on a port incremented from this  
                    data:       null,       
        },
    }, 
    
     
    //DKIM: {
    //  domainName: "renaissanceframework.com", 
    //  keySelector: "default",
    //  privateKey: "default.renaissanceframework.com.pem"	
    //},
   
   
    listenerPrefix: "rns",
     
   
};
