/**           
 *   @Module        xm0020                                                           
 *   @Description   Chromis user maintenance                     
 *   @Author        Daniel Williams                                             
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
    test:       {}, 
    
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
                    /*
                    self.test.foo="bar";
                    self.MOD.set("baz",self.test)
                    */
                    
                    cb();   
                    break;
            
                
                case "initusers":
                    // Load users  
                    
                    /*
                    self.test=self.MOD.get("baz");
                    sails.log.debug(self.test);
                    self.test.foo="baz";
                    sails.log.debug(self.MOD.get("baz"));
                    self.MOD.set("baz",self.test);
                    sails.log.debug(self.MOD.get("baz"));
                    sails.log.debug(self.MOD.delta());
                    */
                    
                    var rows = self.MOD.get("rows");
                    var page = self.MOD.get("page");
                    var startRow = self.MOD.get("startrow");
                    
                    var userQuery = xuser.find()
                                    .sort("xususer ASC")
                                    .skip(startRow)
                                    .limit(rows)
                                                
                    var users=[];                
                    userQuery.exec(function(err,rawData){
                        
                        _.forEach(rawData,function(user,i){
                            var u={};
                            var dateString = "";
                            //u.id        = user.xususer;   NOTE it is not necessary to pass "id" in the model. 
                            //                              The datagrid client creates that property if "id" has 
                            //                              been defined as the dataid of the grid. 
                            u.xususer   = user.xususer;
                            u.xusname   = user.xusname || "";
                            u.xusactive = user.xusactive;
                            u.theme     = user.xustheme || "";
                            u.xustype   = user.xustype;
                            u.xuslgstamp= user.xuslgstamp || "";
                            
                            // Converting the date to Ymd format. 
                            dateString = user.xusvalidfr.toISOString().substring(0,10).replace(/-/g, "");;
                            u.xusvalidfr = (dateString != "19700101" && dateString) ? dateString: "";
                            
                            users.push(u);
                        });
                        
                        // Send our array of user objects.
                        self.MOD.set("users",users);    
                        // Run the callback
                        cb();                                               
                    })
                    
                    break;
                
                case "initroles":
                    // Load user selected with all their roles
                    var uroles=[];
                    var uroleObj={};
                    uroleObj.id=self.MOD.get("id");
                    
                    // Get user roles
                    xurole.find({
                        xuruser:self.MOD.get("id")
                    })
                    .populate("xurrole") // Populates the xrole foreign key
                    .exec(function(err,userRoles){
                        uroleObj.roles=[];
                        _.forEach(userRoles,function(urole,r){
                            var role={};
                            role.id=self.MOD.get("id") + '_' + urole.xurrole.xrorole;
                            role.xususer=urole.xurrole.xrorole;
                            role.xusname=urole.xurrole.xrodesc;
                            uroleObj.roles.push(role);
                        })
                        uroles.push(uroleObj)
                        self.MOD.set("users",uroles);
                                        
                        // Run the callback
                        cb();                                                    
                    })
                    
                    break;
                    
                case "set":
                    // Update xuser based on the row which was edited in grid.
                    var update = self.MOD.get("update");
                    var allowedFields = ["xusname"]; // This is to protect fields that are not to be updated inline
                    
                    if (allowedFields.indexOf(update.field) >= 0) { 
                        var updateObj = {};
                        updateObj[update.field.toLowerCase()] = update.value
                        
                        xuser.update({
                            xususer:update.dataid
                        },
                            updateObj
                        )
                        .exec(function(err,updated){
                            // Run the callback
                            cb();                                                    
                        })                 
                        break;              
                    }
                    
                case "export":
                    
                        // We will do the export asyncronously and push the result via the data push listenerId
                        self.export(self.MOD.get("listenerid"),self.MOD.get("fileloc"),self.MOD.get("filename"))
                        
                        // Run the callback
                        cb();  
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
    
    /**
     * @name            export
     * @method
     * @description     Export fileloc
     * @param   {String}  listenerid    Name of the datapush listener (its handle)
     * @param   {String}  fileloc       File location
     * @param   {String}  filename      File name 
     *       
     */
    export: function(listenerid,fileloc,filename) {
        // Build a list of users
        xuser.find({
            select:["xususer","xusname","xusactive","xustheme","xustype","xuslgstamp","xusvalidfr"]
        })
        .sort("xususer ASC") 
        .exec(function(err,users){
            
            // The file location for this must be within the application itself
            var loc=require("path").join(sails.config.appPath,fileloc);
            
            CSV.generateCSV(fileloc,filename,users,{},function(err){
                if (err) {
                    sails.log.error(err)
                }
                else {
                    // Trigger the web socket event
                    var data={};
                    data.filename=require("path").join(fileloc,filename);
                    data.callback="function(){if (console) console.log('"+filename+" is ready')}";
                    data.ready=true;                    
                    WS.triggerEvent(listenerid,data,function(){ 
                    })
                }
            })
        })
    }
 
};
