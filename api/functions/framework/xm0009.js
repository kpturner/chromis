/**           
 *   @Module        xm0009                                                          
 *   @Description   Chromis function maintenance modal                    
 *   @Author        Dan Williams                                             
 *   @Date          June 2016                                                      
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
                
                // Set mode to multidelete if mode is delete and we have more than one func.
                if (mode == "delete"){
                    if (Array.isArray(self.MOD.get("func"))) {
                        mode = "multidelete";
                        self.MOD.set("mode","multidelete");
                        
                        // This should be a message from the PR when it's working...
                        self.MOD.set("deleteText","Delete (" + self.MOD.get("func").length + ") records shown below?");
                    } else {
                        // This should be a message from the PR when it's working...
                        self.MOD.set("deleteText","Delete the record shown below?");
                    }    
                } 
                
                // Here we start off two functions for getting back group, app and module info.
                async.parallel([
                    function (callback) {
                        moduleQuery = xfuncmod.find().exec(function(err,rawData){
                            // Send our array of module objects.
                            self.MOD.set("modules",rawData);         
                            callback();                                            
                        });      
                    },
                    function (callback) {
                        appQuery = xapp.find().exec(function(err,rawData){
                            // Send our array of app objects.
                            self.MOD.set("apps",rawData);         
                            callback();                                            
                        });      
                    },
                    function (callback) {
                        groupQuery = xfuncgrp.find().exec(function(err,rawData){
                            // Send our array of group objects.
                            self.MOD.set("groups",rawData);         
                            callback();                                            
                        });      
                    }],
                    
                    // This function gets called when all functions above are done.
                    function allDone() {
                        // Set some vars that we use in RML for selecting what to display.            
                        self.MOD.set("multiDeleteMode",(mode === "multidelete"));
                        self.MOD.set("readonlyNonKey",(mode === "delete" || mode === "display"));
                        self.MOD.set("readonlyKey",(mode !== "copy" && mode !== "create"));
                        self.MOD.set("anyDeleteMode",(mode === "delete" || mode === "multidelete"));
                        self.MOD.set("hideSave",(self.MOD.get("anyDeleteMode") || mode === "display"));
                        
                        // Set navBack to false. When this is set to true in backend, screen will navigate to caller.
                        self.MOD.set("navBack",false);
                        
                        // Init the func data into form if we are not in multidelete or create mode. 
                        if (mode != "create" && mode != "multidelete") {
                            xfunc.findOne({xfufunc:self.MOD.get("func")}).exec(function(err,func){
                                
                                // Send our func object to model.
                                self.MOD.set("func",func);    
                                                    
                                // Run the callback
                                cb();                                               
                            })             
                        } else {
                            if (mode == "create"){
                                // If create mode then ensure we set a blank object into model ready for new values.
                                self.MOD.set("func",{});
                            }
                            
                            // Run the callback
                            cb();     
                        }   
                    }
                );
                  
                break;
                
            case "showfuncs" :                 
                var newfuncArray=[]; 
                var existingfuncArray = self.MOD.get("func");   
                
                xfunc.find({xfufunc:existingfuncArray}).sort('xfufunc ASC').exec(function(err,rawData){
                    _.forEach(rawData,function(func,i){
                        var f={};

                        f.xfufunc   = func.xfufunc;
                        f.xfudesc   = func.xfudesc || "";
                        
                        newfuncArray.push(f);
                    });
                    
                    // Send our array of func objects.
                    self.MOD.set("funcs",newfuncArray);    
                                        
                    // Run the callback
                    cb();                                               
                }) 
                break; 
            
            case "set" :
                var mode = self.MOD.get("mode"); 
                var f = self.MOD.get("func");
                
                if(f){
                    delete f.updatedAt;
                    delete f.createdAt;
                }
            
                switch (mode) {
                    case "copy" :
                    case "create" :
                        xfunc.create(f)
                        .exec(function(err,created){
                            if (!err) {
                                self.MOD.set("navBack",true);
                            }
                            
                            // Run the callback
                            cb();                                                    
                        });
                        break;
                        
                    case "edit" :
                        xfunc.update({xfufunc:f.xfufunc},f).exec(function(err,updated){
                            if (!err) {
                                self.MOD.set("navBack",true);
                            }
                            
                            // Run the callback
                            cb();                                                    
                        });
                        break;
                        
                    case "multidelete" :
                        xfunc.destroy({xfufunc:f}).exec(function(err){
                            if (!err) {
                                self.MOD.set("navBack",true);
                            }
                            
                            // Run the callback
                            cb();                                                    
                        });
                        break;
                        
                    case "delete" :
                        xfunc.destroy({xfufunc:f.xfufunc}).exec(function(err){
                            if (!err) {
                                self.MOD.set("navBack",true);
                            }
                            
                            // Run the callback
                            cb();                                                    
                        });
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
