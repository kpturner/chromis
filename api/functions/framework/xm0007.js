/**           
 *   @Module        xm0007                                                            
 *   @Description   Chromis user role list                     
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
        var modeFilter = self.MOD.get("modeFilter");

        switch (self.action) {
            case "init":
                // The order of these "if" statements is important
                if (self.MOD.get("previewMode")===true) {
                    self.MOD.set("smallCol","35%");
                    self.MOD.set("bigCol","65%");
                } else {
                    self.MOD.set("smallCol","10%");
                    self.MOD.set("bigCol","20%");
                }  
                // <--- Before here previewMode is only set by the passed in param 
                if (self.MOD.get("mode") !== "user" && self.MOD.get("mode") !== "role") {
                    self.MOD.set("previewMode",true);
                }
                // <--- After here previewMode may have been set because "mode" is not "user" or "role"
                if (self.MOD.get("previewMode")===true) {
                    self.MOD.set("fullMode",false);
                } else {
                    self.MOD.set("previewMode",false);
                    self.MOD.set("fullMode",true);
                } 
            
                // . . . . Do stuff
                // Set the default sort order.
                self.MOD.set("sortorder", "asc");
                self.MOD.set("sortby", mode == "user" ? "xrorole" : "xususer");

                // Set vars for display based on mode.
                self.MOD.set("userMode", (mode == "user"));
                self.MOD.set("roleMode", (mode == "role"));                

                switch (mode) {
                    case "user":
                        xuser.findOne({ xususer: modeFilter }).exec(function (err, user) {
                            if (!err && user) {
                                self.MOD.set("userName", user.xusname + " (" + user.xususer + ")");
                            }
                            
                            // Run the callback for process function
                            cb();
                        })

                        break;
                    case "role":
                        xrole.findOne({ xrorole: modeFilter }).exec(function (err, role) { 
                            if (!err && role) {
                                // Send our role object to model.
                                self.MOD.set("roleDesc", role.xrodesc + " (" + role.xrorole + ")");
                            }

                            // Run the callback for process function
                            cb();
                        })

                        break;
                }
                
                break;


            case "inituserroles":
                var rows = self.MOD.get("rows");
                var page = self.MOD.get("page");
                var startRow = self.MOD.get("startrow");
                var filters = self.MOD.get("filters") || [];
                var roles = [];
                var users = [];
 
                // Here we start off two functions for getting back role and user info.
                async.parallel([
                    function (callback) {
                        var roleQuery = {};
                        
                        // Push a filter on that we want. Do this to let filter translations do the work.
                        if (mode === "role") {
                            filters.push({ field: "xrorole", fromValue: modeFilter, toValue: modeFilter });
                        }
                        
                        // Convert our filters and execute the query.
                        // It will only convert filters which are fields in the specified table.
                        roleQuery = xrole.find({ where: Filters.convertToCriteria(filters, "xrole") })
                        roleQuery.exec(function (err, rawData) {
                            _.forEach(rawData, function (role, i) {
                                roles.push(role.xrorole);
                            });

                            // Tell async that this function is done
                            callback();
                        })
                    },
                    function (callback) {
                        var userQuery = {};
                        
                        // Push a filter on that we want. Do this to let filter translations do the work.
                        if (mode === "user"){
                            filters.push({ field: "xususer", fromValue: modeFilter, toValue: modeFilter });
                        }
                        
                        // Convert our filters and execute the query.
                        // It will only convert filters which are fields in the specified table.
                        userQuery = xuser.find({ where: Filters.convertToCriteria(filters, "xuser") })
                        userQuery.exec(function (err, rawData) {

                            _.forEach(rawData, function (user, i) {
                                users.push(user.xususer);
                            });

                            // Tell async that this function is done
                            callback();
                        })
                    }],
                    
                    // When the two functions are done above, we know we have the data we need to continue.
                    function alldone() {
                        var userRolesQuery = {};
                        var userRoles = [];
                        var criteria = {};
                        
                        // We dont have any user filters here because they will have already been applied to the
                        // two record sets we got previously.
                        criteria.xurrole = roles;
                        criteria.xuruser = users;

                        userRolesQuery = xurole.find({ where: criteria })
                            .sort(((self.MOD.get("sortby") === "xususer")? "xuruser" : "xurrole") + " " + self.MOD.get("sortorder").toUpperCase())
                            .populate(["xuruser", "xurrole"])
                            .skip(startRow - 1)
                            .limit(rows);
                        userRolesQuery.exec(function (err, rawData) {
                            //Filters.postQueryFilter(filters,"xurole",rawData);

                            _.forEach(rawData, function (userrole, i) {
                                var ur = {};

                                ur.xusname = userrole.xuruser.xusname;
                                ur.xrodesc = userrole.xurrole.xrodesc;

                                ur.xususer = userrole.xuruser.xususer;
                                ur.xrorole = userrole.xurrole.xrorole;
                                
                                switch (mode) {
                                    case "user" :
                                        ur.id = userrole.xurrole.xrorole;
                                        break;
                                        
                                    case "role" :
                                        ur.id = userrole.xuruser.xususer;
                                        break;
                                        
                                    default :
                                        ur.id = userrole.xuruser.xususer + userrole.xurrole.xrorole;
                                        break;
                                }

                                userRoles.push(ur);
                            });

                            // Send our array of role objects.
                            self.MOD.set("userroles", userRoles);

                            // Run the callback for process function
                            cb();
                        })
                    }
                );

                break;

            default :
                // Run the callback for process function
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
