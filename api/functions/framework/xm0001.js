/**           
 *   @Module        xm0001                                                           
 *   @Description   Chromis user list                     
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
            case "init":
		        // . . . . Do stuff
                // Set the default sort order.
                self.MOD.set("sortorder","asc");
                self.MOD.set("sortby","xususer");
                
                // Run the callback
                cb();   
                break;
            
                
            case "initusers":
                // Load users  
                var rows = self.MOD.get("rows");
                var page = self.MOD.get("page");
                var startRow = self.MOD.get("startrow");
                var filters = self.MOD.get("filters");
                
                var userQuery = {};                                            
                var users=[];    
                
                userQuery = xuser.find({ where : Filters.convertToCriteria(filters,"xuser")})
                                .sort(self.MOD.get("sortby") + " " + self.MOD.get("sortorder").toUpperCase())
                                .skip(startRow - 1)
                                .limit(rows);          
                userQuery.exec(function(err,rawData){
                    
                    _.forEach(rawData,function(user,i){
                        var u={};
                        var dateString = "";

                        u.xususer   = user.xususer;
                        u.xusname   = user.xusname || "";
                        u.xusactive = user.xusactive;
                        u.xuslgstamp= user.xuslgstamp || "";
                        
                        users.push(u);
                    });
                    
                    // Send our array of user objects.
                    self.MOD.set("users",users);    
                                        
                    // Run the callback
                    cb();                                               
                })   
                 
                break;

            case "export":
                Database.exportTable("xuser",self.MOD.get("selecteduser"),function(fileName){
                    self.MOD.set("downloaduri",fileName);
                    setTimeout(function(){
                        Database.deleteExportedTable(fileName);
                    }, 2000);
                    
                    cb();        
                });              
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
