/**           
 *   @Module        xm0019a                                                          
 *   @Description   Chromis merge/replace modal                    
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
                var uploadedFile = self.MOD.get("mergejson");
                var listenerid = self.SES.token + "_xm0019_progress";

                self.MOD.set("selectedCreate","");
                self.MOD.set("selectedUpdate","");

                async.parallel([
                    function (paracb) {
                        xpr.findOne({app:self.SES.env.app,func:"*all",table:self.MOD.get("tableName"),type:"F",attrib:self.MOD.get("column1")}).exec(function(err,pr){
                            if (!err) {
                                self.MOD.set("col1label",pr.text);
                            }

                            paracb();
                        }); 
                    },
                    function (paracb) {
                        xpr.findOne({app:self.SES.env.app,func:"*all",table:self.MOD.get("tableName"),type:"F",attrib:self.MOD.get("column2")}).exec(function(err,pr){
                            if (!err) {
                                self.MOD.set("col2label",pr.text);
                            }

                            paracb();
                        });  
                    },
                    function (paracb) {
                        Database.differenceTable(self.MOD.get("tableName"),uploadedFile.fd,listenerid,function(toBeCreated,toBeUpdated){
                            self.MOD.set("toCreate",toBeCreated);
                            self.MOD.set("toUpdate",toBeUpdated);
                            // Have to do make extra copy of 'toUpdate' because 'id' attr gets wiped over with the datagrid's row id.
                            // This copy gets passed through to the main function.
                            self.MOD.set("toUpdateID",toBeUpdated);
                            paracb();        
                        });     
                    }],
                    
                    // When the three functions are done above, we know we have the data we need to continue.
                    function alldone() {
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
