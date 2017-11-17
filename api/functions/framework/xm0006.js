/**        
 *   @Module        xm0006                                                             
 *   @Description   Chromis widget preferences model handler                    
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
        self.MOD.setModelLocking(false);
        self.MOD.initialise(self.me,datain,true,function(err){
            
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
        
        var prefs={};
        prefs.xwpuser=self.SES.user.xususer;
        prefs.xwpwidg=self.MOD.get("name");
                
        switch (self.action) {
            case "init":
                // Run the callback
                cb();   
                break;
            case "get":
                // Derive key for widget preferences
                //sails.log.debug("getting "+self.MOD.get("name"))
                //sails.log.debug(prefs)
                xwprefs.findOne({where:prefs}).exec(function(err,options){
                   
                    if (err) {
                        sails.log.error(err);
                        cb();
                    }                    
                    if (!options || !options.xwpjson) {
                        //self.MOD.set("options",{});
                        //cb();
                        if (!options) options={};
                        if (!options.xwpjson) options.xwpjson="{}";
                    }
                     
                    // Put the function title in the options if we have a context
                    try {
                        options.xwpjson=JSON.parse(options.xwpjson);
                        //sails.log.debug("ok "+self.MOD.get("name"))
                    }
                    catch(e) {
                        sails.log.error("Invalid options: "+options.xwpjson);
                        options.xwpjson={};
                    }
                    var context=self.MOD.get("context")
                    if (context) {
                        var func=context.split(".")[0];
                        self.Func.getDescription(func,function(err,desc){
                            options.xwpjson.title=desc; 
                            self.MOD.set("options",options.xwpjson);                                
                            cb()
                        })
                    }
                    else {
                        self.MOD.set("options",options.xwpjson);    
                        cb();       
                    }
                     
                                       
                }) 
                break;
             
            case "set":
               // Get widget prefs
               var o=self.MOD.get("options");
               if (!o) {
                   o={};
               }
               xwprefs.findOne({where:prefs}).exec(function(err,options){ 
                    if (!options) {                        
                        prefs.xwpjson=JSON.stringify(o);  
                        xwprefs.create(prefs).exec(function(err,newPrefs){
                            if (err) {
                                sails.log.error(err)
                            }
                            cb()
                        })
                    }
                    else {
                        var xwp={};
                        if (options.xwpjson) {
                            if (typeof options.xwpjson=="string") {
                                try {
                                    xwp=JSON.parse(options.xwpjson);
                                }
                                catch(e) {
                                    xwp={};
                                }
                            }
                            else {
                                xwp=options.xwpjson;
                            }
                        }
                        prefs.xwpjson=JSON.stringify(_.extend(xwp,o));
                        xwprefs.update(options.id,prefs).exec(function(err){
                            if (err) {
                                sails.log.error(err)
                            }
                            cb();
                        })
                    } 
                                         
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