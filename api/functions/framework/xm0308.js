/**
 *   @Module        xm0306
 *   @Description   Function group maintenance modal
 *   @Author        Gavin Owen
 *   @Date          6/8/2016
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
                } else {
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
        } catch (err) {
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
    process: function (cb) {

        var self = this;
        var mode = self.MOD.get("mode").toLowerCase();
        var deleteRecords = [];
        var deleteRecord;

        sails.log.debug(mode);
        sails.log.debug(self.action);


        // Set mode to multidelete if mode is delete and we have more than one role.
        if (mode === "delete") {
            if (Array.isArray(self.MOD.get("xfggrp"))) {

                deleteRecords = self.MOD.get('xfggrp');
                mode = "multidelete";
                self.MOD.set("mode", mode);

            } else {

                deleteRecord = self.MOD.get("xfmmod");

            }
        }

        switch (self.action) {
            case "init":

                var targetRecord;

                // In all situations where the
                // action is not create we need to
                // get the model
                if (mode === 'update' || mode === 'copy' ||
                    mode === 'display' || mode === 'create' ||
                    mode === 'delete') {

                    var editable = false;
                    var createCopyMode = false;

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
                    // self.deleteRecords(deleteRecord, cb);
                } else if (mode === 'multidelete') {
                    // self.deleteRecords(deleteRecords, cb);
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

                    sails.log.debug(record);


                    self.validateRecord(record, mode, function (err, validRecord) {

                        if (validRecord === true && !err) {

                            if (mode === 'create' || mode === 'copy') {

                                xfuncgrp.create(record).exec(function (err, createdRecord) {
                                    if (err) {
                                        self.MOD.set("navBack", false);
                                        cb(err);
                                    } else {
                                        cb();
                                    }
                                });

                            } else if (mode === 'update') {

                                xfuncgrp.update({
                                    xfggrp: record.xfggrp
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
                } else if (mode === 'delete') {

                    // delete the stuff that we need to delete
                    record = self.getRecordFromMod();
                    self.deleteRecord(record, cb);

                } else {
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
     * @param {string}   recordId   record to fill model with
     * @param {Function} cb     Callback
     */
    populateModel: function (recordId, cb) {

        var self = this;

        // Create an empty model for record
        if (!recordId) {

            self.MOD.set('xfggrp', '');
            self.MOD.set('xfgdesc', '');
            self.MOD.set('xfgmseq', '');

            cb();

        } else {
            // Create a populated object
            xfuncgrp.findOne({
                xfggrp: recordId
            }).exec(function (err, dta) {

                if (err) {
                    cb(err);
                } else {

                    sails.log.debug(dta);


                    self.MOD.set('xfggrp', dta.xfggrp);
                    self.MOD.set('xfgdesc', dta.xfgdesc);
                    self.MOD.set('xfgmseq', dta.xfgmseq);
                    self.MOD.set('createdAt', dta.createdAt);
                    self.MOD.set('updatedAt', dta.updatedAt);

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

        var self = this;

        xfuncgrp.destroy({
            xfggrp: target.xfggrp
        }).exec(function (err) {
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

            xfuncgrp.destroy({
                'xfmmod': record
            }).exec(function (err) {
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

        if (!record.xfggrp) {
            ok = false;
            self.MOD.Message.error('error0001', 'xfmmod');
        }

        if (ok) {

            xfuncgrp.find({
                xfggrp: record.xfggrp
            }).exec(function (err, dta) {

                if (err) {
                    // something went catastophically wrong
                    ok = false;
                    cb(err, ok);
                } else if (operation === 'create' || operation === 'copy') {

                    if (dta.length > 0) {

                        // can't create record that already exists
                        ok = false;
                        self.MOD.Message.error('error0002', 'xfmmod');
                        cb(null, ok);

                    } else {

                        cb(null, ok);

                    }
                } else if (operation === 'update') {

                    if (dta.length > 0) {

                        cb(null, ok);

                    } else {

                        // record not found to update
                        self.MOD.Message.error('error0008', 'xfmmod');
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

        local.xfggrp = self.MOD.get('xfggrp') || '';
        local.xfgdesc = self.MOD.get('xfgdesc') || '';
        local.xfgmseq = self.MOD.get('xfgmseq') || '';
        local.createdAt = self.MOD.get('createdAt') || '';
        local.updatedAt = self.MOD.get('updatedAt') || '';


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