/***** BEGIN LICENCE BLOCK ***************************/                  
/* The initial developer of the code is Kevin Turner   */ 
/* kpturner.co.uk     */ 
/*                                                   */
/* Portions created by Kevin Turner Systems Ltd" are   */
/* Copyright (c) 2017 K P Turner Ltd.    */
/* All Rights Reserved.                              */
/***** END LICENCE BLOCK *****************************/   

/**     
 *   @Class         service.Utility 
 *   @Description   Chromis Utilities                  
 *   @Author        Kevin Turner                                            
 *   @Date          Jan 2016                                                         
 */
                                                                                    
/********************************************************************/           
/*                                                                                    
/*  Modification log                                                                  
/*  ================                                                                  
/*                                                                                    
/*  Inits  Date    Modification                                                       
/*  =====  ====    ============                                                       
/*                               
/********************************************************************/
 
/**
 * Module dependencies
 */

var util        = require("util");
var libredis    = require("redis");
var async       = require("async");
var fs          = require('fs');
var path        = require('path'); 
var os          = require('os'); 
var ifaces      = os.networkInterfaces();
var heapdump    = require("heapdump");
var redisClient;  

module.exports = { 


    /**
     * @name        service.Utility.getStuffFromReq
     * @method
     * @description Derive function to call from request
     * @param {Object} req  The request object
     * @return {Object}
     */
    getStuffFromReq: function(req) {
         // In the normal course of events we will have a function to call
        var func, rmr, token; 
        
        token=(req.param("token") || req.options.token);
        rmr=req.param("rmr");
        
        if (rmr) {
            if (typeof rmr=="string") {
                rmr=JSON.parse(rmr);
            }
            func=rmr.func.toLowerCase(); 
        }
        else {
            func=(req.param("func") || req.param("fProgram"));
            if (func) func=func.toLowerCase()             
        } 
        return {func:func,rmr:rmr,token:token};      
    },
    
    /**
     * @name         service.Utility.buildIndexes
     * @method
     * @description  Build missing indexes
     * @param  {String}   db  Database/Environment name - or adaptor name - or an array thereof
     * @param  {Function} callback
     */
    buildIndexes: function(db,cb){
        var self=this;

        if (sails.config.models.indexes) {
            sails.log.debug("****Building indexes for "+db+"****");
            async.forEachOf(sails.config.models.indexes,function(indexInfo,index,next){
                // Only deal with indexes for the db we are interested in
                var connections=sails.models[indexInfo.table].connections;
                _.forEach(connections,function(conn){
                    var match=false;
                    if (_.isArray(db)) {
                        match=(db.indexOf(conn.config.database)>=0 || db.indexOf(conn.config.adapter)>=0);
                    }
                    else {
                        match=(conn.config.database==db || conn.config.adapter==db)
                    }
                    if (match) {
                        SQL.createIndex(index,indexInfo.table,indexInfo.columns,function(err){
                            next(err)
                        })
                        /*
                        // Drop the index and ignore any errors (it might not exist)
                        var cmd="DROP INDEX IF EXISTS "+index+";";
                        sails.log.debug("Running "+cmd);
                        sails.models[indexInfo.table].query(cmd,function(err,res){
                            if (err)
                                sails.log.error(err);
                            // Build the index
                            cmd="CREATE INDEX "+index+" ON "+indexInfo.table+" (";
                            indexInfo.columns.forEach(function(col,c){
                                if (c>0)
                                    cmd+=","
                                cmd+='"'+col+'"';
                            })
                            cmd+=");";
                            sails.log.debug("Running "+cmd); 
                            sails.models[indexInfo.table].query(cmd,function(err,res){
                                if (err) {
                                    sails.log.error(err);   
                                    next(err)
                                }
                                else {
                                    next();
                                }     
                            });   
                        })
                        */
                    }
                    else {
                        next();
                    }
                })
                
            },
            function(err){
                // Here when all done
                sails.log.debug("****Finished building indexes for "+db+"****");
                if (cb) cb();                 
            })
        }  
        
    }, 
  
    /**
     * @name             service.Utility.isAdmin
     * @method
     * @description      Checks whether or not a user has admin privileges 
     * @param {Object}   user   User object
     * @return Boolean
     */  
    isAdmin: function(user) {
        var isAdmin=false;
        // Allow for users configured in locals.js to be admins even if their profile says otherwise
        if (user) {                   
            var admins=sails.config.chromis.admins;
            if (admins) {
                _.forEach(admins,function(admin){
                    if (admin.username==user.username) {
                        isAdmin=true;
                        return false;
                    }
                })                
            }
        }
        return isAdmin 
    },

    /**
     * @name            service.Utility.diagnosticEmail
     * @method
     * @description      Send a diagnostic email 
     * @param {Object}   error   Error details
     * @param {String}   subject Email subject 
     * @param {Function} cb      Callback
     */  
    diagnosticEmail: function(err,subject,cb){
        if (sails.config.chromis.developer) {
            if (!cb)
                cb=function(){}
            console.log("Sending email to "+sails.config.chromis.developer)
            var errStr="Server: "+Utility.getIPAddress(true)+ "</br>PID: "+process.pid+"</br>";
            if (typeof err=="string")
                errStr+=err
            else
                errStr+=JSON.stringify(err)
            Email.send(
                "diagnostic",
                {
                    err:errStr
                },
                {
                    to: sails.config.chromis.developer,
                    subject: subject
                },
                cb
            )	
        }         
    },
        
     /**
     * @name            service.Utility.supportEmail
     * @method
     * @description      Send a support email 
     * @param {Object}   error   Error details
     * @param {String}   subject Email subject 
     */  
    supportEmail: function(err,subject){
        if (sails.config.chromis.support) {
            var errStr;
            if (typeof err=="string")
                errStr=err
            else
                errStr=JSON.stringify(err)
            Email.send(
                "diagnostic",
                {
                    err:errStr
                },
                {
                    to: sails.config.chromis.support,
                    subject: subject
                },
                function(){}
            )	
        }         
    },  

     /**
     * @name            service.Utility.jsonSort
     * @method
     * @description      Sort a JSON object by a field (e.g user.name)
     * @param {String}   field  Field to sort by
     * @param {Boolean}  reverse   Reverse order?
     * @param {Function} primer    Function to do something with the key prior to sorting  
     * @return {Object}
     */  
    jsonSort: function(field, reverse, primer){
    
        var s=field.split(".");
        var o=s[0];
        var f
        if (s.length>1)
            f=s[1];  
            
        var key = primer ? 
            function(x) {return primer(f?x[o][f]:x[o])} : 
            function(x) {return f?x[o][f]:x[o]};

        reverse = !reverse ? 1 : -1;

        return function (a, b) {
            return a = key(a), b = key(b), reverse * ((a > b) - (b > a));
        } 
    },
      
    /**
     * @name                service.Utility.getName
     * @method
     * @description         Get function name 
     * @param {String}      module  Module  
     * @return {String} 
     */
    getName: function(mod){
        return mod.filename.slice(mod.filename.lastIndexOf(path.sep)+1, mod.filename.length -3)
    },   
         
    /**
     * @name            service.Utility.toHex
     * @method
     * @description      Convert a string to a hex string  
     * @param {String}   str   String to convert
     * @return  {String} 
     */  
    toHex: function(str) {
        
            var hex = '';
            for(var i=0;i<str.length;i++) {
                hex += ''+str.charCodeAt(i).toString(16);
            }
            return hex;
        
    },

     /**
     * @name            service.Utility.getRequestAction
     * @method
     * @description      Get the action associated with a request  
     * @param {Object}   req   Request object
     * @return  {String} 
     */  
    getRequestAction: function (req) {
        if (req.options.action) return req.options.action;

        var controller = req.options.controller || req.options.model;

        var baseRoute = sails.config.blueprints.prefix + controller;
        var requestRoute = req.route.method + ' ' + req.route.path;

        var Model = sails.models[controller];

        if (req.options.shortcuts && Model) {
        var shortcutRoutes = {
            '/%s/find/:id?': 'find',
            '/%s/create': 'create',
            '/%s/update/:id?': 'update',
            '/%s/destroy/:id?': 'destroy'
        };

        var shortcutAction = _.findWhere(shortcutRoutes, function(blueprint, pattern){
            var shortcutRoute = util.format(pattern, baseRoute);
            return req.route.path === shortcutRoute;
        });

        if (shortcutAction) return shortcutAction;
        }

        if (req.options.rest && Model) {
        var restRoutes = {
            'get /%s/:id?': 'find',
            'post /%s': 'create',
            'put /%s/:id?': 'update',
            'delete /%s/:id?': 'destroy'
        };

        var restAction =_.findWhere(restRoutes, function(blueprint, pattern){
            var restRoute = util.format(pattern, baseRoute);
            return requestRoute === restRoute;
        });

        if (restAction) return restAction;

        var associationActions = _.compact(_.map(req.options.associations, function(association){
            var alias = association.alias;

            var associationRoutes = {
            'get /%s/:parentid/%s/:id?': 'populate',
            'post /%s/:parentid/%s': 'add',
            'delete /%s/:parentid/%s': 'remove'
            };

            return _.findWhere(associationRoutes, function(blueprint, pattern){
            var associationRoute = util.format(pattern, baseRoute, alias);
            return requestRoute === associationRoute;
            });
        }));

        if (associationActions.length > 0) return associationActions[0];
        }
    },
  
    /**
     * @name            service.Utility.deleteRedisKeys
     * @method
     * @description      Delete redis keys en-masse
     * @param {Array}    keys   An array of key search strings. It is also possible to pass a single  key as a string.
     * @param {Function} [cb]   callback
     * @param {Integer}  [db]   Database number   
     * @param {String}   [pass] Password   
     *  
     */
    deleteRedisKeys: function(keys, cb, db, pass) {
        if (!redisClient) {
             // Add function to client
             libredis.RedisClient.prototype.delWildcard = function(key, callback) {
                var redis = this            
                redis.keys(key, function(err, rows) {
                    async.each(rows, function(row, callbackDelete) {
                        sails.log.verbose("Deleting "+row)
                        redis.del(row, callbackDelete)
                    }, callback)
                });
            }
            var opts={
                 port:      sails.config.connections.configDb.port,
                 host:      sails.config.connections.configDb.host,                
            }            
            if (db) {
                 opts.db=db;
            }
            // Create a client
            redisClient=libredis.createClient(opts) 
             
        }            
         
        // Function to actually do the business
        var del=_.bind(function(){
            var self=this;
            // String or array of keys?
            if (typeof this.keys=="string") {
               redisClient.delWildcard(this.keys, this.cb)
            } 
            else {
                // Array of keys
                async.forEach(this.keys,function(key,next){
                    redisClient.delWildcard(key, next);
                },
                function(err){
                    // All done
                    if (err) {
                        sails.log.error(err);                        
                    }
                    self.cb();
                })
            }
        },{keys:keys,cb:cb})   
        
        // Authenticate if need be before calling function        
        if (pass || sails.config.connections.configDb.password) {
            redisClient.auth(sails.config.connections.configDb.password, del);
        }
        else {
            del();
        }
    }, 
  
    /**
     * @name            service.Utility.getIPAddress
     * @method
     * @description      Get IP address(es)
     * @param {Boolean}  [firstOnly] If multiple addresses, return the first one only
     * @return {String}
     *  
     */
    getIPAddress: function(firstOnly){
        var ip="";
        _.forEach(ifaces,function(ifobj,ifname){
            
            _.forEach(ifaces[ifname],function(iface){
                if ('IPv4' !== iface.family || iface.internal !== false) {
                    // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                    return true;
                }
                if (ip.length > 0) {
                    // this single interface has multiple ipv4 addresses
                    ip+=","+iface.address;
                } else {
                    // this interface has only one ipv4 adress
                    ip+=iface.address;                   
                    if (firstOnly) {
                        return false
                    }
                }
                
            })
            if (firstOnly && ip.length>0) {
                return false;
            }
        })
        return ip;
    },
    
    /**
     * @name            service.Utility.clearDir
     * @method
     * @description     Clear out the contents of a directory
     * @param {String}  dirPath Directory path
     * @param {Boolean} [RemoveSelf=false] Remove the target directory as well as its contents
     */
    clearDir: function(dirPath,removeSelf) {
        try { 
             var files = fs.readdirSync(dirPath); 
        }
        catch(err) { 
            sails.log.error(err)
            return; 
        }
        if (files.length > 0) {
            for (var i = 0; i < files.length; i++) {
                var filePath = path.join(dirPath,files[i]);
                if (fs.statSync(filePath).isFile()) {
                     fs.unlinkSync(filePath);
                }
                else {
                    this.clearDir(filePath,true);
                }                    
            }
        }
        if (removeSelf)  {
            fs.rmdirSync(dirPath);    
        }                 
    }, 
    
    /**
     * @name            service.Utility.memoryLeakCheck
     * @method
     * @description     Periodically produce a heapdump for memory leak analysis
     *  
     */
     memoryLeakCheck: function(){
         if (sails.config.chromis.heapdumpInterval) {
            // Clear out heapdumps first
            var xpath=path.join(sails.config.appPath,"heapdump");
            this.clearDir(xpath);
            var hd=path.join(xpath,"0.baseline.heapsnapshot");        
            heapdump.writeSnapshot(hd,function(err, filename) {
                sails.log.debug('Dump written to', filename);
            });
            setInterval(function(){
                var hd=path.join(xpath,Date.now().toString()+".heapsnapshot");        
                heapdump.writeSnapshot(hd,function(err, filename) {
                    sails.log.debug('Dump written to', filename);
                });
            },sails.config.chromis.heapdumpInterval)  
        }
     },

     /**
     * @name            service.Utility.gcCheck
     * @method
     * @description      Garbage collection check. Returns true if gc reduced memory
     * @return Boolean 
     */
    gcCheck: function() {
        var gc=false;
        var memReduced=false;
        var mem=process.memoryUsage(); 
        try {
            global.gc();
            gc=true;
        } catch (e) {
            sails.log.verbose("Forced garbage collection not possible. You must run program with 'node --expose-gc'"); 
        }
        if (gc) {
            var hu=mem.heapUsed;
            mem=process.memoryUsage(); 
            var diff=hu-mem.heapUsed;
            if (diff>0) { 
                memReduced=true;
                sails.log.debug("Garbage collected reduced heap used by "+diff.toString())
            }
        }
        
        return memReduced;
    }
};