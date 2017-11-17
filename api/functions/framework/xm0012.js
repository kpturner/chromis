/**           
 *   @Module        xm0012                                                          
 *   @Description   Chromis function role maintenance modal                    
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
            if (Array.isArray(self.MOD.get("funcrole"))) {
                mode = "multidelete";
                self.MOD.set("mode",mode);
                
                // This should be a message from the PR when it's working...
                self.MOD.set("deleteText","Delete (" + self.MOD.get("funcrole").length + ") records shown below?");
            } else {
                // This should be a message from the PR when it's working...
                self.MOD.set("deleteText","Delete the record shown below?");
            }    
        } 
        
        switch (self.action) {
            case "init":
                // Set the default sort order.
                self.MOD.set("sortorder", "asc");
                self.MOD.set("sortby", parentMode == "func" ? "xrorole" : "xfufunc");
                
                // Set vars for display based on mode.
                self.MOD.set("funcMode",(parentMode == "func"));
                self.MOD.set("roleMode",(parentMode == "role"));       
                self.MOD.set("addMode",(mode == "add"));
                self.MOD.set("multiDeleteMode",(mode == "multidelete"));
                self.MOD.set("deleteMode",(mode == "delete"));
                self.MOD.set("anyDeleteMode",(mode == "delete" || mode == "multidelete"));
                
                if (mode === "delete") {
                    var funcrole = {};
                
                    // Here we start off two functions for getting back role and func info.
                    async.parallel([
                        function (callback) {
                            var roleQuery = {};
                            
                            roleQuery = xrole.findOne({xrorole: (parentMode == "role")? parentModeFilter : self.MOD.get("funcrole")})
                            roleQuery.exec(function (err, role) {
                                funcrole.xrorole = role.xrorole;
                                funcrole.xrodesc = role.xrodesc;

                                // Tell async that this function is done
                                callback();
                            })
                        },
                        function (callback) {
                            var funcQuery = {};
                            
                            funcQuery = xfunc.findOne({xfufunc: (parentMode == "func")? parentModeFilter : self.MOD.get("funcrole")})
                            funcQuery.exec(function (err, func) {
                                funcrole.xfufunc = func.xfufunc;
                                funcrole.xfudesc = func.xfudesc;
                                
                                // Tell async that this function is done
                                callback();
                            })
                        }],
                        
                        // This function gets called when both functions above are done.
                        function allDone() {
                            self.MOD.set("funcrole",funcrole);
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
                var funcRoles = [];
                var records = [];
                var criteria = {};
                
                switch (mode) {
                    case "add" :
                        if (parentMode === "role") {
                            // If role mode then push the current role on as filter. We do this so we can use
                            // filter translation instead of working out which kind of criteria to build.
                            filters.push({ field: "xrfrole", fromValue: parentModeFilter, toValue: parentModeFilter });
                        } else if (parentMode === "func"){
                            // If func mode then push the current func on as filter. We do this so we can use
                            // filter translation instead of working out which kind of criteria to build.
                            filters.push({ field: "xrffunc", fromValue: parentModeFilter, toValue: parentModeFilter });
                        }
                        
                        // Now we get all existing func roles for the func or role (depending on what mode we are in).
                        query = xrfunc.find({ where: Filters.convertToCriteria(filters, "xrfunc",true) })
                        query.exec(function (err, rawData) {
                            _.forEach(rawData, function (record, i) {
                                // Dependant on mode, make a simple array so we can go get details for only ones not in array.
                                if (parentMode == "role") {
                                    funcRoles.push(record.xrffunc);        
                                } else if (parentMode == "func"){
                                    funcRoles.push(record.xrfrole);
                                }
                            });
                            
                            switch (parentMode) {
                                case "func":
                                    // Take func entered filters and apply them.
                                    criteria = Filters.convertToCriteria(filters, "xrole");
                                    
                                    if (funcRoles.length > 0) {
                                        // Create object for filtering by role ID if we dont already have one.
                                        if (criteria.xrorole === undefined) {
                                            criteria.xrorole = {};
                                        }
                                    
                                        // Add into criteria role IDs which are not in this array.
                                        criteria.xrorole["!"] = funcRoles;    
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
                                // Take func entered filters and apply them.
                                    criteria = Filters.convertToCriteria(filters, "xfunc");
                                    
                                    if (funcRoles.length > 0) {
                                        // Create object for filtering by func ID if we dont already have one.
                                        if (criteria.xfufunc === undefined) {
                                            criteria.xfufunc = {};
                                        }
                                        
                                        // Add into criteria func IDs which are not in this array.
                                        criteria.xfufunc["!"] = funcRoles;
                                    }
                                    
                                    query = xfunc.find().where(criteria)
                                        .sort(self.MOD.get("sortby") + " " + self.MOD.get("sortorder").toUpperCase())
                                        .skip(startRow - 1)
                                        .limit(rows);
                                    query.exec(function (err, rawData) {

                                        _.forEach(rawData, function (record, i) {
                                            var f = {};

                                            f.xfufunc   = record.xfufunc;
                                            f.xfudesc   = record.xfudesc || "";
                                            f.id = record.xfufunc;

                                            records.push(f);
                                        });

                                        // Send our array of func objects.
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
                        var existingArray = self.MOD.get("funcrole");   
                        var newArray = [];
                        
                        switch (parentMode) {
                            case "func":
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
                                xfunc.find({xfufunc:existingArray}).sort('xfufunc ASC').exec(function(err,rawData){
                                    _.forEach(rawData,function(func,i){
                                        var f={};

                                        f.xfufunc   = func.xfufunc;
                                        f.xfudesc   = func.xfudesc || "";
                                        
                                        newArray.push(f);
                                    });
                                    
                                    // Send our array of func objects.
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
                            case "func" : 
                                _.forEach(deleteRecords,function(record,i){
                                    deleteRecordsArray.push(record.xrorole);
                                });
                            
                                xrfunc.destroy({xrfrole:deleteRecordsArray,xrffunc:parentModeFilter}).exec(function(err){
                                    if (!err) {
                                        self.MOD.set("navBack",true);
                                    }
                                    cb();                                                    
                                })
                                
                                break;
                                
                            case "role" :
                                _.forEach(deleteRecords,function(record,i){
                                    deleteRecordsArray.push(record.xfufunc);
                                });
                            
                                xrfunc.destroy({xrffunc:deleteRecordsArray,xrfrole:parentModeFilter}).exec(function(err){
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
                        var deleteRecord = self.MOD.get("funcrole");
                        xrfunc.destroy({xrfrole:deleteRecord.xrorole,xrffunc:deleteRecord.xfufunc}).exec(function(err){
                            if (!err) {
                                self.MOD.set("navBack",true);
                            }
                            cb();                                                    
                        })
                        
                        break;
                        
                    case "add" :
                        var addRecords = self.MOD.get("selectedfuncrole");
                        
                        switch (parentMode) {
                            case "func" :
                                if (Array.isArray(addRecords)) {
                                    async.each(addRecords, function(record, callback) {
                                        xrfunc.create({
                                            xrfrole:record,
                                            xrffunc:parentModeFilter
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
                                    xrfunc.create({
                                        xrfrole:addRecords,
                                        xrffunc:parentModeFilter
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
                                        xrfunc.create({
                                            xrffunc:record,
                                            xrfrole:parentModeFilter
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
                                    xrfunc.create({
                                        xrffunc:addRecords,
                                        xrfrole:parentModeFilter
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
