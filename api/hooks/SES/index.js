
//********************************************************************/           
//*   Description : Chromis Session Services  
//*                 See: https://www.npmjs.com/package/redis-sessions
//*                 We use normal express sessions for the most part (req.session.foo)
//*                 but as we cannot access that easily in a back-end server we use 
//*                 a separate store for that. This info gets added to/from the req.session
//*                 by the server and the RouteController        
//*   Author      : Kevin Turner                                            
//*   Date        : Feb 2016                                                  
//*                                                                                    
//********************************************************************/           
//*                                                                                    
//*  Modification log                                                                  
//*  ================                                                                  
//*                                                                                    
//*  Inits  Date     Modification                                                       
//*  =====  ====     ============     
//*  GO     20/05/16 Typo on rlserr - change to rlsErr                                             
//*                               
//********************************************************************/



module.exports = function SES(sails) {
    
    /**
     * @class hook.SES
     * @description Chromis Session Services
     * @author  Kevin Turner
     */
    function SES() {
        // Private class variables
        this.RedisSession = require("redis-sessions");
        this.RedisSession.prototype.auth = function(pass){
            this.redis.auth(pass);
        }
        this.token=null;
        this.rs=null;
        this.env=null;
        this.user=null; 
        this.lock=null;
    }

    /**
     * Private hook globals
     */
    var uuid=require("uuid");   
    
   /**
    * Private hook functions
    */ 
    
    
    
    // Prototype methods for class
    SES.prototype={
        /**
         * @name            hook.SES.initialise
         * @method
         * @description     Initialise session handling
         * @param   {Boolean} creator Pass "true" if the process is the the one that will also be creating the session.
         *                            This will mean it will be responsible for wiping expired sessions on the "wipe" 
         *                            interval.  If this is a back-end server (a user of the session but not the creator)
         *                            then pass false. 
         * @param   {Function} callback
         */
        initialise: function(creator,cb){
            var self=this;
            if (!self.rs) {
                var wipe=(creator)?(60*60):0; // Every hour or not at all
                self.rs=new self.RedisSession({
                    host:       sails.config.session.host,
                    port:       sails.config.session.port,
                    namespace:  sails.config.session.namespace,
                    wipe:       wipe,              
                });    
                // Authenticate
                if (sails.config.session.pass) {
                    self.self.rs.auth(sails.config.session.pass)
                }
            }       
           
            Mutex.initialise()
            
            if (cb)
                cb()
        }, 
    
        /**
         * @name            hook.SES.createSession
         * @method
         * @description     Create session for a request
         * @param   {Object} req  Request object
         * @param   {Boolean} creator Pass "true" if the process is the the one that will also be creating the session.
         *                            This will mean it will be responsible for wiping expired sessions on the "wipe" 
         *                            interval.  If this is a back-end server (a user of the session but not the creator)
         *                            then pass false. 
         * @param   {Function} callback
         */
        createSession: function(req,creator,cb){
            var self=this;
            var sessionToken=uuid.v4();                         
            self.initialise(creator,function(){
                self.create(sessionToken,req.ip,function(err,resp){
                    req.options.token=JWT.issue({sessionToken:resp.token});
                    //sails.log.debug("New session token "+resp.token)
                    //sails.log.debug("New JWT created "+req.options.token)
                    self.set("jwt",req.options.token,function(){
                        cb();
                    });                
                })    
            }); 
        },
    
        /**
         * @name            hook.SES.create
         * @method
         * @description     Create session
         * @param   {String} clientSessionId  Unique identifier (usually the session id)
         * @param   {String} clientIP    client IP address
         * @param   {Function} callback
         */
        create: function(clientSessionId,clientIP,cb){
            var self=this;
            // Create the session
            self.rs.create({
                app:    "sess",
                id:     clientSessionId,
                ip:     clientIP,
                ttl:    sails.config.session.sessionExpiry,  
                d:  {
                    authenticated:  false,
                    expired:        false,
                },
            },
            function(err,resp){
                if (err) {
                    sails.log.error(err)
                } 
                self.setToken(resp.token);
                if (cb) cb(err,resp)   
            }) 
        }, 
    
        /**
         * @name            hook.SES.kill
         * @method
         * @description     Kill a session
         * @param   {Function} callback
         */
        kill: function(cb){
            var self=this;
            // Kill the session
            if (self.token) {
                    self.rs.kill({
                    app:    "sess",  
                    token:  self.token,
                },
                function(err,resp){
                    if (err) {
                        sails.log.error(err)
                    }  
                    if (cb) cb(err,resp)   
                }) 
            }
            else {
                if (cb) cb(new Error("Cannot kill session. No token provided"),null)
            }
        }, 
        
    
        /**
         * @name            hook.SES.setToken
         * @method
         * @description     Sets session token so that we have the current session in memory 
         * @param   {String} token 
         */
        setToken: function(token){
            this.token=token;
        }, 
        
        /**
         * @name            hook.SES.getToken
         * @method
         * @description     Get a session token 
         * @return  {String} 
         */
        getToken: function(){
            return this.token;
        }, 
        
        
    
        /**
         * @name            hook.SES.setAll
         * @method
         * @description     Set a session to an object (containing simple values) 
         * @param   {Object} object Object to set 
         * @param   {Function} callback
         */
        setAll: function(object,cb){
            var self=this;
            // Traverse the object and stringify nested objects
            var d={};
            var k=0;
            _.forEach(object,function(val,key){
                k++;
                if (typeof val=="object") {
                    if (val==null)
                        d[key]=null;
                    else    
                        d[key]="@@OBJ@@."+JSON.stringify(val);
                }
                else {
                    d[key]=val;
                }
            })
            if (k==0) {
                if (cb) cb(null,null)
            }
            else {
                if (!self.token) {
                    sails.log.error("Error persisting session with no token");
                }
                else {
                    /*
                    //sails.log.debug(d)
                    self.rs.set({
                        app:    "sess",
                        token:  self.token,
                        d:      d,            
                    },
                    function(err,resp){
                        if (err) {
                            sails.log.error(err)
                        } 
                        if (cb) cb(err,resp)
                    }) 
                    */
                    self.set(d,cb);
                }            
            }
            
        }, 
        
        /**
         * @name            hook.SES.getAll
         * @method
         * @description     Get a session object  
         * @param   {Function} callback
         * @return   {Object}  
         */
        getAll: function(cb){
            var self=this;
            self.rs.get({
                app:    "sess",
                token:  self.token,                        
            },
            function(err,resp){
                if (err) {
                    sails.log.error(err)
                } 
                if (cb) {
                    if (!resp || !resp.d) {
                        // Must be dead or expired
                        // Delete any locks for this session
                        Lock.releaseAllLocks(self.token,function(err){
                            cb(err,null)
                        });                   
                    }
                    else {
                        // Traverse the object and parse objects
                        var session={}
                        _.forEach(resp.d,function(val,key){
                            if (typeof val == "string" && val.substr(0,8)=="@@OBJ@@.") {
                                session[key]=JSON.parse(val.substr(8));
                            }
                            else {
                                session[key]=val;
                            }
                        });
                        cb(err,session);
                    }                           
                }
            }) 
        }, 
        
        /**
         * @name            hook.SES.set
         * @method
         * @description     Set a session value
         * @param   {String} key    The key
         * @param   {Object} value  The value 
         * @param   {Function} callback
         */
        set: function(key,value,cb){
            var self=this;   
            
            // Before we try to update a session we must have exclusive
            // access to it.
            // Set mutex options. We only want the mutex to hang around
            // for a maximum of 10 seconds, and the maximum we will 
            // wait for a mutex to become available is 5 seconds
            var opts={
                duration:   10000,
                maxWait:    5000,
            }
            Mutex.lock(self.token,opts,function(err,lock){
                self.lock=lock;
                
                // Throw any errors
                if (err) {
                    throw err
                }
                
                // Update the session
                var d={};
            
                // Possibly to pass an object as the key. if so
                // then value must be a callback (or null) and cb 
                // must be null
                if (typeof key=="string") {
                    if (typeof value=="object") {
                        value="@@OBJ@@."+JSON.stringify(value)   
                    }            
                    d[key]=value;
                }
                else {
                    if (typeof key=="object") {
                        if (!value || typeof value=="function") {
                            cb=value;
                            d=key;
                        }     
                        else {
                            var e=new Error("Invalid callback defined on SES.set.");
                        }
                    }
                    else {
                        var e=new Error("Invalid key sent to SES.set. Must be string or object.");
                        if (typeof value=="function") {
                            value(e)
                        }
                        else {
                            throw e
                        }
                    }
                }
                self.rs.set({
                    app:    "sess",
                    token:  self.token,
                    d:      d,            
                },
                function(err,resp){
                    if (err) {
                        sails.log.error(err)
                    } 
                    // Release lock
                    Mutex.unlock(self.lock,function(rlsErr){
                        if (rlsErr) {
                             sails.log.error(rlsErr)
                        }
                        // Now run the callback provided on SES.set
                        if (cb) cb(err,resp)
                    })
                    
                   
                }) 
            }); 
        }, 
        
        /**
         * @name            hook.SES.get
         * @method
         * @description     Get a session value. If no key supplied, the whole session is returned 
         * @param   {String} key  Key (or array of keys) 
         * @return  {Object} value
         * @param   {Function} callback
         */
        get: function(key,cb){
            var self=this;
            self.rs.get({
                app:    "sess",
                token:  self.token,                        
            },
            function(err,resp){
                if (err) {
                    sails.log.error(err)
                } 
                if (cb) {
                    if (!resp || !resp.d) {
                        // Must be dead or expired
                        // Delete any locks for this session
                        Lock.releaseAllLocks(self.token,function(err){
                            cb(err,null)
                        });   
                    }
                    else {
                        var val;
                        if (_.isArray(key)) {
                            val={};
                            _.forEach(key,function(attr,k){
                                if (typeof resp.d[attr]=="string" && resp.d[attr].substr(0,8)=="@@OBJ@@.") {
                                    val[attr]=JSON.parse(resp.d[attr].substr(8));
                                }
                                else {
                                    val[attr]=resp.d[attr];
                                }     
                            })
                        }
                        else {
                            if (resp.d[key]) {
                                if (typeof resp.d[key]=="string" && resp.d[key].substr(0,8)=="@@OBJ@@.") {
                                    val=JSON.parse(resp.d[key].substr(8));
                                }
                                else {
                                    val=resp.d[key];
                                }     
                            }   
                        }                        
                        cb(err,val);       
                    }                           
                }
            })
        }, 
        
                
        /**
         * @name            hook.SES.activeSessions
         * @method
         * @description     Get active sessions for a specific time period 
         * @param   {Integer} period Period of activity in seconds
         * @param   {Function} callback
         */
        activeSessions: function(period,cb){
            var self=this; 
            self.rs.soapp({
                app:    "sess",
                dt:     period,                        
            },
            function(err,resp){
                if (err) {
                   sails.log.error(err);
                   if (cb) cb(err,null);
                }
                else {
                    if (cb) cb(err,resp)                     
                }    
            });          
        },
        
        /**
         * @name            hook.SES.activeUsers
         * @method
         * @description     Get active users 
         * @param   {Function} callback
         */
        activeUsers: function(cb){
            var self=this; 
            self.activeSessions(999999999,function(err,resp){
                var users=[];
                if (resp) {
                    // Cycle through and store unique users
                    async.each(resp.sessions,function(session,next){
                        if (session && session.d && session.d.user && session.d.authenticated && !session.d.expired) {
                            var user;
                            if (typeof session.d.user=="string" && session.d.user.substr(0,8)=="@@OBJ@@.") {
                                user=JSON.parse(session.d.user.substr(8));
                            }
                            else {
                                user=session.d.user;
                            }     
                            if (users.indexOf(user.xususer)<0) {
                                users.push(user.xususer)
                            }
                        }
                        next();
                    },
                    function(err){
                        // All done
                        if (err) {
                            sails.log.error(err);                            
                        }
                        if (cb) cb(err,users);
                    })
                }
            })             
        },
        
        /**
         * @name            hook.SES.initialiseEnv
         * @method
         * @description     Initialise environment information in a object (from the session) for easy retrieval  
         * @param   {Function} callback
         */
        initialiseEnv: function(cb){
            var self=this;
            self.env={};
            self.user={};
            self.getAll(function(err,session){
                if (!err && session) {
                    self.env=session.env;
                    self.user=session.user;                    
                }
                cb();
            })
        }, 
        
        /**
         * @name            hook.SES.env
         * @method
         * @description     Expose environment specific session variables  
         * @param           variable Name of environment variable
         */
        env: function(variable){
            return this.env[variable];
        }, 
        
        
        /**
         * @name            hook.SES.duplicate
         * @method
         * @description     Duplicate a session into current session
         * @param   {String} token Session token to duplicate
         * @param   {Function} callback
         */
        duplicate: function(token,cb){
            var self=this;
            var currentToken=self.getToken();
            self.rs.get({
                app:    "sess",
                token:  token,                        
            },
            function(err,resp){
                if (err) {
                   sails.log.error(err);
                   if (cb) cb(err,null);
                }
                else {
                    self.rs.set({
                        app:    "sess",
                        token:  currentToken,
                        d:      resp.d,            
                    },
                    function(err,resp){
                        if (err) {
                            sails.log.error(err);                            
                        } 
                        if (cb) cb(err,resp)
                    }) 
                }    
            });
          
        },
    }
   
    
    // Expose hook public methods
    return {

        SES: SES, 

    };


};
