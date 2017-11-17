/**           
 *   @Module        xm0004                                                          
 *   @Description   Chromis role maintenance modal                    
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
                
                // Set mode to multidelete if mode is delete and we have more than one role.
                if (mode == "delete"){
                    if (Array.isArray(self.MOD.get("role"))) {
                        mode = "multidelete";
                        self.MOD.set("mode","multidelete");
                        
                        // This should be a message from the PR when it's working...
                        self.MOD.set("deleteText","Delete (" + self.MOD.get("role").length + ") records shown below?");
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
                
                // Init the role data into form if we are not in multidelete or create mode. 
                if (mode != "create" && mode != "multidelete") {
                    xrole.findOne({xrorole:self.MOD.get("role")}).exec(function(err,role){
                        var r={};
                        
                        // Dont put the roleid if we are in copy mode as this will need to be a new value.
                        if (mode != "copy") {
                            r.xrorole = role.xrorole;
                        }
                        
                        r.xrodesc = role.xrodesc;
                        r.xrostatus = role.xrostatus;
                        r.xrotype = role.xrotype;
                        
                        // Send our role object to model.
                        self.MOD.set("role",r);    
                                            
                        // Run the callback
                        cb();                                               
                    })             
                } else {
                    if (mode == "create"){
                        // If create mode then ensure we set a blank object into model ready for new values.
                        self.MOD.set("role",{});
                    }
                    
                    // Run the callback
                    cb();     
                }
                  
                break;
                
            case "showroles" :                 
                var newRoleArray=[]; 
                var existingRoleArray = self.MOD.get("role");   
                
                xrole.find({xrorole:existingRoleArray}).sort('xrorole ASC').exec(function(err,rawData){
                    _.forEach(rawData,function(role,i){
                        var r={};

                        r.xrorole   = role.xrorole;
                        r.xrodesc   = role.xrodesc || "";
                        
                        newRoleArray.push(r);
                    });
                    
                    // Send our array of role objects.
                    self.MOD.set("roles",newRoleArray);    
                                        
                    // Run the callback
                    cb();                                               
                }) 
                break; 
            
            case "set" :
                var mode = self.MOD.get("mode"); 
                var r = self.MOD.get("role");
            
                switch (mode) {
                    case "create" :
                        xrole.create({
                            xrorole:r.xrorole,
                            xrodesc:r.xrodesc,
                            xrostatus:r.xrostatus,
                            xrotype:r.xrotype
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
                        xrole.update({
                             xrorole:r.xrorole
                        },{
                            xrodesc:r.xrodesc,
                            xrostatus:r.xrostatus,
                            xrotype:r.xrotype
                        })
                        .exec(function(err,updated){
                            if (!err) {
                                self.MOD.set("navBack",true);
                            }
                            
                            // Run the callback
                            cb();                                                    
                        })
                        break;
                        
                    case "multidelete" :
                        xrole.destroy({xrorole:r}).exec(function(err){
                            if (!err) {
                                self.MOD.set("navBack",true);
                            }
                            
                            // Run the callback
                            cb();                                                    
                        })
                        break;
                        
                    case "delete" :
                        xrole.destroy({xrorole:r.xrorole}).exec(function(err){
                            if (!err) {
                                self.MOD.set("navBack",true);
                            }
                            
                            // Run the callback
                            cb();                                                    
                        })
                        break;
                        
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
