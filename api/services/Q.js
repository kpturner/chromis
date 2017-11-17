/***** BEGIN LICENCE BLOCK ***************************/                  
/* The initial developer of the code is Kevin Turner   */ 
/* kpturner.co.uk     */ 
/*                                                   */
/* Portions created by Kevin Turner Systems Ltd" are   */
/* Copyright (c) 2017 K P Turner Ltd.    */
/* All Rights Reserved.                              */
/***** END LICENCE BLOCK *****************************/   

/**
 *   @Class         service.Q          
 *   @Description   Chromis Queue Services                    
 *   @Author        Kevin Turner                                            
 *   @Date          Jan 2016                                                         
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
var uuid = require('uuid');
var path = require('path');

var childProcess = require("child_process"); // Allows the child process to start in debug if the master is in debug
 


module.exports = { 
     
    bus:        null,
    backlog:    [],  // Backlog waiting for bus connection 
    quCache:    {},  // Queue usage cache
    envs:       {},  // Environments 
    outqs:      {},  // Output queues

    /**
     * @name         service.Q.startServerManagers
     * @method
     * @description  Start server managers
     */
    startServerManagers: function(){
        var self=this;
        // Each environment we are to serve is defined in config/chromis/environments
        if (!sails.config.chromis.environments) {
            self.envs.chromis="starting";
            self.startServerManager({},"chrdta")
        }     
        else {
            _.forEach(sails.config.chromis.environments,function(envdta,env){
                self.envs[env]="starting";
                self.startServerManager(envdta,env)
            })
        }
    }, 

    /**
     * @name         service.Q.startServerManager
     * @method
     * @param {Object} env   The environment object
     * @param {Object} name  Name of environment
     * @description  Start server manager
     */
    startServerManager: function(env,name){
        var self=this; 
        // Start a back-end server manager   
        var execArgv=[];
        // If we are in debug, make sure the server manager is in debug. All queue servers started
        // by the manager will also listen on a port that increments from this one.
        process.execArgv.forEach(function(arg){
            if (arg.indexOf("--debug")>=0) {
                // In debug mode
                execArgv.push("--debug="+(env.debug?env.debug.toString():"6000"));
            }
            else {
                execArgv.push(arg);
            }
        }) 
        
        var sman = childProcess.fork(path.join(path.dirname(__dirname),"processes","servermanager"),{
            execArgv: execArgv,
            env: {
                ENVNAME:        name,

                RNS_HOST:       sails.config.connections.chromisDb.host || 'localhost',
                RNS_PORT:       sails.config.connections.chromisDb.port || 5432,
                RNS_USER:       sails.config.connections.chromisDb.user || 'chromis',
                RNS_PASS:       sails.config.connections.chromisDb.password || 'Hercule2',
                RNS_DB:         sails.config.connections.chromisDb.database || 'chromis',
                RNS_POOLSIZE:   sails.config.connections.chromisDb.poolSize  || 5, 
                
                CHRDTA_HOST:    env.host || sails.config.connections.chrdtaDb.host || 'localhost',
                CHRDTA_PORT:    env.port || sails.config.connections.chrdtaDb.port || 5432,
                CHRDTA_USER:    env.user || sails.config.connections.chrdtaDb.user || 'chromis',
                CHRDTA_PASS:    env.password || sails.config.connections.chrdtaDb.password || 'Hercule2',
                CHRDTA_DB:      env.database || sails.config.connections.chrdtaDb.database || 'chrdta', 
                CHRDTA_POOLSIZE: env.poolSize || sails.config.connections.chrdtaDb.poolSized || 5, 
                
                REDIS_HOST:     process.env.REDIS_HOST || "localhost",
                REDIS_PORT:     process.env.REDIS_PORT || 6379,
                REDIS_PASS:     process.env.REDIS_PASS || "",
                REDIS_DB:       process.env.REDIS_DB || 0,             
                migrate:        sails.config.models.migrate,
                logLevel:       sails.config.log.level, 
            }
        });
        
        // Get updates from the server manager
        sman.on("message",function(parms){
            self.envs[parms.env]=parms.status;
            // If they have all started, and we are in migrate mode,
            // rebuild indexes for the RNS db
            sails.log.verbose("Received "+JSON.stringify(parms)+" from back-end server manager for "+parms.env);
            if (sails.config.models.migrate=="alter") {
                var doit=true;
                _.forEach(self.envs,function(env){
                    if (env!="ready") {
                        doit=false;
                        return doit;
                    }
                })
                if (doit) {
                    Utility.buildIndexes("chromis",function(){ 
                        var db=(process.env.CHRDTA_DB   || 'chrdta')
                        Utility.buildIndexes(db)
                    })                   
                }
            }
        })
        
        sman.on("exit",function(code, signal){
            var msg="Server Manager process "+sman.pid+" exited with code/signal "+code+"/"+signal ;  
            sails.log.debug(msg); 
            // Start another one!
            self.startServerManager(env,name);   
        })   
        
        // Every 10 minutes, clear the cache and let it reload
        setInterval(_.bind(function(){
            this.quCache={};
        }),1000*60*10);
        
   }, 
   
    /**
     * @name             service.Q.resetConnection
     * @method
     * @description      Reset the connection 
     * @param {Function}    [cb]    Callback
     */
    resetConnection: function(cb){
        var self=this;
        if (self.bus) {
            if (self.bus.isOnline()) {
                self.bus.once("offline",function(){
                    sails.log.debug("Bus for process "+process.pid+" is offline")
                    self.bus=null;
                    self.outqs={};
                    if (cb) cb();
                })
                self.bus.disconnect();
            }
            else {
                self.bus=null;
                self.outqs={};
                if (cb) cb();
            }
        }
        else {
            if (cb) cb();
        }
    },
   
    /**
     * @name             service.Q.execute
     * @method
     * @description      Execute a function 
     * @param {Object}   parms  Parameters
     * @param {Object}   cb         Object containing named callbacks 
     *                              of "onSuccess", "onError" and "onTimeout"
     * @param {Integer}  [timeoutOverride]    Timeout override in milliseconds
     */
    execute: function(parms,cb,timeoutOverride){
           
        var self=this;   
           
        var _execute=function(parms,cb){
            
            // Find out our args (could be bound to the context)
            if (arguments.length==0) {
                parms=this.parms;
                timeoutOverride=this.timeoutOverride;
                cb=this.cb
            }                    
                        
            // Execute on the right queue            
            self.executeQueue(parms,timeoutOverride,function(queueName,timeout){
                self.sendReceive(queueName,parms,timeout,cb)
            })
    
       }
       
       // Execute once we are connected to the bus
       var context={
           parms:               parms,
           timeoutOverride:     timeoutOverride,
           cb:                  cb
        };
       this.executeOnConnect(_.bind(_execute,context)); 
      
       
   },
   
    /**
     * @name             service.Q.executeOnConnect
     * @method
     * @description      Execute a back-end transaction after bus is connected 
     * @param {Function} cb     This should be a callback with context (created with _.bind()) so that I don't have to worry about parms
     */   
    executeOnConnect: function(cb) {
       // Only execute when the bus exists and is online
       var self=this;
       if (!this.bus) {  
            this.bus=Bus.create();
            //this.bus = this.Bus.create({redis:
            //    ['redis://'+
            //                        (sails.config.bus.pass?sails.config.bus.pass+"@":"")+
            //                        sails.config.bus.host+
            //                        ":"+
            //                        sails.config.bus.port+
            //                        (sails.config.bus.db?"/"+sails.config.bus.db:"")                
            //    ]  
            //});  
       }
       if (!this.bus.isOnline()) {
           //sails.log.debug("Bus is not online");
            if (!this.bus._connecting) {
                //sails.log.debug("Bus is not trying to connect yet");
                this.bus.once('online',function(){ 
                    sails.log.debug("Bus for process "+process.pid+" connected successfully"); 
                    self.bus._connecting=false;  
                    // execute backlog
                    _.forEach(self.backlog,function(cb,i){
                        //sails.log.debug("Running backlog callback")
                        cb();
                    }) 
                    this.backlog=[];                                
                })
                //sails.log.debug("Connecting Bus");
                this.bus._connecting=true;  
                this.bus.connect();                   
            }
            //sails.log.debug("Placing our callback into the backlog")          
            this.backlog.push(cb)          
       }
       else {
            cb()
       }      
    },       
   
    /**
     * @name             service.Q.executeQueue
     * @method
     * @description      Get queue name for function 
     * @param {Object}   parms  Parameters
     * @param {Integer}  [timeoutOverride]    Timeout override in milliseconds
     * @param {Function} cb     callback
     */
    executeQueue: function(parms,timeoutOverride,cb){
            
        var func=parms.func.toLowerCase();
        var self=this;
        
        // Before checking the database, check the cache
        if (this.quCache[func]) {
            sails.log.verbose("Using cached queue "+this.quCache[func].queue);
            cb(this.quCache[func].queue,this.quCache[func].timeout)
        }
        else {
            // Rather perversely, we need to go to the server to get the queue usage
            var defaultQ="default_"+(parms.env?parms.env:"chrdta");
            Q.sendReceive(defaultQ,{
                    func:   "xmqusage",
                    datain: {
                        model:  {
                            func:   func,
                        }    
                    }                   
                },
                30000,
                {
                    onSuccess: function(response){
                        //sails.log.debug(response) 
                        // Pull the model out of the response
                        var model=response.dataout.model;
                        self.quCache[func]={}
                        self.quCache[func].queue=model.queue+"_"+(parms.env?parms.env:"chrdta");
                        self.quCache[func].timeout=timeoutOverride?timeoutOverride:model.timeout;                       
                        cb(self.quCache[func].queue,self.quCache[func].timeout);
                    },
                    onTimeout: function(){
                        var err=new Error("Unable to get queue usage data for "+func);
                        sails.log.error(err);
                    },
                    onError: function(error){                    
                        sails.log.error(error)
                    }
                }) 
            
             
        }
    },
   
    /**
     * @name             service.Q.sendReceive
     * @method
     * @description      send and receive a transaction. If you are not interested in a response, do not pass a timeout or any callbacks 
     * @param {String}   queueName  
     * @param {Object}   parms      Parameters
     * @param {Integer}  timeout    Timeout in milliseconds (null means no timeout)
     * @param {Object}   cb         Object containing named callbacks 
     *                              of "onSuccess", "onError" and "onTimeout". 
     *     
     */
    sendReceive: function(queueName,parms,timeout,cb){
            
        var self=this;  
            
        var _sendData=function(){ 
             
            var me=this; 
            // We are attached to the server queue, so now consume a
            // unique return queue for our response - but only if we have a callback.
            if (cb) {
                var inq = me.outq.name.replace("out_","in_")+"_"+uuid.v4();
                var rq = self.bus.queue(inq);
                // Timer for timeout - only if it is required
                rq._to=null;
                if (me.timeout && me.cb) {                     
                    rq._timeoutFunc=_.bind(function(){
                         
                        if (this.callbacks.onTimeout && typeof this.callbacks.onTimeout=="function") {
                            rq._timedOut=true;
                            var response=this.parms;
                            response.status="timeout";
                            //response.outq=this.outq;
                            //sails.log.debug("timed out")                           
                            this.callbacks.onTimeout(response);
                            try {
                                rq.detach(true); // The boolean parameter is only relevant if rsmq is being used. It tells the function to delete the queue.     
                            }
                            catch(e) {
                                // Oh!
                            }
                            // Remove any model locks
                            if (this.parms.datain && this.parms.datain.token) {
                                var context=this.parms.func;
                                JWT.verify(this.parms.datain.token,function(err,token){
                                    if (token && token.sessionToken) {
                                        var m=new sails.hooks.mod.MOD();
                                        m.unlockModel(token.sessionToken,context); 
                                    }
                                })   
                            }                            
                            
                        }                        
                    },{outq:me.outq,parms:me.parms,callbacks:me.cb})
                    rq._to=setTimeout(rq._timeoutFunc,me.timeout);                
                }
                rq.on("attached", function() {
                    // Send the request
                    me.parms.outq=inq; // The server outq is my inq :)
                    //sails.log.debug(me.parms.func+" respond to me on "+inq)
                    me.outq.push(me.parms);                    
                });
                rq.on("message",function(response, id){
                    //sails.log.debug(response)  
                    if (!rq._timedOut) {
                        if (typeof response=="string")
                            response=JSON.parse(response)
                        if (response.func && response.func!=me.parms.func) {
                            sails.log.error(me.parms.func);
                            sails.log.error(response.func);
                        }
                        // We have our response so detach receive queue
                        rq.detach(true); // The boolean parameter is only relevant if rsmq is being used. It tells the function to delete the queue.  
                        //q.detach();
                        // Execute the callback and pass the response
                        clearTimeout(rq._to); 
                        rq=null;
                        if (response.status && response.status=="error") {
                            if (me.cb.onError && typeof me.cb.onError=="function")              
                                me.cb.onError(response);  
                        } 
                        else {
                            if (me.cb.onSuccess && typeof me.cb.onSuccess=="function")              
                                me.cb.onSuccess(response);  
                        }                             
                    } 
                })
                rq.on("detached",function(){
                    // There was a bug that was leaking data in the redis database
                    // https://github.com/capriza/node-busmq/issues/21
                    // This hack will remove them, but it may be superfluous to 
                    // requirements once resolved
                    //Utility.deleteRedisKeys("bus:queue:"+inq+":*",function(){
                    //    sails.log.debug("Orphaned queue data purged for "+inq)
                    //});     
                })    
                rq.on("error",function(error){
                    clearTimeout(rq._to); 
                    if (me.cb.onError && typeof me.cb.onError=="function")
                        me.cb.onError(error);
                })
                // Trap returned data
                // attach and consume
                rq.attach({ttl:1});
                rq.consume();     
            }
            else {
                // No callback so just send the request
                me.parms.outq=null; 
                me.outq.push(me.parms);
            }
        }
        
        var _sendOnConnect=function(){
            // Queue should exist. Is it attached? If not, make it so
            var me=this;
            var self=this.self;
            var queueName="out_"+this.queueName;
            if (!self.outqs[queueName]) {
                self.outqs[queueName]=self.bus.queue(queueName);
            }       
            var context={};
                context.outq=self.outqs[queueName];
                context.parms=me.parms;
                context.timeout=me.timeout;
                context.cb=me.cb;
            if (!self.outqs[queueName].isAttached()) {
                self.outqs[queueName].on('attached',_.bind(_sendData,context));                
                self.outqs[queueName].attach();    
            }
            else {
                _.bind(_sendData,context)();
            }    
        }
        
                
        // Execute once we are connected to the bus 
        var context={
            queueName:  queueName,
            parms:      parms,
            timeout:    timeout,            
            cb:         cb,
            self:       this};
        this.executeOnConnect(_.bind(_sendOnConnect,context)); 
        
   },
   
    /**
     * @name             service.Q.testHarness
     * @method
     * @description      Test harness for performance checking     
     */
    testHarness: function(func){ 
        
        sails.log.debug("Executing concurrent test harness");        
        var instance=0;
        var t=setInterval(_.bind(function(){
            instance++;
            if (instance>50) {
                clearInterval(t); 
            }
            else {
               
                //var instance=0;
                //while (instance<2) {
                    //instance+=1; 
                    var st=new Date().getTime();
                    sails.log.debug("Executing instance "+instance)                  
                    this.execute(
                    {
                        func:   "testharness",
                        datain: {message:"hello testharness", model:{instance: instance}},                       
                    },                   
                    {
                        onSuccess: function(response) {                            
                            sails.log.debug("test harness says '"+JSON.stringify(response)+"'");                                       
                            sails.log.debug("Instance "+response.dataout.model.instance+" took this long to complete: "+(new Date().getTime()-st)+"ms");                            
                        },
                        onTimeout: function(parms) {
                            sails.log.error("Instance "+parms.datain.instance+" timed out on "+parms.outq.name+"!");
                        },
                        onError: function(error){
                            sails.log.error("Instance "+instance+" has an error:");
                            sails.log.error(error);
                            Utility.diagnosticEmail(error,"Chromis Server Diagnostics");	
                        }
                    },
                    5000 // Override timeout to 5000ms
                )
            }            
        },this),100) 
   },
   
   
};