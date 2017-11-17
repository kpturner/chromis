/**
*   @Module        xm0059
*   @Description   Function maintenance screen
*   @Author        Gavin Owen
*   @Date          11/05/16
*/

/********************************************************************
/*
/*  Modification log
/*  ================
/*
/*  Inits  Date      Modification
/*  =====  ====      ============
/*  GO     23/05/16  Fix xfumainmnu was always getting set to false.
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
            if (Array.isArray(self.MOD.get("xfufunc"))) {

                deleteRecords = self.MOD.get('xfufunc');
                mode = "multidelete";
                self.MOD.set("mode", mode);

            } else {

                deleteRecord = self.MOD.get("xfufunc");

            }
        }

        switch (self.action) {
            case "init":

                // In all situations where the
                // action is not create we need to
                // get the model
                if (mode === 'update' || mode === 'copy') {

                    var targetFunc = self.MOD.get("xfufunc");
                    self.populateModel(targetFunc, cb);

                } else {

                    self.populateModel('', cb);

                }

                if (mode === 'delete') {

                    self.deleteFunc(deleteRecord, cb);

                }
                if (mode === 'multidelete') {

                    self.deleteFuncs(deleteRecords, cb);

                }

                cb();
                
                break;

            case "set":

                var validFunc, func;

                if (mode === 'create' ||
                    mode === 'update' ||
                    mode === 'copy') {

                    func = self.getFuncFromMod();
                    self.validateFunc(func, mode, function (err, validFunc) {

                        if (validFunc === true && !err) {

                            if (mode === 'create' || mode === 'copy') {

                                xfunc.create(func).exec(function (err, createdRecord) {
                                    if (err) {
                                        self.MOD.set("navBack", false);
                                        cb(err);
                                    } else {
                                        cb();
                                    }
                                });

                            } else if (mode === 'update') {

                                xfunc.update({
                                    xfufunc: func.xfufunc
                                }, func).exec(function (err, updated) {
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
    * @param {string}   func   function to fill model with
    * @param {Function} cb     Callback
    */
    populateModel: function (func, cb) {
        var self = this;


        // Create an empty model for func
        if (func === '' || func == null) {

            self.MOD.set('xfufunc', '');
            self.MOD.set('xfudesc', '');
            self.MOD.set('xfugroup', '');
            self.MOD.set('xfumodule', '');
            self.MOD.set('xfutype', '');
            self.MOD.set('xfuexeco', '');
            self.MOD.set('xfuicon', '');
            self.MOD.set('xfuexecstr', '');
            self.MOD.set('xfulogreq', '');
            self.MOD.set('xfumainmnu', '');
            self.MOD.set('xfumenuseq', '');

            self.populateDropdowns(cb);

        } else {
            // Create a populated object
            xfunc.findOne({ xfufunc: func }).exec(function (err, dta) {

                if (err) {
                    cb(err);
                } else {
                    self.MOD.set('xfufunc', dta.xfufunc);
                    self.MOD.set('xfudesc', dta.xfudesc);
                    self.MOD.set('xfugroup', dta.xfugroup);
                    self.MOD.set('xfumodule', dta.xfumodule);
                    self.MOD.set('xfutype', dta.xfutype);
                    self.MOD.set('xfuexeco', dta.xfuexco);
                    self.MOD.set('xfuicon', dta.xfuicon);
                    self.MOD.set('xfuexecstr', dta.xfuexecstr);
                    self.MOD.set('xfulogreq', dta.xfulogreq);
                    self.MOD.set('xfumainmnu', dta.xfumainmnu);
                    self.MOD.set('xfumenuseq', dta.xfumenuseq);

                    self.populateDropdowns(cb);
                }
            });
        }
    },

    /**
    * @name             populateDropdowns
    * @method
    * @description      Populates the model with the function groups
    *                   and modules for the dropdown menus.
    * @param {Function} cb     Callback
    */
    populateDropdowns: function (cb) {

        var self = this;
        var groups = [];
        var modules = [];

        async.parallel([getGroups, getModules], function (err) {

            if (err) {
                cb(err);
            } else {
                self.MOD.set('groups', groups);
                self.MOD.set('modules', modules);
                cb();
            }
        });

        // Build an array of the function groups
        function getGroups(acb) {
            xfuncgrp.find().exec(function (err, dta) {
                if (err) { acb(err); }
                else {
                    _.forEach(dta, function (grp) {
                        groups.push({
                            xfggrp: grp.xfggrp,
                            xfgdesc: grp.xfgdesc
                        });
                    });
                    acb();
                }
            });
        }

        // Build an array of the modules
        function getModules(acb) {
            xfuncmod.find().exec(function (err, dta) {
                if (err) { acb(err); }
                else {
                    _.forEach(dta, function (cmod) {
                        modules.push({
                            xfmmod: cmod.xfmmod,
                            xfmdesc: cmod.xfmdesc
                        });
                    });
                    acb();
                }
            });
        }

    },

    /**
    * @name             deleteFunc
    * @method
    * @description      This will delete the function
    *                   pased in as targetFunc.
    * @param {String}   targetFunc     String
    * @param {Function} cb             Callback
    */
    deleteFunc: function (target, cb) {

        xfunc.destroy({ 'xfufunc': target }).exec(function (err) {
            if (!err) {
                self.MOD.set("navBack", true);
                cb();
            } else {
                cb(err);
            }
        });

    },

    /**
    * @name             deleteFuncs
    * @method
    * @description      This will delete the function
    *                   pased in as targetFunc.
    * @param {Array}    targets        Array
    * @param {Function} cb             Callback
    */
    deleteFuncs: function (targets, cb) {

        var self = this;

        async.each(targets, deleteFunc, function done(err) {

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


        function deleteFunc(func, acb) {

            xfunc.destroy({ 'xfufunc': func }).exec(function (err) {
                if (!err) {
                    acb();
                } else {
                    acb(err);
                }
            });

        }
    },

    /**
    * @name             validateFunc
    * @method
    * @description      This will validate a function to see whether or not
    it is okay to write.
    * @param {Object}   func        Object
    * @param {string}   operation   String
    * @param {Function} cb          Callback - this should be the next action
    *                               and should accept an error, func and valid as parameters.
    */
    validateFunc: function (newFunc, operation, cb) {

        var self = this;
        var ok = true;

        if (newFunc.xfufunc === '') {
            ok = false;
            self.MOD.Message.error('error0001', 'xfufunc');
        }
        if (newFunc.xfudesc === '') {
            ok = false;
            self.MOD.Message.error('error0003', 'xfudesc');
        }
        if (newFunc.xfugroup === '') {
            ok = false;
            self.MOD.Message.error('error0004', 'xfugroup');
        }
        if (newFunc.xfumodule === '') {
            ok = false;
            self.MOD.Message.error('error0005', 'xfumodule');
        }
        if (isNaN(newFunc.xfumenuseq)) {
            ok = false;
        }

        if (ok) {

            xfunc.find({ xfufunc: newFunc.xfufunc }).exec(function (err, dta) {

                if (err) {

                    // something went catastophically wrong
                    ok = false;
                    cb(err, ok);

                } else if (operation === 'create' || operation === 'copy') {

                    if (dta.length > 0) {

                        // can't create record that already exists
                        ok = false;
                        self.MOD.Message.error('error0002', 'xfufunc');
                        cb(null, ok);

                    } else {

                        cb(null, ok);

                    }
                } else if (operation === 'update') {

                    if (dta.length > 0) {

                        cb(null, ok);

                    } else {

                        // record not found to update
                        self.MOD.Message.error('error0008', 'xfufunc');
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
    * @name             getFuncFromMod
    * @method
    * @description      Calls mod.get on all of the elements of the
    *                   function that can be passed from the front end.
    */
    getFuncFromMod: function () {

        var self = this;
        var func = {};

        func.xfufunc = self.MOD.get('xfufunc') || '';
        func.xfudesc = self.MOD.get('xfudesc') || '';
        func.xfugroup = self.MOD.get('xfugroup') || '';
        func.xfumodule = self.MOD.get('xfumodule') || '';
        func.xfutype = self.MOD.get('xfutype') || '';
        func.xfuexeco = self.MOD.get('xfuexeco') || '';
        func.xfuicon = self.MOD.get('xfuicon') || '';
        func.xfuexecstr = self.MOD.get('xfuexecstr') || '';
        func.xfulogreq = (self.MOD.get('xfulogreq') === 'Y');
        func.xfumainmnu = (self.MOD.get('xfumainmnu') === 'Y');
        func.xfumenuseq = Number(self.MOD.get('xfumenuseq'));

        return func;

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
