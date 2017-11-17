/**           
 *   @Module        xm0010                                                             
 *   @Description   Chromis main screen model request handler                      
 *   @Author        Kevin Turner                                            
 *   @Date          Jan 2016                                                         
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
        self.MOD.initialise(self.me,datain,self.action=="init",function(err){
            
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
                self.MOD.set("userid",self.SES.user.xususer);
                self.MOD.set("username",self.SES.user.xusname);
                self.MOD.set("hidesession",!self.SES.user.developer);
                cb();
                break;
            case "logout":
                self.dataout.resultCode=-930;  // Logout
                // Destroy the session
                var sessionId=self.SES.getToken();
                self.SES.kill(function(err,res){
                    // Get number of users remaining online and
                    // trigger the usersonline event for websockets
                    self.SES.activeUsers(function(err,users){
                        var usersonline={usersonline:(users)?users.length:0};
                        WS.triggerEvent("usersonline",usersonline);   
                    })                    
                    // Delete any locks for this session
                    //xlock.destroy({xslsession:sessionId}).exec(function(){});
                    Lock.releaseAllLocks(self.SES.getToken(),cb);
                })
                break;
            case "gettoken":
                // Get the API token for the profile
                xprofile.findOne({username:self.SES.user.xususer})
                    .populate("passports")
                    .then(function(profile){
                        if (profile) {
                            // A user may have several passports so pick one with 
                            // an access token
                            var accessToken;
                            _.forEach(profile.passports,function(passport,p){
                                if (passport.accessToken) {
                                    accessToken=passport.accessToken;
                                    return false;
                                }
                            })
                            self.MOD.set("accesstoken",Crypto.encrypt(accessToken));
                            cb()
                        }
                        else {
                            return null;
                        }
                    })                   
                    .catch(function(err){
                        sails.log.error(err)
                        cb()
                    }) 
                break;
            default:
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