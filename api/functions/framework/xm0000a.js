/**        
 *   @Module        xm0000a                                                             
 *   @Description   Chromis login supplementary process                    
 *   @Author        Kevin Turner                                            
 *   @Date          Mar 2016                                                         
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
     * Globals
     */
    me:         Utility.getName(module),   
    dataout:    {},
    datain:     null,
    action:     null,
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
        self.MOD=handles.MOD;
        self.datain=datain;
        self.action=datain.action.toLowerCase();     
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
        self.MOD.initialise(self.me,datain,self.action=="chk",function(err){
            
            // If we have an "err" then pass it back
            if (err) {
                cb(err);
            }
            else {
                // Clear out the messages
                self.MOD.Message.initialise();
                
                // Do local initialisation here
                //..... 
                                    
                // Run the callback
                cb();
            }             
           
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
        
        
        switch (self.action) {
            
            case "chk":
                // Check that the user exists in the environment and that they are active
                //sails.log.debug("looking for "+self.MOD.get("user"))
                xuser.findOne(self.MOD.get("user")).exec(function(err,user){
                    self.MOD.set("ok",true);
                    var now=new Date();
                    now.setHours(0,0,0,0);
                    if (user) {                        
                        // Make sure the user is active
                        if (user.xusactive=="A") {
                            // Valid from a certain date?
                            if (user.xusvalidfr && user.xusvalidfr.getTime()>0) {
                               if (user.xusvalidfr.getTime()>now.getTime()) {
                                   self.MOD.set("msg","User fails 'valid from date' check");
                                   self.MOD.set("ok",false);
                               }                                  
                            }
                            if (user.xusvalidto && user.xusvalidto.getTime()>0) {
                               if (user.xusvalidto.getTime()<now.getTime()) {                                  
                                   self.MOD.set("msg","User fails 'valid to date' check");
                                   self.MOD.set("ok",false);
                               }                                  
                            }
                        }
                        else {
                            self.MOD.set("msg","User not active");
                            self.MOD.set("ok",false);
                        }
                    }
                    else {                        
                        self.MOD.set("msg","User not found in database");
                        self.MOD.set("ok",false);
                    }
                    
                    // If we are OK, get the description from the config
                    if (self.MOD.get("ok")) {
                        xenv.findOne("GLOBAL").exec(function(err,envdta){
                            if (envdta) {
                                self.MOD.set("desc",envdta.name);
                            }
                            // Run the callback
                            cb();
                        })
                    }
                    else {
                        // Run the callback
                        cb(); 
                    }  
                })
                break;
            
            case "get": 
                xuser.findOne(self.MOD.get("user")).exec(function(err,user){
                    self.MOD.set("user",user);
                    xenv.findOne("GLOBAL").exec(function(err,envdta){
                        self.MOD.set("env",envdta);
                        cb();       
                    })   
                })                   
                break; 
                   
            default: 
                // Run the callback
                cb();   
                break;   
        } 
        
         
             
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
 

