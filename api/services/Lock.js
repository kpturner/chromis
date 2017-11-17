/***** BEGIN LICENCE BLOCK ***************************/                  
/* The initial developer of the code is Kevin Turner   */ 
/* kpturner.co.uk     */ 
/*                                                   */
/* Portions created by Kevin Turner Systems Ltd" are   */
/* Copyright (c) 2017 K P Turner Ltd.    */
/* All Rights Reserved.                              */
/***** END LICENCE BLOCK *****************************/   

/**      
 *   @class         service.Lock
 *   @description   Chromis Locking Services          
 *   @author        Kevin Turner                                            
 *   @date          Apr 2016                                                         
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
 
 

module.exports = { 
    
    SES: null,  // The session object
    
    /**
     * @name        service.Lock.initialise
     * @method
     * @description Initialise
     * @param   {String}    sessionid   Session id
     * @param   {Function} callback 
     */
    initialise: function(sessionId,cb) {
        var self=this;
        if (!this.SES) {
            this.SES=new sails.hooks.ses.SES()
        }  
        this.SES.initialise(false,function(){
            self.SES.setToken(sessionId);
            self.SES.initialiseEnv(cb);
        });       
    },

    /**
     * @name        service.Lock.requestLock
     * @method
     * @description  Request a lock on an entity
     * @param   {String}    sessionId       Session id       
     * @param   {String}    entity          Entity to lock
     * @param   {String}    entityKey       The key of the entity
     * @param   {String}    func            The function requesting the lock 
     * @param   {Boolean}   keepExisting    Keep existing locks during request
     * @param   {Integer}   wait            Wait time in milliseconds otherwise no wait
     * @param   {Boolean}   processLevel    Process level lock as opposed to user/session
     * @param   {Boolean}   releaseExplicit Only release lock when explicitly requested as opposed to when a session expires     
     * @param   {Function}  callback        Callback is passed any unexpected error and also the boolean result of the lock request.
     * If the lock fails it will also contain a JSON of the existing lock.
     * If the lock is successful it will also pass back the new lock details. 
     */
    requestLock: function(sessionId,entity,entityKey,func,keepExisting,wait,processLevel,releaseExplicit,cb){
        var self=this;
        self.initialise(sessionId,function(){
            var criteria={
                xslenviron: self.SES.env.db,
                xslentity:  entity,
                xslentkey:  entityKey, 
            }; 
            var user=self.SES.user;
            var whenToStop;
            
            // Request the lock
            function request() {
                var self=this;
                xlock.findOne(self.criteria)
                    .populate('xsluser')
                    .exec(function(err,lock){
                        if (err) {
                            self.cb(err)
                        }
                        else {
                            // Deal with result
                            self.resultCallback(
                                lock,
                                self.sessionId,
                                self.user,
                                self.whenToStop,
                                self.func,
                                self.keepExisting,
                                self.wait,
                                self.processLevel,
                                self.releaseExplicit,
                                self.criteria, 
                                self.cb
                            )
                        }
                    })
            }
            
            function processResult(
                    lock,
                    sessionId,
                    user,
                    whenToStop,
                    func,
                    keepExisting,
                    wait,
                    processLevel,
                    releaseExplicit,
                    criteria, 
                    cb
                ){
                    
                // Function to create a successful lock request    
                function createLock(cb){
                    
                    // Delete existing locks first if required
                    if (!keepExisting) {
                        var deleteCriteria={};
                        if (processLevel) {
                            deleteCritera.xslpid=process.pid;
                        }
                        else {
                            deleteCriteria.xslsession=sessionId
                        }
                        deleteCriteria.xslenviron=criteria.xslenviron;
                        deleteCriteria.xslentity=criteria.xslentity;
                        xlock.destroy(deleteCriteria)
                            .exec(function(err,dels){
                                if (err) {
                                    cb(err)
                                }
                                else {
                                    keepExisting=true; // Little trick to reuse this function
                                    createLock(cb);
                                }
                            })
                    }
                    else {
                        var lock=_.extend({},criteria);
                        lock.xslsession=sessionId;
                        lock.xslfunc=func;
                        lock.xsluser=user.xususer;
                        lock.xslrlsexp=releaseExplicit;
                        if (processLevel) {
                            lock.xslpid=process.pid;    
                        }                        
                        xlock.create(lock)
                            .exec(function(err,lock){
                                // Callback to say successful and pass the lock details too
                                cb(null,true,lock);
                            })    
                    }                  
                    
                }    
                    
                if (lock) {
                    // Session locks (the default) are actually ok if
                    // the session matches the current session and are 
                    // also OK if it is a process specific lock and the 
                    // process.pid matches
                    if ((processLevel && lock.xslpid==process.pid) || (!processLevel && lock.xslsession==sessionId)) {
                        createLock(cb);
                    } 
                    else {                 
                        // Potentially failed - but before declaring that see if we are allowed to wait and try again
                        if (wait) {
                            if (!whenToStop) {
                                whenToStop=new Date().getTime()+(wait?wait:0);
                            }
                            else {
                                var rt=whenToStop-new Date.getTime();
                                if (rt<=0) {
                                    // Timed out
                                    cb(null,false,lock);
                                }
                                else {
                                    // Try again in 1 second (or the remaining time)
                                    setTimeout(
                                        _.bind(request,{
                                            sessionId:      sessionId,
                                            user:           user,
                                            whenToStop:     whenToStop,
                                            func:           func,
                                            keepExisting:   keepExisting,
                                            wait:           wait,
                                            processLevel:   processLevel,
                                            releaseExplicit:releaseExplicit,
                                            criteria:       criteria,                
                                            resultCallback: processResult,
                                            cb:             cb
                                        })
                                    ,(rt>1000)?1000:rt) 
                                }
                            }
                        }
                        else {
                            // Failed
                            cb(null,false,lock);
                        }
                    }
                }
                else {
                    // Great!  No lock so return control to the caller
                    createLock(cb);
                }
               
            }
            
            // Request the lock
            _.bind(request,{
                sessionId:      sessionId,
                user:           user,
                whenToStop:     whenToStop,
                func:           func,
                keepExisting:   keepExisting,
                wait:           wait,
                processLevel:   processLevel,
                releaseExplicit:releaseExplicit,
                criteria:       _.extend({},criteria),                
                resultCallback: processResult,
                cb:             cb
            })(); 
            
            
        });
        
            
            
        
    }, 
   
    /**
     * @name        service.Lock.releaseLock
     * @method
     * @description  Request a lock on an entity
     * @param   {String}    sessionId       Session id       
     * @param   {String}    entity          Entity to lock
     * @param   {String}    entityKey       The key of the entity
     * @param   {Function}  callback        Callback is passed any unexpected error, otherwise the lock assumed to be 
     * successfully released 
     */
    releaseLock: function(sessionId,entity,entityKey,cb){ 
        var self=this;
        self.initialise(sessionId,function(){
            var criteria={
                xslenviron: self.SES.env.db,
                xslentity:  entity,
                xslentkey:  entityKey, 
            }; 
            xlock.findOne(criteria).exec(function(err,lock){
                if (err) {
                    cb(err)
                }
                else {
                    // Only delete if it belongs to the same session
                    if (lock) {
                        if (lock.xslsession==sessionId) {
                            lock.destroy();
                        }
                    }
                    cb()                    
                }
            })
        })    
        
    },
    
    /**
     * @name        service.Lock.releaseAllLocks
     * @method
     * @description  Request all locks for a session
     * @param   {String}    [sessionId]     Session id (pass as null to release all locks as opposed to all locks for a session)   
     * @param   {Function}  [callback]      Callback is passed any unexpected error, otherwise all locks assumed to be 
     * successfully released 
     */
    releaseAllLocks: function(sessionId,cb){ 
        var self=this;
        var criteria={};
        if (sessionId) {
            if (typeof sessionId=="function") {
                cb=sessionId;
            }
            else {
                criteria.xslsession=sessionId
            }
        } 
        xlock.find(criteria).exec(function(err,locks){
                if (err) {
                    if (cb) cb(err)
                }
                else {
                     async.each(locks,function(lock,next){
                        if (!lock.xslrlsexp) {
                            lock.destroy();                            
                        }
                        next();
                     },
                     function(err){
                         // All done
                         if (cb) cb(err)
                     })
                }
            })
    },
    
    /**
     * @name        service.Lock.locked
     * @method
     * @description  Check to see if an entity is locked
     * @param   {String}    sessionId       Session id      
     * @param   {String}    entity          Entity
     * @param   {String}    entityKey       The key of the entity   
     * @param   {Function}  [callback]      Callback is passed any unexpected error plus the locking object if it is found
     */
    locked: function(sessionId, entity, entityKey, cb){ 
        var self=this;
        self.initialise(sessionId,function(){
            var criteria={
                xslenviron: self.SES.env.db,
                xslentity:  entity,
                xslentkey:  entityKey, 
            }; 
            xlock.findOne(criteria)
                .populate('xsluser')
                .exec(function(err,lock){
                    if (err) {
                        cb(err)
                    }
                    else {
                        cb(null,lock);
                    }
            })
        })    
    },
   
};