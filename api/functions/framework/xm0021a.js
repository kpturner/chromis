/**           
 *   @Module        xm0021a                                                            
 *   @Description   Chromis user maintenance modal popup subfunction1                   
 *   @Author        Dan Williams                                            
 *   @Date          Apr 2016                                                      
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
    SES:        null,
    Func:       null,
     
    
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
        self.SES=handles.SES;
        self.Func=handles.Func; 
        self.datain=datain; 
        
        self.action=datain.action.toLowerCase();     
        try {
            // Initialise the function
            this.initialise(datain,function(err){
                
                // If we have an error then pass it back to the client
                if (err) {
                    self.dataout.err=err;
                    self.finalise(function(err){
                        cb(self.dataout);    
                    });   
                }
                else {                    
                    // Process data model   
                    self.process(function(){
                        
                        // Finalise matters and run the callback
                        self.finalise(function(err){
                            // Pass back the payload and the delta model
                            self.dataout.err=err;
                            cb(self.dataout);    
                        });                    
                        
                    });    
                }                
                        
            });
        }
        catch(err){  
            // Oops!            
            self.dataout.err=err;
            self.finalise(function(err){
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
        self.MOD.initialise(self.me,datain,(self.action=="init"),function(err){
            
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
            case "init":          
                // Get the user details for the selected ID.
                xuser.findOne({
                    xususer:self.MOD.get("user")
                })
                .exec(function(err,user){
                    var dateString = "";
                    
                    self.MOD.set("xususer",user.xususer);
                    self.MOD.set("xusname",user.xusname);
                    self.MOD.set("xuslocale",user.xuslocale);
                    self.MOD.set("xusactive",user.xusactive);
                    self.MOD.set("xusemail1",user.xusemail1);
                    self.MOD.set("xusemail2",user.xusemail2);
                    self.MOD.set("xustype",user.xustype);
                    dateString = user.xusvalidfr.toISOString().substring(0,10);
                    self.MOD.set("xusvalidfr",(dateString != "1970-01-01" && dateString) ? dateString: "");
                    dateString = user.xusvalidto.toISOString().substring(0,10);
                    self.MOD.set("xusvalidto",(dateString != "1970-01-01" && dateString) ? dateString: "");
                                       
                    // Run the callback
                    cb();                                                    
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
