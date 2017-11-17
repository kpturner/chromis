/**           
 *   @Module        xmdemo2                                                            
 *   @Description   Chromis file upload example                     
 *   @Author        Kevin Turner                                       
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
    fs:         require("fs"),
     
    
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
        
        self.action=(datain.action)?datain.action.toLowerCase():"upl";     
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
                    self.process(function(err){
                        if (err) self.dataout.err = err;
                        // Finalise matters and run the callback
                        self.finalise(function(err){
                            // Pass back the payload and the delta model
                            if (err) self.dataout.err = err;
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
        
        try {
            switch (self.action) {
                case "init":
                    // . . . . Do stuff
                    // Run the callback
                    cb();   
                    break;
                    
                case "upl":
                    // File(s) have been uploaded 
                    var uploadedFiles=self.MOD.get("uploadedFiles");
                    // We can acknowledge receipt straight away
                    // by passing back the information
                    self.MOD.set("files",uploadedFiles);               
                    cb();
                     
                    // Now we can retrieve the file(s) and do what we want
                    // with it/them.   In some case the callback would be 
                    // delayed until we have had a chance to do some checking. 
                    // Each element in "uploadedFiles" contains an object representing 
                    // an uploaded file.  The original file name is in the "filename"
                    // property and the full path to its actual temporary location/name is in the
                    // "fd" property
                                       
                    break;
                
                case "rmv":
                    // Remove file
                    self.fs.unlink(self.MOD.get("_upload_deletefile"),function(err){
                        cb(err)
                    })    
                    
                    break;
                    
                default:
                    // Run the callback
                    cb();  
                    break;     
            } 
        }
        catch(err) {
            cb(err)
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
