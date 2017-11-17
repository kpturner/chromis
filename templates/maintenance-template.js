/***** BEGIN LICENCE BLOCK ***************************/
/* The initial developer of the code is Kevin Turner   */
/* kpturner.co.uk     */
/*                                                   */
/* Portions created by Kevin Turner Systems Ltd" are   */
/* Copyright (c) 2017 K P Turner Ltd.    */
/* All Rights Reserved.                              */
/***** END LICENCE BLOCK *****************************/

/**
 *   @Module        #NAME#
 *   @Description   #DESC#
 *   @Author        #USER#
 *   @Date          #CREATEDATE#
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
                    self.process(function (err) {
                        if (err) self.dataout.err = err;
                        // Finalise matters and run the callback
                        self.finalise(function (err) {
                            // Pass back the payload and the delta model
                            if (err) self.dataout.err = err;
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
        var deleteRecords = [];
        var deleteRecord;

        // Set mode to multidelete if mode is delete and we have more than one role.
        if (mode === "delete") {
            if (Array.isArray(self.MOD.get("#FNAME.PKEY#"))) {

                deleteRecords = self.MOD.get('#FNAME.PKEY#');
                mode = "multidelete";
                self.MOD.set("mode", mode);

            } else {

                deleteRecord = self.MOD.get("#FNAME.PKEY#");

            }
        }

        switch (self.action) {
            case "init":

                var targetRecord;

                // In all situations where the
                // action is not create we need to
                // get the model
                if (mode === 'update' || mode === 'copy' ||
                    mode === 'display' || mode === 'create') {

                    var editable = false;
                    var createCopyMode = false;

                    targetRecord = self.MOD.get("id");
                    if (mode !== 'display') {
                        editable = true;
                    }

                    if (mode === 'create' || mode === 'copy') {
                        createCopyMode = true;
                    }

                    self.MOD.set('editable', editable);
                    self.MOD.set('createcopymode', createCopyMode);

                    if (mode !== 'create') {
                        targetRecord = self.MOD.get("id");
                    } else {
                        targetRecord = '';
                    }

                    self.populateModel(targetRecord, cb);

                } else if (mode === 'delete') {
                    self.deleteRecords(deleteRecord, cb);
                } else if (mode === 'multidelete') {
                    self.deleteRecords(deleteRecords, cb);
                } else {
                    self.populateModel('', cb);
                }

                break;

            case "set":

                var validRecord, record;

                if (mode === 'create' ||
                    mode === 'update' ||
                    mode === 'copy') {

                    record = self.getRecordFromMod();
                    self.validateRecord(record, mode, function (err, validRecord) {

                        if (validRecord === true && !err) {

                            if (mode === 'create' || mode === 'copy') {

                                #FNAME#.create(record).exec(function (err, createdRecord) {
                                    if (err) {
                                        self.MOD.set("navBack", false);
                                        cb(err);
                                    } else {
                                        cb();
                                    }
                                });

                            } else if (mode === 'update') {

                                #FNAME#.update({
                                    #FNAME.PKEY#: record.#FNAME.PKEY#
                                }, record).exec(function (err, updated) {
                                    if (err) {
                                        self.MOD.set("navBack", false);
                                        cb(err);
                                    } else {
                                        cb();
                                    }
                                });
                            }

                        } else {

                            // if not valid stay on this screen
                            self.MOD.set("navBack", false);
                            if (err) {
                                cb(err);
                            } else {
                                cb(err);
                            }

                        }
                    });
                }

                else {
                    // Run the callback
                    cb();

                }
                break;

            default:
                // Run the callback
                cb();
                break;
        }
    },


    /**
    * @name             populateModel
    * @method
    * @description      Populates the model with the function passed in.
    *                   If there is no function passed in then it will
    *                   create an empty model.
    * @param {string}   record   record to fill model with
    * @param {Function} cb     Callback
    */
    populateModel: function (record, cb) {
        var self = this;


        // Create an empty model for record
        if (!record) {

            #EMPTYMODEL#

            cb();

        } else {
            // Create a populated object
            #FNAME#.findOne({ #FNAME.PKEY#: record }).exec(function (err, dta) {

                if (err) {
                    cb(err);
                } else {
                    #POPULATEDMODEL#

                    cb();
                }
            });
        }
    },

   

    /**
     * @name             deleteRecord
     * @method
     * @description      This will delete the record
     *                   pased in as target.
     * @param {String}   target     String
     * @param {Function} cb             Callback
     */
    deleteRecord: function (target, cb) {

        xfunc.destroy({ #FNAME.PKEY#: target }).exec(function (err) {
            if (!err) {
                self.MOD.set("navBack", true);
                cb();
            } else {
                cb(err);
            }
        });

    },

    /**
    * @name             deleteRecords
    * @method
    * @description      This will delete the function
    *                   pased in as targetFunc.
    * @param {Array}    targets        Array
    * @param {Function} cb             Callback
    */
    deleteRecords: function (targets, cb) {

        var self = this;

        async.each(targets, deleteRecord, function done(err) {

            if (err) {
                self.MOD.set("navBack", false);
                cb(err);
            } else {
                // Tell the function to navigate to caller
                self.MOD.set('massdelete', true);
                self.MOD.set("navBack", true);
                cb();
            }
        });


        function deleteRecord(record, acb) {

            #FNAME#.destroy({ '#FNAME.PKEY#': record }).exec(function (err) {
                if (!err) {
                    acb();
                } else {
                    acb(err);
                }
            });

        }
    },

    /**
    * @name             validateRecord
    * @method
    * @description      This will validate a record to see whether or not
    it is okay to write.
    * @param {Object}   record      Object
    * @param {string}   operation   String
    * @param {Function} cb          Callback - this should be the next action
    *                               and should accept an error, func and valid as parameters.
    */
    validateRecord: function (record, operation, cb) {

        var self = this;
        var ok = true;

        #NULLTYPECHECKS#

        /* ---- TODO: Custom null checks ----*/


        /* ---- End custom null checks ----*/
        
        if (ok) {

            #FNAME#.find({ #FNAME.PKEY#: record.#FNAME.PKEY# }).exec(function (err, dta) {

                if (err) {
                    // something went catastophically wrong
                    ok = false;
                    cb(err, ok);
                } else if (operation === 'create' || operation === 'copy') {

                    if (dta.length > 0) {

                        // can't create record that already exists
                        ok = false;
                        self.MOD.Message.error('error0002', '#FNAME.PKEY#');
                        cb(null, ok);

                    } else {

                        cb(null, ok);

                    }
                } else if (operation === 'update') {

                    if (dta.length > 0) {

                        cb(null, ok);

                    } else {

                        // record not found to update
                        self.MOD.Message.error('error0008', '#FNAME.PKEY#');
                        ok = false;
                        cb(null, ok);

                    }
                }
            });
        } else {
            cb(null, ok);
        }

    },

    /**
    * @name             getRecordFromMod
    * @method
    * @description      Calls mod.get on all of the elements of the
    *                   function that can be passed from the front end.
    */
    getRecordFromMod: function () {

        var self = this;
        var local = {};
        
        #SETLOCALS#

        return local;

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
