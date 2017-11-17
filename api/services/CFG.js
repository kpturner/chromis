/***** BEGIN LICENCE BLOCK ***************************/
/* The initial developer of the code is Kevin Turner   */
/* kpturner.co.uk     */
/*                                                   */
/* Portions created by Kevin Turner Systems Ltd" are   */
/* Copyright (c) 2017 K P Turner Ltd.    */
/* All Rights Reserved.                              */
/***** END LICENCE BLOCK *****************************/

/**      
 *   @class         service.CFG
 *   @description   Chromis Config Services          
 *   @author        Kevin Turner                                            
 *   @date          Jan 2016                                                         
 */

/********************************************************************/
/*                                                                                    
/*  Modification log                                                                  
/*  ================                                                                  
/*                                                                                    
/*  Inits  Date     Modification                                                       
/*  =====  ====     ============      
/*  GO     09/06/16 Auto add functions and function roles if required,
/*                  moved create admin users code into its own function.
/*  GO     10/06/16 Will now add an 'Unknown' module + function group. Also
/*                  added a glob read so functions inside /apps are also pulled in.
/*  GO     13/06/16 Clear down existing 'unknown' functions on start up.
/*                  Extended check to make sure that an rml file exists for each function   
/*                  aswell.
/*  GO     16/0726  Change function group creation to accept function group as a param
/*                  rather than function module. Changed create function roles functionality
/*                  to pass array of administrators set in local.js as the creation user.    
/********************************************************************/

var async = require("async");
var dir = require("node-dir");
var path = require("path");
var fs = require("fs");
var glob = require("glob");

module.exports = {

    /**
     * @name         service.CFG.initialise
     * @method
     * @description  Initialise config. Moves config file data to persisted DB if in development mode
     * @param  {Function} callback
     */
    initialise: function (cb) {
        var self = this;

        function initialiseConfig(cb) {
            // Build an array of files to initialise
            var files = ["xver", "xtheme", "xwsevent", "xwsclient"];
            async.forEach(files, function (file, next) {
                switch (file) {
                    case "xver":
                        // Sort out versions before we go ahead 
                        xver.findOrCreate({}, { bcver: "1" }, next);
                        break;
                    case "xtheme":
                        // Rebuild based on contents
                        xtheme.destroy().exec(function (err, dels) {
                            // Get all the files in the themes folder(s)
                            var xpath = path.join(sails.config.appPath, "assets", "css");
                            dir.subdirs(xpath, function (err, dirs) {
                                var themes = [];
                                _.forEach(dirs, function (sd, d) {
                                    if (path.basename(path.dirname(sd)) == "css") {
                                        // Must have a file in it called "jquery-ui-<version>.custom.css"
                                        var theme = false;
                                        sdf = fs.readdirSync(sd);
                                        _.forEach(sdf, function (ff, f) {
                                            var fn = path.basename(ff);
                                            var sp = fn.split(".");
                                            if (fn.substr(0, 10) == "jquery-ui-" && sp[sp.length - 2] == "custom" && sp[sp.length - 1] == "css") {
                                                theme = true;
                                                return false;
                                            }
                                        })
                                        if (theme) {
                                            t = {};
                                            t.xthfldr = path.basename(sd);
                                            t.xthname = path.basename(sd);
                                            themes.push(t)
                                        }
                                    }
                                })
                                // Create themes
                                xtheme.create(themes).exec(function (err) {
                                    if (err) {
                                        sails.log.error(err)
                                    }
                                    next(err);
                                })
                            })
                        })
                        break;
                    case "xwsevent":
                        xwsevent.destroy().exec(next)
                        break;
                    case "xwsclient":
                        xwsclient.destroy().exec(next)
                        break;
                    default:
                        next();
                        break;
                }
            },
                function (err) {
                    // All dones
                    if (err) {
                        sails.log.error(err)
                    }
                    else {
                        cb();
                    }
                })

        }

        function addNewFunctions(cb) {

            if (sails.config.chromis.autoAddFunctions === true) {

                sails.log.debug('Begin add new functions to database');

                var funcModule = {
                    xfmmod: 'unknown',
                    xfmdesc: 'Unknown',
                    xfmicon: 'icon-question-sign'
                };

                // First we need to create an entry in xfuncmod if it doesn't exist.
                xfuncmod.findOrCreate(funcModule).exec(function (err, data) {
                    if (err) {
                        sails.log.debug(err.message);
                    }
                });

                var funcGroup = {
                    xfggrp: 'unknown',
                    xfgdesc: 'Unknown',
                    xfgmseq: 1
                };

                // Add to xfuncgrp also
                xfuncgrp.findOrCreate(funcGroup).exec(function (err, data) {
                    if (err) {
                        sails.log.debug(err.message);
                    }
                });

                // Clear down any old entries for unknown in xfunc
                xfunc.destroy({ xfugroup: 'unknown' }).exec(function (err) {
                    // Get a list of all of the functions
                    var functionsRoot = path.join('.', 'api', 'functions', '**', '*.js'); 

                    // Use glob rather than fs as it allows regex in the file path
                    glob(functionsRoot, {}, function (err, jsFiles) {

                        if (err) {
                            sails.log.debug(err.message);
                        }
                        else {
                            var trimmedJsFiles = [];
                            // Trim .js from each
                            _.forEach(jsFiles, function (fileName) {
                                trimmedJsFiles.push(path.basename(fileName.replace('.js', '')));
                            });
                            
                            // Trim down further to only include files that also have a matching RML
                            var rmlRoot = path.join('.', 'assets', 'res', 'framework', 'functions', '**', '*.rml');
                            glob(rmlRoot, {}, function (err, rmlFiles) {

                                rmlFilesTrimmed = [];
                                _.forEach(rmlFiles, function (rmlFileName) {
                                    rmlFilesTrimmed.push(path.basename(rmlFileName.replace('.rml', '')));
                                });
                                
                                // so now we have all of the rml files, that exist we need to trim the trimmed file list
                                // to only be stuff that exists in both
                                var trimmedFiles = _.remove(trimmedJsFiles, function (thisFile) {
                                    if (rmlFilesTrimmed.indexOf(thisFile) === -1) {
                                        return false;
                                    }
                                    return true;
                                });

                                async.parallel({
                                    one: function (callback) {
                                        addWhereNotInXfunc(trimmedFiles, callback);
                                    },
                                    two: function (callback) {
                                        addWhereNotInXrfunc(trimmedFiles, callback);
                                    }
                                },
                                    function allDone() {
                                        cb();
                                    }
                                );

                            });

                        }

                    });
                });

            }

            function addWhereNotInXfunc(functions, outerCallback) {

                var lFunctions = _.clone(functions);

                // Then do an if exists in - on xfunc
                // xfunc.findByXfufuncIn(functions, function (err, existingFuncs) {
                xfunc.find({ xfufunc: lFunctions }, function (err, existingFuncs) {

                    if (err) {
                        sails.log.debug(err.message);
                    } else {

                        // so now we have all of the functions, that exist in both
                        // we now need to remove all of these records from the original
                        // list of files. So we know what doesn't exist.
                        var toCreate = _.remove(lFunctions, function (file) {
                            var removeMe = false;
                            if (_.findIndex(existingFuncs, 'xfufunc', file) === -1) {
                                removeMe = true;
                            }
                            return removeMe;
                        });

                        // Anything that we have left in the toCreate array we need to
                        // add entrys for in xfunc and xufunc.
                        var functionGroup = '';
                        var functionModule = '';
                        var fuMainMenu = '';

                        var counter = 0;
                        async.each(toCreate, function (curFunc, callback) {

                            // Write it to the db
                            xfunc.create({
                                xfufunc: curFunc,
                                xfudesc: curFunc,
                                xfugroup: 'unknown',
                                xfumodule: 'unknown',
                                xfuicon: '',
                                xfuexecstr: '',
                                xfulogreq: false,
                                xfunmenuseq: 0,
                                xfumainmnu: true,
                                xfutype: ''
                            }).exec(function (err, newFunc) {
                                if (err)
                                    callback(err);
                                if (!err) {
                                    counter += 1;
                                    sails.log.debug('New function created for: ' + newFunc.xfufunc);
                                    callback();
                                }
                            });

                        }, function (err) {
                            if (err)
                                sails.log.error(err);

                            if (counter === 0)
                                sails.log.debug('No new functions to add');

                            outerCallback();
                        });

                    }
                });
            }

            function addWhereNotInXrfunc(functions, outerCallback) {

                var lFunctions = _.clone(functions);
                
                var administrators = []; 
                _.forEach(sails.config.chromis.admins, function(admin){
                   administrators.push(admin.username); 
                });

                // Then do an if exists in - on xfunc
                xrfunc.find({ xrffunc: lFunctions }, function (err, existingFuncRoles) {

                    if (err) {
                        sails.log.debug(err.message);
                    } else {

                        var test = [];
                        _.forEach(existingFuncRoles, function (func) {
                            test.push(func.xrffunc);
                        });

                        // so now we have all of the functions, that exist in both
                        // we now need to remove all of these records from the original
                        // list of files. So we know what doesn't exist.
                        var xrFuncToCreate = _.remove(lFunctions, function (file) {
                            if (_.findIndex(existingFuncRoles, 'xrffunc', file) === -1) {
                                return true;
                            }
                            return false;
                        });

                        var counter = 0;
                        async.each(xrFuncToCreate, function (curFuncRole, callback) {

                            // Write it to the db
                            xrfunc.create({
                                xrfrole: 'ADMIN',
                                xrffunc: curFuncRole,
                                xrfcuser: administrators.toString(),
                                // xrfcuser: 'chadmin',
                                xrfluser: ''
                            }).exec(function (err, newFuncRole) {
                                if (err) {
                                    callback(err);
                                } else {

                                    counter += 1;
                                    sails.log.debug('New function role created for: ' + newFuncRole.xrffunc);
                                    callback();
                                }
                            });

                        }, function (err) {

                            if (err)
                                sails.log.error(err);

                            if (counter === 0)
                                sails.log.debug('No new function roles to add');

                            outerCallback();

                        });

                    }
                });

            }
        }

        function createAdminUsers(callback) {

            async.forEach(sails.config.chromis.admins, function (admin, next) {
                // Register the profile
                passport.protocols.local.registerProfile(admin, function (err, profile) {
                    if (err) {
                        sails.log.debug(err.message);
                    }
                    else {
                        sails.log.debug("Admin profile created for " + profile.username);
                    }
                    next();
                });

            }, function (err) {

                // We get here when all is done
                if (err) {
                    callback(err);
                }
                else {
                    callback();
                }
            });

        }

        async.series([
            function (callback) {
                // Create admin users if required
                if (sails.config.chromis.admins) {
                    createAdminUsers(callback);
                } else {
                    callback();
                }

            },
            function (callback) {
                // Create xrfunc/xfunc records if required
                if (sails.config.chromis.autoAddFunctions) {
                    addNewFunctions(callback);
                } else {
                    callback();
                }
            }
        ],

            // all done
            function (err) {
                if (err) {
                    throw err;
                } else {
                    initialiseConfig(cb);
                }
            });
    },

    /**
     * @name         service.CFG.migrate
     * @method
     * @description  Migrate config to database 
     * @param  {String} env Environment (database) name
     * @param  {Function} callback
     */
    migrate: function (env, cb) {
        var self = this;

        if (sails.config.chromis.environments[env]) {
            sails.log.debug("Migrating test config data for " + env + "...");
            async.forEachOf(sails.config.chromis.environments[env].data,
                function (data, model, callback) {
                    // This is called for each iterated item
                    sails.log.debug("Migrating " + model + "...");
                    return sails.models[model].destroy()
                        .exec(function (err, dels) {
                            sails.models[model].create(data)
                                .exec(function (err, created) {
                                    if (err) {
                                        callback(err)
                                    }
                                    else {
                                        callback();
                                    }
                                })
                        })
                },
                function (err) {
                    // This is called when everything is done OR an error occurred
                    if (err) {
                        throw err
                    }
                    else {
                        return cb();
                    }
                }
            )
        }

    },
};