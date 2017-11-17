/**        
 *   @Module        xmqusage                                                             
 *   @Description   Chromis queue usage - returns queue usage information to main server for caching
 *   @Author        Kevin Turner                                            
 *   @Date          Feb 2016                                                         
 */
                                                                                    
/********************************************************************           
/*                                                                                    
/*  Modification log                                                                  
/*  ================                                                                  
/*                                                                                    
/*  Inits  Date    Modification                                                       
/*  =====  ====    ============                                                       
/*                               
/********************************************************************/                   

module.exports =  {
    
    /**
     * Global variables   
     */        
    me:         Utility.getName(module),   
    dataout:    {},
    MOD:        null,
    
    /**
     * @name             run
     * @method
     * @description      Main procedure 
     * @param {Object}   datain The inbound data
     * @param {Object}   A map of handles to Framework objects
     * @param {Function} cb     Callback
     */
    run: function(datain,handles,cb) { 
        var self=this;   
        this.MOD=handles.MOD;   
        try {
            // Initialise the function
            this.initialise(datain,function(err){
                
                // If we have an error then pass it back to the client
                if (err) {
                    self.dataout.err=err;
                    self.finalise(function(){
                        cb(self.dataout);    
                    });   
                }
                else {                    
                    // Process data model   
                    self.process(function(){
                        
                        // Finalise matters and run the callback
                        self.finalise(function(){
                            // Pass back the payload and the delta model
                            cb(self.dataout);    
                        });                    
                        
                    });    
                }                
                        
            });
        }
        catch(err){  
            // Oops!            
            self.dataout.err=err;
            self.finalise(function(){
                cb(self.dataout);    
            });   
        }      
         
    },
    
    /**
     * @name             initialise
     * @method
     * @description      Initialisation
     * @param {Object}   datain The inbound data 
     * @param {Function} cb     Callback
     */
    initialise: function(datain,cb){
        var self=this;
        var action=(datain.action)?datain.action.toLowerCase():"set" 
        self.MOD.setModelLocking(false);
        self.MOD.initialise(self.me,datain,true,function(err){
            
            // If we have an "err" then pass it back
            if (err) {
                cb(err);
            }
            
            // Do local initialisation here
            //..... 
                       
            // Run the callback
            cb();
        });
    },
    
    /**
     * @name             process
     * @method
     * @description      Process the data  
     * @param {Function} cb     Callback
     */
    process: function(cb){
        var self=this; 
        
        //sails.log.debug("Looking for queue for function "+func);
        var func=self.MOD.get("func");
        xqueueusage.findOne(func)
            .then(function(qu){
                return qu;         
            })  
            .then(function(qu){
                if (!qu) {
                    // Try by prefix
                    sails.log.verbose("Looking for queue for prefix "+func.substr(0,2));
                    return xqueueusage.findOne(func.substr(0,2))                        
                } 
                else {
                    return qu
                }              
            })
            .then(function(qu){
                if (!qu) {
                    // Try default
                    sails.log.verbose("Looking for default queue");
                    return xqueueusage.findOne("default")
                } 
                else {
                    return qu
                }              
            })
            .then(function(qu){
                if (!qu) {
                    // Still haven't got much 
                    self.MOD.set("queue","default");
                    self.MOD.set("timeout",(24*60*60*1000));   
                    cb();                  
                } 
                else {
                    // Get the timeout if its set to default
                    if (qu.timeout=="default") { 
                        xqueue.findOne(qu.queue)
                            .then(function(foundQueue){
                                self.MOD.set("queue",foundQueue.name);
                                self.MOD.set("timeout",foundQueue.timeout);  
                                cb(); 
                            })
                            .catch(function(err){
                                sails.log.error(err);
                                cb(); 
                            })
                    }
                    else {
                        self.MOD.set("queue",qu.queue);
                        self.MOD.set("timeout",qu.timeout);     
                        cb();      
                    }                                          
                }     
                
                return null;
            })   
         
        
        
    },
    
     /**
     * @name             finalise
     * @method
     * @description      Finalise the function  
     * @param {Function} cb     Callback
     */
    finalise: function(cb){
        var self=this; 
        
        // Perform any local tidy up here
        //.....
        
        // Finish off.  VERY IMPORTANT!
        self.MOD.finalise(cb);   
             
    },
    
};
 
