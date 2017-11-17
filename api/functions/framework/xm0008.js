/**           
 *   @Module        xm0008                                                           
 *   @Description   Chromis user role maintenance modal                    
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


module.exports = {

    /**
     * Globals
     */
    me: Utility.getName(module),
    dataout: {},
    datain: null,
    action: null,
    MOD: null,
    SES: null,
    Func: null,


    /**
     * @name             run
     * @method
     * @description      Main procedure 
     * @param {Object}   datain The inbound data
     * @param {Object}   A map of handles to Framework objects
     * @param {Function} cb     Callback
     */
    run: function (datain, handles, cb) {
        var self = this;
        self.MOD = handles.MOD;
        self.SES = handles.SES;
        self.Func = handles.Func;
        self.datain = datain;

        self.action = datain.action.toLowerCase();
        try {
            // Initialise the function
            this.initialise(datain, function (err) {

                // If we have an error then pass it back to the client
                if (err) {
                    self.dataout.err = err;
                    self.finalise(function (err) {
                        cb(self.dataout);
                    });
                }
                else {
                    // Process data model   
                    self.process(function () {

                        // Finalise matters and run the callback
                        self.finalise(function (err) {
                            // Pass back the payload and the delta model
                            self.dataout.err = err;
                            cb(self.dataout);
                        });

                    });
                }

            });
        }
        catch (err) {
            // Oops!            
            self.dataout.err = err;
            self.finalise(function (err) {
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
    initialise: function (datain, cb) {
        var self = this;
        self.MOD.initialise(self.me, datain, (self.action == "init"), function (err) {

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
    process: function (cb) {
        var self = this;
        var mode = self.MOD.get("mode");
        var parentMode = self.MOD.get("parentMode");
        var parentModeFilter = self.MOD.get("parentModeFilter");
        
        // Set mode to multidelete if mode is delete and we have more than one role.
        if (mode == "delete"){
            if (Array.isArray(self.MOD.get("userrole"))) {
                mode = "multidelete";
                self.MOD.set("mode",mode);
                
                // This should be a message from the PR when it's working...
                self.MOD.set("deleteText","Delete (" + self.MOD.get("userrole").length + ") records shown below?");
            } else {
                // This should be a message from the PR when it's working...
                self.MOD.set("deleteText","Delete the record shown below?");
            }    
        } 
        
        switch (self.action) {
            case "init":
                // Set the default sort order.
                self.MOD.set("sortorder", "asc");
                self.MOD.set("sortby", parentMode == "user" ? "xrorole" : "xususer");
                
                // Set vars for display based on mode.
                self.MOD.set("userMode",(parentMode == "user"));
                self.MOD.set("roleMode",(parentMode == "role"));       
                self.MOD.set("addMode",(mode == "add"));
                self.MOD.set("multiDeleteMode",(mode == "multidelete"));
                self.MOD.set("deleteMode",(mode == "delete"));
                self.MOD.set("anyDeleteMode",(mode == "delete" || mode == "multidelete"));
                
                if (mode === "delete") {
                    var userrole = {};
                
                    // Here we start off two functions for getting back role and user info.
                    async.parallel([
                        function (callback) {
                            var roleQuery = {};
                            
                            roleQuery = xrole.findOne({xrorole: (parentMode == "role")? parentModeFilter : self.MOD.get("userrole")})
                            roleQuery.exec(function (err, role) {
                                userrole.xrorole = role.xrorole;
                                userrole.xrodesc = role.xrodesc;

                                // Tell async that this function is done
                                callback();
                            })
                        },
                        function (callback) {
                            var userQuery = {};
                            
                            userQuery = xuser.findOne({xususer: (parentMode == "user")? parentModeFilter : self.MOD.get("userrole")})
                            userQuery.exec(function (err, user) {
                                userrole.xususer = user.xususer;
                                userrole.xusname = user.xusname;
                                
                                // Tell async that this function is done
                                callback();
                            })
                        }],
                        
                        // This function gets called when both functions above are done.
                        function allDone() {
                            self.MOD.set("userrole",userrole);
                            cb();
                        }
                    );
                    
                } else {

                    // Run the callback
                    cb();
                }

                break;
                
            case "initgrid":
                var rows = self.MOD.get("rows");
                var page = self.MOD.get("page");
                var startRow = self.MOD.get("startrow");
                var filters = self.MOD.get("filters") || [];

                var query = {};
                var userRoles = [];
                var records = [];
                var criteria = {};
                
                switch (mode) {
                    case "add" :
                        if (parentMode === "role") {
                            // If role mode then push the current role on as filter. We do this so we can use
                            // filter translation instead of working out which kind of criteria to build.
                            filters.push({ field: "xurrole", fromValue: parentModeFilter, toValue: parentModeFilter });
                        } else if (parentMode === "user"){
                            // If user mode then push the current user on as filter. We do this so we can use
                            // filter translation instead of working out which kind of criteria to build.
                            filters.push({ field: "xuruser", fromValue: parentModeFilter, toValue: parentModeFilter });
                        }
                        
                        // Now we get all existing user roles for the user or role (depending on what mode we are in).
                        query = xurole.find({ where: Filters.convertToCriteria(filters, "xurole",true) })
                        query.exec(function (err, rawData) {
                            _.forEach(rawData, function (record, i) {
                                // Dependant on mode, make a simple array so we can go get details for only ones not in array.
                                if (parentMode == "role") {
                                    userRoles.push(record.xuruser);        
                                } else if (parentMode == "user"){
                                    userRoles.push(record.xurrole);
                                }
                            });
                            
                            switch (parentMode) {
                                case "user":
                                    // Take user entered filters and apply them.
                                    criteria = Filters.convertToCriteria(filters, "xrole");
                                    
                                    if (userRoles.length > 0) {
                                        // Create object for filtering by role ID if we dont already have one.
                                        if (criteria.xrorole === undefined) {
                                            criteria.xrorole = {};
                                        }
                                        
                                        // Add into criteria role IDs which are not in this array.
                                        criteria.xrorole["!"] = userRoles;
                                    }
                                
                                    query = xrole.find().where(criteria)
                                        .sort(self.MOD.get("sortby") + " " + self.MOD.get("sortorder").toUpperCase())
                                        .skip(startRow - 1)
                                        .limit(rows);
                                    query.exec(function (err, rawData) {

                                        _.forEach(rawData, function (record, i) {
                                            var r = {};

                                            r.xrorole = record.xrorole;
                                            r.xrodesc = record.xrodesc || "";
                                            r.id = record.xrorole;

                                            records.push(r);
                                        });

                                        // Send our array of role objects.
                                        self.MOD.set("griddata", records);

                                        // Run the callback
                                        cb();
                                    })
                                    
                                    break;

                                case "role":
                                // Take user entered filters and apply them.
                                    criteria = Filters.convertToCriteria(filters, "xuser");
                                    
                                    if (userRoles.length > 0) {
                                        // Create object for filtering by user ID if we dont already have one.
                                        if (criteria.xususer === undefined) {
                                            criteria.xususer = {};
                                        }
                                        // Add into criteria user IDs which are not in this array.
                                        criteria.xususer["!"] = userRoles;
                                    }
                                    
                                    query = xuser.find().where(criteria)
                                        .sort(self.MOD.get("sortby") + " " + self.MOD.get("sortorder").toUpperCase())
                                        .skip(startRow - 1)
                                        .limit(rows);
                                    query.exec(function (err, rawData) {

                                        _.forEach(rawData, function (record, i) {
                                            var u = {};

                                            u.xususer   = record.xususer;
                                            u.xusname   = record.xusname || "";
                                            u.id = record.xususer;

                                            records.push(u);
                                        });

                                        // Send our array of user objects.
                                        self.MOD.set("griddata", records);

                                        // Run the callback
                                        cb();
                                    })
                                    
                                    break;
                                    
                                default:
                                    // Run the callback
                                    cb();
                                    break;    
                            }    
                        })
                        
                        break;
                        
                    case "multidelete" :
                        var existingArray = self.MOD.get("userrole");   
                        var newArray = [];
                        
                        switch (parentMode) {
                            case "user":
                                xrole.find({xrorole:existingArray}).sort('xrorole ASC').exec(function(err,rawData){
                                    _.forEach(rawData,function(role,i){
                                        var r={};

                                        r.xrorole   = role.xrorole;
                                        r.xrodesc   = role.xrodesc || "";
                                        
                                        newArray.push(r);
                                    });
                                    
                                    // Send our array of role objects.
                                    self.MOD.set("griddata",newArray);    
                                                        
                                    // Run the callback
                                    cb();                                               
                                })     
                                
                                break;

                            case "role":
                                xuser.find({xususer:existingArray}).sort('xususer ASC').exec(function(err,rawData){
                                    _.forEach(rawData,function(user,i){
                                        var u={};

                                        u.xususer   = user.xususer;
                                        u.xusname   = user.xusname || "";
                                        
                                        newArray.push(u);
                                    });
                                    
                                    // Send our array of user objects.
                                    self.MOD.set("griddata",newArray);    
                                                        
                                    // Run the callback
                                    cb();                                               
                                }) 
                                
                                break;
                                
                            default:
                                // Run the callback
                                cb();
                                break;    
                        }
                        
                        break;
                        
                    default :
                        break;
                }
                
                break;

            case "set" :
                switch (mode) {
                    case "multidelete" :
                        var deleteRecords = self.MOD.get("griddata");
                        var deleteRecordsArray = [];
                    
                        switch (parentMode) {
                            case "user" : 
                                _.forEach(deleteRecords,function(record,i){
                                    deleteRecordsArray.push(record.xrorole);
                                });
                            
                                xurole.destroy({xurrole:deleteRecordsArray,xuruser:parentModeFilter}).exec(function(err){
                                    if (!err) {
                                        self.MOD.set("navBack",true);
                                    }
                                    cb();                                                    
                                })
                                
                                break;
                                
                            case "role" :
                                _.forEach(deleteRecords,function(record,i){
                                    deleteRecordsArray.push(record.xususer);
                                });
                            
                                xurole.destroy({xuruser:deleteRecordsArray,xurrole:parentModeFilter}).exec(function(err){
                                    if (!err) {
                                        self.MOD.set("navBack",true);
                                    }
                                    cb();                                                    
                                })
                                
                                break;
                                
                            default :
                                cb();
                                break;
                        }
                        
                        break;
                        
                    case "delete" :   
                        var deleteRecord = self.MOD.get("userrole");
                        xurole.destroy({xurrole:deleteRecord.xrorole,xuruser:deleteRecord.xususer}).exec(function(err){
                            if (!err) {
                                self.MOD.set("navBack",true);
                            }
                            cb();                                                    
                        })
                        
                        break;
                        
                    case "add" :
                        var addRecords = self.MOD.get("selecteduserrole");
                        
                        switch (parentMode) {
                            case "user" :
                                if (Array.isArray(addRecords)) {
                                    async.each(addRecords, function(record, callback) {
                                        xurole.create({
                                            xurrole:record,
                                            xuruser:parentModeFilter
                                        }).exec(function(err,created){
                                            if (err) {
                                                callback(err);
                                            } else {
                                                callback();
                                            }                                                        
                                        })     
                                    }, function(err){
                                        if (!err) {
                                            self.MOD.set("navBack",true);
                                        }
                                        
                                        // Run the callback
                                        cb();       
                                    });
                                } else {
                                    xurole.create({
                                        xurrole:addRecords,
                                        xuruser:parentModeFilter
                                    }).exec(function(err,created){
                                       if (!err) {
                                            self.MOD.set("navBack",true);
                                        }
                                        
                                        // Run the callback
                                        cb();                                     
                                    })    
                                }
                                
                                break;
                            case "role" :
                                if (Array.isArray(addRecords)) {
                                    async.each(addRecords, function(record, callback) {
                                        xurole.create({
                                            xuruser:record,
                                            xurrole:parentModeFilter
                                        }).exec(function(err,created){
                                            if (err) {
                                                callback(err);
                                            } else {
                                                callback();
                                            }                                                        
                                        })     
                                    }, function(err){
                                        if (!err) {
                                            self.MOD.set("navBack",true);
                                        }
                                        
                                        // Run the callback
                                        cb();       
                                    });
                                } else {
                                    xurole.create({
                                        xuruser:addRecords,
                                        xurrole:parentModeFilter
                                    }).exec(function(err,created){
                                        if (!err) {
                                            self.MOD.set("navBack",true);
                                        }
                                        
                                        // Run the callback
                                        cb();                                        
                                    })         
                                }
                                
                                break;
                            default :
                                cb();
                                break;
                        }
                        
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
    finalise: function (cb) {
        var self = this;

        // Perform any local tidy up here
        //.....

        // Finish off.  VERY IMPORTANT!
        self.MOD.finalise(cb);

    },

};
