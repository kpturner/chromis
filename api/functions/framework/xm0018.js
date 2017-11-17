/**           
 *   @Module        xm0018                                                          
 *   @Description   Chromis PR merge/replace modal                    
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
                var listenerid = self.SES.token + "_xm0018_progress";
                self.MOD.set("listenerid",listenerid);

                 cb();
                 break;

            case "confirm" :
                async.parallel([
                    function (paracb) {
                        var selectedCreate = self.MOD.get("selectedCreate");
                        var toCreate = self.MOD.get("toCreate");
                        
                        if (selectedCreate !== undefined && selectedCreate !== "") { 
                            if (Array.isArray(selectedCreate)) {
                                async.each(selectedCreate, function(recordIndex, callback) {
                                    var prvaluesToCreate = toCreate[recordIndex].prvalues; 
                                    
                                    delete toCreate[recordIndex].index;
                                    delete toCreate[recordIndex].prvalues;
                                    delete toCreate[recordIndex].id;
                                    xpr.create(toCreate[recordIndex]).exec(function(err,created){
                                        if (err) {
                                            callback(err);
                                        } else {
                                            async.each(prvaluesToCreate, function(prvalueToCreate, prvalueCallback) {
                                                delete prvalueToCreate.id;
                                                prvalueToCreate.pr = created.id;
                                                xprvalue.create(prvalueToCreate).exec(function(err,created){
                                                    prvalueCallback();        
                                                });  
                                            }, function(err){
                                                // Run the callback
                                                callback();       
                                            });
                                        }                                                        
                                    })     
                                }, function(err){
                                    // Run the callback
                                    paracb();       
                                });
                            } else {
                                var prvaluesToCreate = toCreate[selectedCreate].prvalues;
                                
                                delete toCreate[selectedCreate].index;
                                delete toCreate[selectedCreate].prvalues;
                                delete toCreate[selectedCreate].id;
                                xpr.create(toCreate[selectedCreate]).exec(function(err,created){
                                    async.each(prvaluesToCreate, function(prvalueToCreate, prvalueCallback) {
                                        delete prvalueToCreate.id;
                                        prvalueToCreate.pr = created.id;
                                        xprvalue.create(prvalueToCreate).exec(function(err,created){
                                            prvalueCallback();        
                                        });  
                                    }, function(err){
                                        // Run the callback
                                        paracb();     
                                    });                                
                                })    
                            }
                        } else {
                            paracb();
                        } 
                    },
                    function (paracb) {
                        var selectedUpdate = self.MOD.get("selectedUpdate");
                        var toUpdate = self.MOD.get("toUpdate");
                        
                        if (selectedUpdate !== undefined && selectedUpdate !== "") { 
                            if (Array.isArray(selectedUpdate)) {
                                async.each(selectedUpdate, function(recordIndex, callback) {
                                    var prvaluesToUpdate = toUpdate[recordIndex].prvalues;
                                    delete toUpdate[recordIndex].index;
                                    delete toUpdate[recordIndex].prvalues;
                                    xpr.update({where:{id:toUpdate[recordIndex].id}},toUpdate[recordIndex]).exec(function(err,updated){
                                        if (err) {
                                            callback(err);
                                        } else {
                                            async.each(prvaluesToUpdate, function(prvalueToUpdate, prvalueCallback) {
                                                delete prvalueToUpdate.id;
                                                prvalueToUpdate.pr = updated[0].id;
                                                xprvalue.update({where:{pr:prvalueToUpdate.pr,seq:prvalueToUpdate.seq}},prvalueToUpdate).exec(function(err,updated){
                                                    if (updated[0] === undefined) {
                                                        xprvalue.create(prvalueToUpdate).exec(function(err,created){
                                                            prvalueCallback();        
                                                        });      
                                                    } else {
                                                        prvalueCallback();
                                                    }        
                                                });  
                                            }, function(err){
                                                // Run the callback
                                                callback();     
                                            });  
                                        }
                                                                                              
                                    })     
                                }, function(err){
                                    if (!err) {
                                        self.MOD.set("navBack",true);
                                    }
                                    
                                    // Run the callback
                                    paracb();       
                                });
                            } else {    
                                var prvaluesToUpdate = toUpdate[selectedUpdate].prvalues;
                                
                                delete toUpdate[selectedUpdate].index;                   
                                delete toUpdate[selectedUpdate].prvalues;
                                xpr.update({where:{id:toUpdate[selectedUpdate].id}},toUpdate[selectedUpdate]).exec(function(err,updated){
                                    if (!err) {
                                        self.MOD.set("navBack",true);
                                    }
                                    
                                    async.each(prvaluesToUpdate, function(prvalueToUpdate, prvalueCallback) {
                                        delete prvalueToUpdate.id;
                                        prvalueToUpdate.pr = updated[0].id;
                                        xprvalue.update({where:{pr:prvalueToUpdate.pr,seq:prvalueToUpdate.seq}},prvalueToUpdate).exec(function(err,updated){
                                            if (updated[0] === undefined) {
                                                xprvalue.create(prvalueToUpdate).exec(function(err,created){
                                                    prvalueCallback();        
                                                });      
                                            } else {
                                                prvalueCallback();
                                            }        
                                        });  
                                    }, function(err){
                                        // Run the callback
                                        paracb();     
                                    });                                      
                                })    
                            }
                        } else {
                            paracb();
                        }
                    }],
                    
                    // When the two functions are done above, we know we have the data we need to continue.
                    function alldone() {
                        self.MOD.set("navBack",true);
                        cb();   
                    }
                );

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
