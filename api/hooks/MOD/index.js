//********************************************************************/        
//*   @Description : Chromis Model Services  
//*   @Author      : Kevin Turner                                            
//*   @Date        : Feb 2016                                                  
//*                                                                                    
//********************************************************************/           
//*                                                                                    
//*  Modification log                                                                  
//*  ================                                                                  
//*                                                                                    
//*  Inits  Date    Modification                                                       
//*  =====  ====    ============                                                       
//*    KT 19/05/16  Make sure backbone model attributes that are objects are not set/get by reference otherwise the change: event cannot fire                           
//********************************************************************/

module.exports = function MOD(sails) {

    /**
     * @class   hook.MOD
     * @author  Kevin Turner
     * @description Chromis Model Services 
     * @param {Object} SES      An object instantiated from sails.hooks.SES.SES
     * @param {Object} Message  An object instantiated from sails.hooks.Message.Message
     */
    function MOD(SES,Message) {
        this.modelLocking=true,
        this.lock=null,
        this.context=null,
        this.model=null,
        this.d={};
        this.SES=SES;
        this.Message=Message;
    }

    /**
     * Private hook globals
     */
    var path=require("path");
    var Backbone=require("backbone");  
    const MODELNULL = "@@NULL@@"; 
    
   /**
    * Private hook functions
    */ 
    
    
    
    // Prototype methods for class
    MOD.prototype={
        /**
         * @name                hook.MOD.initialise
         * @method
         * @description         Model initialisation
         * @param {String}      context   Function context 
         * @param {Object}      model   The raw model
         * @param {Boolean}     init    Initialise model 
         * @param {Function}    callback
         */
        initialise: function(context,datain,init,cb){
            var self=this;
            self.context=context;
            self.lock=null; 
            self.model=new Backbone.Model();
            self.d={};
            
            /**
             * Private function to actually perform the initialisation 
             */
            function doit(){
                
                // Another private function to add to callback hell
                // to finish initialising
                function finishInit(){
                    
                    // Prepare to receive any changes 
                    function prep(m){
                    // Merge in the data received
                        m=_.extend(m,datain.model);
                        
                        // No listeners
                        self.model.off();
                        
                        // Set the model
                        self.model.set(m); 
                        
                        // Observe changes in the attributes
                        _.forEach(m,function(val,attr){
                            self.model.on("change:"+attr,function(model,value,options){
                                //sails.log.debug(attr+" has changed to '"+value+"'")
                                self.d[attr]=value;
                            })
                        })
                        // Callback
                        cb()     
                    }
                    
                    // If we are using model locking, get the existing model 
                    // from the session otherwise start afresh
                    var m={};
                    if (self.modelLocking) {   
                        self.SES.get(self.context+"_model",function(err,m){
                            if (!m) m={} 
                            prep(m);   
                        });                    
                    }
                    else {
                        prep(m);
                    }
                }
                
                // If "init" then we need to wipe out
                // the cached version of the context's model
                if (init) {
                    // If we are using model locking then this indicates that 
                    // the model can be shared across multiple servers, so 
                    // session storage is required
                    if (self.modelLocking) {                        
                        self.SES.set(self.context+"_model",{},function(){
                            finishInit();
                        })
                    }
                    else {
                        finishInit();
                    }
                }
                else {
                    finishInit();
                }
                
                
            }
            /***************************************************************/
            
            
            // Note that now we are using backbone.js locally there should be no need for model locking
            if (self.modelLocking) {
                // If model locking is enabled it is because we are using a 
                // shared resource for storing model data (like a database).
                // Multiple servers may be trying to run the same
                // context at the same time.  We cannot allow that, so suspend
                // this process until we can get exclusivity on the model
                self.lockModel(function(err,lock){ 
                    if (err) {
                        cb(err)
                    }  
                    else {
                        doit()
                    }
                })     
            }
            else {
                doit();
            }

        }, 
    
    
        /**
         * @name                hook.MOD.finalise
         * @method
         * @description         Model finalisation 
         * @param {Function}    callback
         */
        finalise: function(cb){
            var self=this;
            
            // Add in messages (if there are any)
            self.set("errors",self.Message.errors);
            self.set("errcount",self.Message.errorCount());
            self.set("msgq",self.Message.msgs);
            self.set("msgcount",self.Message.infoCount());
            
            function finish(err){
                // If we are using model locking then this indicates that 
                // the model can be shared across multiple servers, so 
                // session storage is required
                if (self.modelLocking) {   
                    self.SES.set(self.context+"_model",self.model.attributes,function(){
                        //if (self.context=="xm0006") {
                        //    sails.log.debug(self.models[self.context].model.attributes)
                        //    sails.log.debug(SES.session)
                        //}
                        //self.unlockModel(self.context);
                        self.unlockModel();
                        cb(err);          
                    });                   
                }
                else {
                    cb(err);    
                }       
            }
            
            
            function configData(){
                // Load up any extra table/config information requested
                var cfg=self.get("config");
                
                if (cfg) {
                    async.each(cfg,function(cfgDta,next){
                        var alias=cfgDta.cfgalias;
                        var aliasValue=self.get(alias);
                        if (!aliasValue || aliasValue=="*REFRESH") {
                            var t1=cfgDta.cfgfile.replace("TABLE:","");
                            var splits=t1.split("/");
                            var model=splits[splits.length-1].toLowerCase();
                            if (sails.models[model]) {
                                var criteria={};
                                try {
                                    if (cfgDta.where) {
                                        criteria.where=JSON.parse(cfgDta.where.replace(RegExp("'","g"),'"'));
                                    }
                                    if (cfgDta.sort) {
                                        var s;
                                        try {
                                            s=JSON.parse(cfgDta.sort.replace(RegExp("'","g"),'"'));    
                                        }
                                        catch(e){
                                            s=cfgDta.sort
                                        }
                                        criteria.sort=cfgDta.sort
                                    }
                                    if (cfgDta.limit) {
                                        criteria.limit=cfgDta.limit
                                    }
                                    if (cfgDta.skip) {
                                        criteria.skip=cfgDta.skip
                                    }
                                    if (cfgDta.fields) {
                                        criteria.select=cfgDta.fields.split(",");
                                    } 
                                    if (cfgDta.select) {
                                        criteria.select=JSON.parse(cfgDta.fields.replace(RegExp("'","g"),'"'));
                                    } 
                                    var query=sails.models[model].find(criteria); 
                                    if (cfgDta.populate) {
                                        query.populate(cfgDta.populate)
                                    }                      
                                    // Get the data
                                    query.exec(function(err,data){
                                        self.set(alias,data);
                                        next(err);
                                    })
                                }
                                catch(err) {
                                    next(err)
                                }
                            }   
                            else {
                                sails.log.debug("No such model as "+model+" exists. Unable to augment response with requested data");
                                next();
                            }       
                        }
                        else {
                            next()
                        }                                  
                    },
                    function(err){
                        // All done
                        finish(err);
                    })
                }
                else {
                    finish();
                }
            }
            
            // Locks...
            var locks = self.get("locks");
            
            if (locks) {
                async.each(locks,function(lock,next){
                    
                    function finish(obtained,lock,lockObj,cb){
                        self.set(lock.lockalias,obtained);
                        if (!lock.silent && !obtained) {
                            // Error messages
                            self.Message.error(
                                lock.errorcode,
                                [],
                                [lockObj.xslentkey,lockObj.xsluser.xususer,lockObj.xsluser.xusname]
                            )
                        }
                        cb();
                    }
                    
                    if (lock.checkonly) {
                        // Check if lock exists    
                        Lock.locked( self.SES.token,
                                    lock.entity,
                                    lock.entitykey,
                            function(err,lockObj){
                                var obtained=(lockObj)?true:false;
                                if (err) {
                                    next(err);    
                                }
                                else {
                                    finish(obtained,lock,lockObj,next);
                                }
                            }
                        )
                    } else {
                        //Obtain a lock 
                        Lock.requestLock(self.SES.token,
                                        lock.entity,
                                        lock.entitykey,
                                        lock.contextoverride,
                                        lock.keepexisting,
                                        lock.secondstowait*1000,
                                        false,
                                        false,
                            function(err,obtained,lockObj){
                                if (err) {
                                    next(err);    
                                }
                                else {
                                    finish(obtained,lock,lockObj,next);
                                }
                            }
                        )
                    }
                   
                }
                ,function(err){
                    if (err) {
                        sails.log.error(err)
                    }
                    // All done, so get config data
                    configData();
                });    
            } 
            else {
                // Get config data
                configData();
            }
            
        }, 
        
        /**
         * @name                hook.MOD.setModelLocking
         * @method
         * @description         Set a model locking to true or false 
         * @param {Boolean}     locking Model locking value
         */
        setModelLocking: function(locking){
            var self=this; 
            self.modelLocking=locking;             
        }, 
        
        /**
         * @name                hook.MOD.set
         * @method
         * @description         Set a model value 
         * @param {String}      attr  Attribute
         * @param {Any}         value Value 
         * @param {Boolean}     [force] Force the value to appear in the delta even if it has not changed
         */
        set: function(attr,value,force){
            var self=this; 
             
            if ((self.modelLocking && self.lock)||(!self.modelLocking)) {
                // If it is a new attribute stick it in the delta and create a listener
                if (!self.model.attributes[attr]) { 
                    //self.d[attr]=value;
                    self.model.on("change:"+attr,function(model,value,options){
                        //sails.log.debug(attr+" has changed to '"+value+"'")
                        self.d[attr]=value;
                    })   
                }
                // If object, make sure we don't just reference the same thing
                if (typeof value=="object") {
                    self.model.set(attr,JSON.parse(JSON.stringify(value)));
                }
                else {
                    self.model.set(attr,value);     
                } 
                if (force) {
                    self.d[attr]=value;
                }    
            }  
                
        }, 
        
        /**
         * @name                hook.MOD.get
         * @method
         * @description         Get a model value 
         * @param {String}      attr  Attribute
         * @return {Any} 
         */
        get: function(attr){
            var self=this;
            var value;
            if (self.modelLocking) {
                value=(self.lock)?self.model.get(attr):null;    
            } 
            else {
                value=self.model.get(attr);
            }  
            // If object, make sure we don't just reference the same thing
            if (typeof value=="object") {
                value=JSON.parse(JSON.stringify(value))
            }          
            // Decrypt the value if required
            if (Crypto.isEncryptionJson(value)) {
                value=JSON.parse(value);
                value=Crypto.decrypt(value.ct,value.iv);
            }
            return value;  
        }, 
        
        /**
         * @name                hook.MOD.getFuncName
         * @method
         * @description         Get function name 
         * @param {String}      module  Module path (module.filename or __filename)
         * @return {String} 
         */
        getFuncName: function(mod){
            return mod.slice(__filename.lastIndexOf(path.sep)+1, module.filename.length -3)
        }, 
    
        /**
         * @name            hook.MOD.delta
         * @method
         * @description     Returns the delta model after the function has run 
         * @return   {Object}
         */
        delta: function(){
            var self=this;
            var model;
            if (self.model && self.d) {
                model=_.extend({},self.d);
                /*
                // Add attributes from main model that are not in the delta yet.  These are new!
                _.forEach(self.model.attributes,function(value,attr){
                    if (!self.d[attr]) {
                        model[attr]=value
                    }
                });   
                */
                ////model=self.models[self.context].model.changedAttributes(); // Only relevant after each "set"
                model=(model===false)?{}:model;     
            }
            return model
        }, 
        
        
        /**
         * @name                hook.MOD.lockModel
         * @method
         * @description         Lock the model and then run the callback 
         * @param {Function}    cb  callback  
         */
        lockModel: function(cb){
            
            var self=this;
            
            // Sometime we have no self.context
            if (!self.context) {
                cb();
                return;
            }
            
            Mutex.initialise();            
            
            // Lock the mutex if we can. Wait for a maximum of 15 seconds.  let the 
            // lock die naturally after 30 seconds if the server dies or something.
            var opts={
                duration:   30000,
                maxWait:    15000,
            }
            
            Mutex.lock(self.SES.token+":"+self.context,opts,function(err,lock){
                self.lock=lock;
                cb(err,lock);
            });            
            
        }, 
        
        
        /**
         * @name                hook.MOD.unlockModel
         * @method
         * @description         Unlock the model and then run the callback 
         * @param {String} [token]      Session token
         * @param {String} [context]    Context (function) 
         */
        unlockModel: function(token, context){
            var self=this;
            
            // We may be asked to release a specific lock
            if ((token && !context)||(!token && context)) {
                throw new Error("Cannot unlock model. Both session token and context are required")
            }

            if (token && context) {
                var key=sails.config.mutex.prefix+":"+token+":"+context;
                Utility.deleteRedisKeys([key],function(){
                    sails.log.verbose("Lock released for "+token+":"+context);
                })
            }
            else {
                if (self.lock) {
                    Mutex.unlock(self.lock,function(err){
                        if (err) {
                            sails.log.error(err)
                        }
                        else {
                            sails.log.verbose("Lock released for "+self.lock);
                        }
                    })
                }    
            }           
            
        }, 
    }
   
    
    // Expose hook public methods
    return {

        MOD: MOD, 

    };


};
