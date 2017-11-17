/**           
 *   @Module        xm0002                                                        
 *   @Description   Chromis user maintenance modal                    
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
            case "init" :
                var mode = self.MOD.get("mode"); 
                
                // Set mode to multidelete if mode is delete and we have more than one user.
                if (mode == "delete"){
                    if (Array.isArray(self.MOD.get("user"))) {
                        mode = "multidelete";
                        self.MOD.set("mode","multidelete");
                        
                        // This should be a message from the PR when it's working...
                        self.MOD.set("deleteText","Delete (" + self.MOD.get("user").length + ") records shown below?");
                    } else {
                        // This should be a message from the PR when it's working...
                        self.MOD.set("deleteText","Delete the record shown below?");
                    }    
                } 
                           
                
                // Set some vars that we use in RML for selecting what to display.            
                self.MOD.set("multiDeleteMode",(mode === "multidelete"));
                self.MOD.set("readonlyNonKey",(mode === "delete" || mode === "display"));
                self.MOD.set("readonlyKey",(mode !== "copy" && mode !== "create"));
                self.MOD.set("anyDeleteMode",(mode === "delete" || mode === "multidelete"));
                self.MOD.set("hideSave",(self.MOD.get("anyDeleteMode") || mode === "display"));
                
                // Set navBack to false. When this is set to true in backend, screen will navigate to caller.
                self.MOD.set("navBack",false);
                
                // Init the user data into form if we are not in multidelete or create mode. 
                if (mode != "create" && mode != "multidelete") {
                    xuser.findOne({xususer:self.MOD.get("user")}).exec(function(err,user){
                        var u={};
                        var dateString = "";
                        
                        // Dont put the userid if we are in copy mode as this will need to be a new value.
                        if (mode != "copy") {
                            u.xususer = user.xususer;
                        }
                        
                        u.xusname = user.xusname;
                        u.xuslocale = user.xuslocale;
                        u.xusactive = user.xusactive;
                        u.xusemail1 = user.xusemail1;
                        u.xusemail2 = user.xusemail2;
                        u.xustype = user.xustype;
                        dateString = user.xusvalidfr.toISOString().substring(0,10);
                        u.xusvalidfr = (dateString != "1970-01-01" && dateString) ? dateString: "";
                        dateString = user.xusvalidto.toISOString().substring(0,10);
                        u.xusvalidto = (dateString != "1970-01-01" && dateString) ? dateString: "";
                        u.xusdftfunc = user.xusdftfunc;
                        u.xustheme = user.xustheme;
                        
                        // Set theme to model
                        self.MOD.set("theme",user.xustheme);
                        
                        // Send our user object to model.
                        self.MOD.set("user",u);    
                                            
                        // Run the callback
                        cb();                                               
                    })             
                } else {
                    if (mode == "create"){
                        // If create mode then ensure we set a blank object into model ready for new values.
                        self.MOD.set("user",{});
                    }
                    
                    // Run the callback
                    cb();     
                }
                  
                break;
                
            case "showusers" :                 
                var newUserArray=[]; 
                var existingUserArray = self.MOD.get("user");   
                
                xuser.find({xususer:existingUserArray}).sort('xususer ASC').exec(function(err,rawData){
                    _.forEach(rawData,function(user,i){
                        var u={};

                        u.xususer   = user.xususer;
                        u.xusname   = user.xusname || "";
                        
                        newUserArray.push(u);
                    });
                    
                    // Send our array of user objects.
                    self.MOD.set("users",newUserArray);    
                                        
                    // Run the callback
                    cb();                                               
                }) 
                break; 
            
            case "set" :
                var mode = self.MOD.get("mode"); 
                var u = self.MOD.get("user");
                u.xustheme = self.MOD.get("theme");
            
                switch (mode) {
                    case "create" :
                        xuser.create({
                            xususer:u.xususer,
                            xusname:u.xusname,
                            xuslocale:u.xuslocale,
                            xusactive:u.xusactive,
                            xusemail1:u.xusemail1,
                            xusemail2:u.xusemail2,
                            xustype:u.xustype,
                            xusvalidfr:u.xusvalidfr || new Date(0),
                            xusvalidto:u.xusvalidto || new Date(0),
                            xusdftfunc:u.xusdftfunc,
                            xustheme:u.xustheme
                        })
                        .exec(function(err,created){
                            if (!err) {
                                self.MOD.set("navBack",true);
                            }
                            
                            // Run the callback
                            cb();                                                    
                        })
                        break;
                        
                    case "edit" :
                        xuser.update({
                            xususer:u.xususer
                        },{
                            xusname:u.xusname,
                            xuslocale:u.xuslocale,
                            xusactive:u.xusactive,
                            xusemail1:u.xusemail1,
                            xusemail2:u.xusemail2,
                            xustype:u.xustype,
                            xusvalidfr:u.xusvalidfr || new Date(0),
                            xusvalidto:u.xusvalidto || new Date(0),
                            xusdftfunc:u.xusdftfunc,
                            xustheme:u.xustheme
                        })
                        .exec(function(err,updated){
                            if (!err) {
                                if ((updated.length==1) && (self.SES.user.xususer == updated[0].xususer)) {
                                    function finishUp(){
                                        self.MOD.set("navBack",true); 
                                        // Run the callback
                                        cb();  
                                    }
                                    
                                    self.SES.set("user",updated[0],function(err,resp) {
                                        finishUp();
                                    });   
                                } else {    
                                    finishUp();  
                                }
                            } else {
                                // Run the callback
                                cb();   
                            }                                                 
                        })
                        break;
                        
                    case "multidelete" :
                        xuser.destroy({xususer:u}).exec(function(err){
                            if (!err) {
                                self.MOD.set("navBack",true);
                            }
                            
                            // Run the callback
                            cb();                                                    
                        })
                        break;
                        
                    case "delete" :
                        xuser.destroy({xususer:u.xususer}).exec(function(err){
                            if (!err) {
                                self.MOD.set("navBack",true);
                            }
                            
                            // Run the callback
                            cb();                                                    
                        })
                        break;
                        
                    // TODO: A copy mode will need to be added which should create the user but also
                    // copy the user's roles and maybe other stuff.
                    
                    default :
                        cb();
                        break;   
                }
                
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
