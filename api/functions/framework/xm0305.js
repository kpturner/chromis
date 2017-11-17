/**
 *   @Module        xm0305
 *   @Description   Function module maintenance grid
 *   @Author        Gavin Owen
 *   @Date          6/7/2016
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
    run: function(datain, handles, cb) {
        var self = this;
        self.MOD = handles.MOD;
        self.SES = handles.SES;
        self.Func = handles.Func;
        self.datain = datain;

        self.action = datain.action.toLowerCase();
        try {
            // Initialise the function
            this.initialise(datain, function(err) {

                // If we have an error then pass it back to the client
                if (err) {
                    self.dataout.err = err;
                    self.finalise(function(err) {
                        cb(self.dataout);
                    });
                } else {
                    // Process data model
                    self.process(function() {

                        // Finalise matters and run the callback
                        self.finalise(function(err) {
                            // Pass back the payload and the delta model
                            self.dataout.err = err;
                            cb(self.dataout);
                        });

                    });
                }

            });
        } catch (err) {
            // Oops!
            self.dataout.err = err;
            self.finalise(function(err) {
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
    initialise: function(datain, cb) {
        var self = this;
        self.MOD.initialise(self.me, datain, (self.action == "init"), function(err) {

            // If we have an "err" then pass it back
            if (err) {
                cb(err);
            } else {
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
    process: function(cb) {
        var self = this;

        switch (self.action) {
            case "init":
                // . . . . Do stuff
                // Set the default sort order.
                self.MOD.set("sortorder", "asc");
                self.MOD.set("sortby", "xfmmod");

                // Run the callback
                cb();
                break;

            case "initgrid":
                // Load data
                var rows = self.MOD.get("rows");
                var page = self.MOD.get("page");
                var startRow = self.MOD.get("startrow");
                var filters = self.MOD.get("filters");

                var xfuncmodQuery = {};
                var xfuncmods = [];

                xfuncmodQuery = xfuncmod.find({
                        where: Filters.convertToCriteria(filters, "xfuncmod")
                    })
                    .sort(self.MOD.get("sortby") + " " + self.MOD.get("sortorder").toUpperCase())
                    .skip(startRow - 1)
                    .limit(rows);
                xfuncmodQuery.exec(function(err, rawData) {

                    if (err) {
                        cb(err);
                    } else {
                        _.forEach(rawData, function(record, i) {

                            var local = {};

                            local.xfmmod = record.xfmmod || '';
                            local.xfmdesc = record.xfmdesc || '';
                            local.xfmicon = record.xfmicon || '';
                            local.xfmmseq = record.xfmmseq;
                            local.createdAt = record.createdAt;
                            local.updatedAt = record.updatedAt;


                            xfuncmods.push(local);
                        });

                        // Send our array of role objects.
                        self.MOD.set("data", xfuncmods);
                        // Run the callback
                        cb();
                    }
                });


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
    finalise: function(cb) {
        var self = this;

        // Perform any local tidy up here
        //.....

        // Finish off.  VERY IMPORTANT!
        self.MOD.finalise(cb);

    },

};