/**           
 *   @Module        xm0014                                                          
 *   @Description   Chromis PR maintenance modal (delete)                    
 *   @Author        Dan Williams                                             
 *   @Date          May 2016                                                      
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
        var mode=self.MOD.get("mode");
                        
        switch (self.action) {
            case "init" :
                if (Array.isArray(self.MOD.get("pr"))) {
                    mode = "multidelete";
                    
                    // This should be a message from the PR when it's working...
                    self.MOD.set("deleteText","Delete (" + self.MOD.get("pr").length + ") records shown below?");
                } else {
                    mode = "delete";
                    
                    // This should be a message from the PR when it's working...
                    self.MOD.set("deleteText","Delete the record shown below?");
                }    
                
                self.MOD.set("mode",mode);
                
                // Set some vars that we use in RML for selecting what to display.            
                self.MOD.set("multiDeleteMode",(mode === "multidelete"));
                self.MOD.set("anyDeleteMode",(mode === "delete" || mode === "multidelete"));
                
                // Set navBack to false. When this is set to true in backend, screen will navigate to caller.
                self.MOD.set("navBack",false);
                
                // Init the pr data into form if we are in delete mode
                if (mode === "delete") {
                    var prid = parseInt(self.MOD.get("pr"));
                    xpr.findOne({where: {id:prid}}).exec(function(err,record){
                        var r={};
                        
                        r.func   = record.func;
                        r.table  = record.table;
                        r.type   = record.type;
                        r.attrib = record.attrib;
                        
                        r.id     = record.id;
                        
                        // Send our pr object to model.
                        self.MOD.set("pr",r);    
                                            
                        // Run the callback
                        cb();                                               
                    })             
                } else {
                    // Run the callback
                    cb();     
                }
                  
                break;
                
            case "showpr" :                 
                var newPrArray=[]; 
                var existingPrArray = self.MOD.get("pr");   
                
                xpr.find({where:{id:existingPrArray}}).sort('func ASC').exec(function(err,rawData){
                    _.forEach(rawData,function(record,i){
                        var r={};

                        r.func   = record.func;
                        r.table  = record.table;
                        r.type   = record.type;
                        r.attrib = record.attrib;
                        
                        r.id     = record.id;
                        
                        newPrArray.push(r);
                    });
                    
                    // Send our array of pr objects.
                    self.MOD.set("prs",newPrArray);    
                                        
                    // Run the callback
                    cb();                                               
                }) 
                break; 
            
            case "set" :
                var r = self.MOD.get("pr");
            
                switch (mode) {
                    case "multidelete" :
                        xpr.destroy({where:{id:r}}).exec(function(err){
                            if (!err) {
                                self.MOD.set("navBack",true);
                            }
                            
                            xprvalue.destroy({where:{pr:r.id}}).exec(function(err){
                                // Run the callback
                                cb();      
                            });                                                    
                        })
                        break;
                        
                    case "delete" :
                        xpr.destroy({where:{id:r.id}}).exec(function(err){
                            if (!err) {
                                self.MOD.set("navBack",true);
                            }
                            xprvalue.destroy({where:{pr:r.id}}).exec(function(err){
                                // Run the callback
                                cb();      
                            });                                                
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
