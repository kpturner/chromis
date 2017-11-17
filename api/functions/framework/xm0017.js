/**           
 *   @Module        xm0017                                                          
 *   @Description   Chromis PR value maintenance modal                    
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
                        
        switch (self.action) {
            case "init" :
                var mode = self.MOD.get("mode"); 
                
                // Set mode to multidelete if mode is delete and we have more than one prvalue.
                if (mode == "delete"){
                    if (Array.isArray(self.MOD.get("prvalue"))) {
                        mode = "multidelete";
                        self.MOD.set("mode","multidelete");
                        
                        // This should be a message from the PR when it's working...
                        self.MOD.set("deleteText","Delete (" + self.MOD.get("prvalue").length + ") records shown below?");
                    } else {
                        // This should be a message from the PR when it's working...
                        self.MOD.set("deleteText","Delete the record shown below?");
                    }    
                } 
                           
                
                // Set some vars that we use in RML for selecting what to display.            
                self.MOD.set("multiDeleteMode",(mode === "multidelete"));
                self.MOD.set("readonlyNonKey",(mode === "delete" || mode === "display" || mode === "translate"));
                self.MOD.set("readonlyKey",(mode !== "copy" && mode !== "create"));
                self.MOD.set("anyDeleteMode",(mode === "delete" || mode === "multidelete"));
                self.MOD.set("hideSave",(self.MOD.get("anyDeleteMode") || mode === "display"));
                self.MOD.set("translateMode", mode === "translate");
                
                // Set navBack to false. When this is set to true in backend, screen will navigate to caller.
                self.MOD.set("navBack",false);
                
                

                // Start off three IO functions.
                async.parallel([
                    function (callback) {
                        // Init the prvalue data into form if we are not in multidelete or create mode. 
                        if (mode != "create" && mode != "multidelete") {
                            xprvalue.findOne({where:{id:self.MOD.get("prvalue")}}).exec(function(err,prValue){
                                if (prValue) {
                                    if (mode == 'copy') {
                                        delete prValue.id;
                                    }
                                    
                                    // Send our prvalue object to model.
                                    self.MOD.set("prvalue",prValue);    
                                                        
                                    if (mode === "translate") {
                                        xtransvalue.findOne({where:{locale:self.MOD.get("transLocale"),pr:self.MOD.get("pr"),seq:prValue.seq}}).exec(function(err,translation){
                                            self.MOD.set("trans",translation);
                                            // Run the callback
                                            callback();                                             
                                        });       
                                    } else {
                                        callback();
                                    }             
                                } else {
                                    callback();
                                }                                  
                            });             
                        } else {
                            if (mode == "create"){
                                // If create mode then ensure we set an object with the known info into model ready for new values.
                                self.MOD.set("prvalue",{pr:self.MOD.get("pr")});
                            }
                            
                            // Run the callback
                            callback();     
                        }
                    },
                    function (callback) {
                        xlocale.find({where:{key:{not:"ENG"}}}).exec(function(err,rawData){
                            // Send our array of locale objects.
                            self.MOD.set("locales",rawData);         
                            // Run the callback
                            callback();                                             
                        });   
                    },
                    function (callback) {
                        xpr.findOne({app:"chromis",func:"*all",table:"",type:"C",attrib:mode}).exec(function(err,record){
                            // Send our pr text for mode to model.
                            if (record) {
                                self.MOD.set("maintainTitle",record.text);
                            }    
                            callback();                                               
                        })    
                    }],                    
                    // When the two functions are done above, we know we have the data we need to continue.
                    function alldone() {
                        // Run the callback for process function
                        cb();
                    }
                );
                  
                break;
                
            case "showprvalues" :                 
                var newPrValueArray=[]; 
                var existingPrValueArray = self.MOD.get("prvalue");   
                
                xprvalue.find({where:{id:existingPrValueArray}}).sort('seq ASC').exec(function(err,rawData){
                    _.forEach(rawData,function(prValue,i){
                        var r={};

                        r.seq   = prValue.seq;
                        r.text   = prValue.text;
                        r.entry   = prValue.entry;
                        
                        newPrValueArray.push(r);
                    });
                    
                    // Send our array of prvalue objects.
                    self.MOD.set("prvalues",newPrValueArray);    
                                        
                    // Run the callback
                    cb();                                               
                }) 
                break; 

            case "post" :
                if (self.MOD.get("_postbackfield") === "translang") {
                    xtransvalue.findOne({where:{locale:self.MOD.get("transLocale"),pr:self.MOD.get("pr"),seq:self.MOD.get("prvalue").seq}}).exec(function(err,translation){
                        if (!translation) {
                            translation = {};
                        } 

                        self.MOD.set("trans",translation);
                        // Run the callback
                        cb();                                           
                    });           
                } else {
                    cb();
                }

                break;
            
            case "set" :
                var mode = self.MOD.get("mode"); 
                var r = self.MOD.get("prvalue");

                if (!r.seq) {
                    self.MOD.Message.error("format0005","seq");
                    cb();
                    return;
                }
            
                switch (mode) {
                    case "create" :
                        xprvalue.create(r).exec(function(err,created){
                            if (!err) {
                                self.MOD.set("navBack",true);
                            }
                            
                            // Run the callback
                            cb();                                                    
                        })
                        break;
                        
                    case "edit" :
                        xprvalue.update({where:{id:r.id}},{
                            seq:r.seq,
                            text:r.text,
                            entry:r.entry,
                            icon:r.icon,
                            cndVal:r.cndVal
                        }).exec(function(err,updated){
                            if (!err) {
                                self.MOD.set("navBack",true);
                            }
                            
                            // Run the callback
                            cb();                                                    
                        })
                        break;
                        
                    case "multidelete" :
                        xprvalue.destroy({where:{id:r}}).exec(function(err){
                            if (!err) {
                                self.MOD.set("navBack",true);
                            }
                            
                            // Run the callback
                            cb();                                                    
                        })
                        break;
                        
                    case "delete" :
                        xprvalue.destroy({where:{id:r.id}}).exec(function(err){
                            if (!err) {
                                self.MOD.set("navBack",true);
                            }
                            
                            // Run the callback
                            cb();                                                    
                        })
                        break;
                        
                    case "copy" :
                        xprvalue.create(r).exec(function(err,created){
                            if (!err) {
                                self.MOD.set("navBack",true);
                            }
                            
                            // Run the callback
                            cb();                                                    
                        })
                        break;    

                    case "translate" :
                        var trans = self.MOD.get("trans");
                        var tranUpdate = {};

                        tranUpdate.text = trans.text;
                        tranUpdate.locale = self.MOD.get("transLocale");
                        tranUpdate.pr = r.pr;
                        tranUpdate.seq = r.seq;
                        tranUpdate.translationStamp = new Date();
                        tranUpdate.translationStamp = tranUpdate.translationStamp.toISOString();

                        // We don't care about the callback from this because if it fails it's not worth
                        // worrying about.. it's just a nice to have timestamp.
                        function stampPR(id,stamp){
                            xpr.update({where:{id:id}},{translationStamp:stamp}).exec(function(err,updated){});
                        }


                        xtransvalue.update({where:{id:trans.id}},tranUpdate).exec(function(err,updated){
                            if (!err) {
                                if (updated.length > 0) {
                                    stampPR(trans.pr,tranUpdate.translationStamp);
                                    self.MOD.set("navBack",true);
                                    cb();    
                                } else {
                                    xtransvalue.create(tranUpdate).exec(function(err,created){
                                        if (created) {
                                            stampPR(trans.pr,tranUpdate.translationStamp);
                                            self.MOD.set("navBack",true);
                                        }
                                        cb();       
                                    });      
                                }
                            } else {
                                // Run the callback
                              cb(); 
                            }                                                   
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
