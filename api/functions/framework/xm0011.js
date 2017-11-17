/**           
 *   @Module        xm0011                                                           
 *   @Description   Chromis function role list                     
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
                if (self.MOD.get("mode") !== "func" && self.MOD.get("mode") !== "role") {
                    self.MOD.set("previewMode",true);
                }
                // <--- After here previewMode may have been set because "mode" is not "func" or "role"
                if (self.MOD.get("previewMode")===true) {
                    self.MOD.set("fullMode",false);
                } else {
                    self.MOD.set("previewMode",false);
                    self.MOD.set("fullMode",true);
                } 
                
                // Set the default sort order.
                self.MOD.set("sortorder", "asc");
                self.MOD.set("sortby", mode == "func" ? "xrorole" : "xfufunc");

                // Set vars for display based on mode.
                self.MOD.set("funcMode", (mode == "func"));
                self.MOD.set("roleMode", (mode == "role"));

                switch (mode) {
                    case "func":
                        xfunc.findOne({ xfufunc: modeFilter }).exec(function (err, func) {
                            if (!err && func) {
                                self.MOD.set("funcName", func.xfudesc + " (" + func.xfufunc + ")");
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


            case "initfuncroles":
                var rows = self.MOD.get("rows");
                var page = self.MOD.get("page");
                var startRow = self.MOD.get("startrow");
                var filters = self.MOD.get("filters") || [];
                var roles = [];
                var funcs = [];
 
                // Here we start off two functions for getting back role and function info.
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
                        var funcQuery = {};
                        
                        // Push a filter on that we want. Do this to let filter translations do the work.
                        if (mode === "func"){
                            filters.push({ field: "xfufunc", fromValue: modeFilter, toValue: modeFilter });
                        }
                        
                        // Convert our filters and execute the query.
                        // It will only convert filters which are fields in the specified table.
                        funcQuery = xfunc.find({ where: Filters.convertToCriteria(filters, "xfunc") })
                        funcQuery.exec(function (err, rawData) {

                            _.forEach(rawData, function (func, i) {
                                funcs.push(func.xfufunc);
                            });

                            // Tell async that this function is done
                            callback();
                        })
                    }],
                    
                    // When the two functions are done above, we know we have the data we need to continue.
                    function alldone() {
                        var funcRolesQuery = {};
                        var funcRoles = [];
                        var criteria = {};
                        
                        // We dont have any func filters here because they will have already been applied to the
                        // two record sets we got previously.
                        criteria.xrfrole = roles;
                        criteria.xrffunc = funcs;

                        funcRolesQuery = xrfunc.find({ where: criteria })
                            .sort(((self.MOD.get("sortby") === "xfufunc")? "xrffunc" : "xrfrole") + " " + self.MOD.get("sortorder").toUpperCase())
                            .populate(["xrffunc", "xrfrole"])
                            .skip(startRow - 1)
                            .limit(rows);
                        funcRolesQuery.exec(function (err, rawData) {
                            _.forEach(rawData, function (funcrole, i) {
                                var fr = {};

                                fr.xfudesc = funcrole.xrffunc.xfudesc;
                                fr.xrodesc = funcrole.xrfrole.xrodesc;

                                fr.xfufunc = funcrole.xrffunc.xfufunc;
                                fr.xrorole = funcrole.xrfrole.xrorole;
                                
                                switch (mode) {
                                    case "func" :
                                        fr.id = funcrole.xrfrole.xrorole;
                                        break;
                                        
                                    case "role" :
                                        fr.id = funcrole.xrffunc.xfufunc;
                                        break;
                                        
                                    default :
                                        fr.id = funcrole.xrffunc.xfufunc + funcrole.xrfrole.xrorole;
                                        break;
                                }

                                funcRoles.push(fr);
                            });

                            // Send our array of role objects.
                            self.MOD.set("funcroles", funcRoles);

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
