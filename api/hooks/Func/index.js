//********************************************************************/           
//*   Description : Chromis Function Services          
//*   Author      : Kevin Turner                                            
//*   Date        : Feb 2016                                                  
//*                                                                                    
//********************************************************************/           
//*                                                                                    
//*  Modification log                                                                  
//*  ================                                                                  
//*                                                                                    
//*  Inits  Date    Modification                                                       
//*  =====  ====    ============                                                       
//*                               
//********************************************************************/


module.exports = function Func(sails) {
    
    /**
     * @class   hook.Func
     * @author  Kevin Turner
     * @description Chromis Function Services
     * @param {Object} SES An object instantiated from sails.hooks.ses.SES
     */
    function Func(SES) {
        this.SES=SES;
    }
    
    /**
     * Private hook globals
     */ 
    var path        = require("path");
    var dir         = require("node-dir");
    var uncache     = require('require-uncache');
    var fs          = require('fs');
    var syntaxCheck = require('syntax-error');
    
    /**
     * Private hook functions
     */  
    
    
    
     // Prototype methods for class
    Func.prototype={
        
        
    
        /**
         * @name                hook.Func.get
         * @method 
         * @description         Get a callable function 
         * @param {String}      module  The module name (without the .js extension)
         * @param {Function}    cb      Callback
         * @param {String}      [app]   The application name (if not part of the Framework) 
         * @param {String}      [xpath] Full path to module (optional)
         */
        get: function(module,cb,app,xpath){
            var func;
            
            if (!xpath) {
                xpath=path.join(sails.config.appPath,"api","functions");
                if (app) {
                    xpath=path.join(xpath,"apps",app.toLowerCase());
                }
                else {
                    xpath=path.join(xpath,"framework");
                }    
                // Each function is in a subfolder of the same name    
                xpath=path.join(xpath,module);             
            }
            
            try {
                // In development mode, before we "require" the module we will uncache it
                // so we always get the latest version
                if (sails.config.environment==="development" && module!="ping") {
                    sails.log.verbose("Uncaching "+xpath)
                    uncache(xpath);
                }  
                // Load it up! 
                func = require(xpath);
                // Callback
                cb(null,func) 
            }
            catch(e) {
                // Cannot load function
                process.send({
                    status: "error"
                })
                
                // Possibly a syntax error or it doesn't exist
                var err, email;
                try {                 
                    xpath+=".js";               
                    fs.accessSync(xpath);
                    // Exists, so check syntax
                    var src = fs.readFileSync(xpath);
                    var err=syntaxCheck(src,xpath);
                    if (!err) {
                        err=e;
                    }
                    sails.log.error(err);                
                    //msg=e.message+" at line "+e.line+" in column "+e.column;
                    var lines=err.toString().replace(RegExp("\\r","g"),"").split("\n");
                    email="<div style='font-family:courier'>";                                
                    _.forEach(lines,function(line,l){
                        email+="<div>"+line.replace(RegExp(" ","g"),"&nbsp;")+"</div></br>";
                    })
                    email+="</div>";
                }
                catch(se) {
                    sails.log.error(se.message);
                    err=se;
                    email=err.message;
                }  
                
                // Email
                Utility.diagnosticEmail(email,"Server function error");
                
                // Callback
                cb(err,null)                  
            }
        },        
            
        /**
         * @name                hook.Func.getDescription
         * @method
         * @description         Get the translated description of a function 
         * @param {String}      func    Function name
         * @param {Function}    cb      Callback 
         */
        getDescription: function(func,cb){
            var self=this;
            // Get the locale for the user
            var locale="ENG";            
            var desc="";
            if (self.SES.env) {
                locale=self.SES.env.locale || "ENG";
            }
            // Get the function first
            xfunc.findOne(func)
                .then(function(funcObj){
                    if (funcObj) {
                        desc=funcObj.xfudesc;        
                    }                    
                    // Now look for the locale specific description
                    return xfuncd.findOne({xfdcode:func,xfdlocale:locale})                        
                })
                .then(function(funcObj){
                    if (funcObj) {
                        desc=funcObj.xfddesc;
                    }
                    cb(null,desc);
                    return null;
                })
                .catch(function(err){
                    cb(err,null);
                    return null;
                }) 
        
        },
            
            
        /**
         * @name                hook.Func.getModuleDescription
         * @method
         * @description         Get the translated description of a module 
         * @param {String}      mod     Module name
         * @param {Function}    cb      Callback 
         */
        getModuleDescription: function(mod,cb){
            var self=this;
            // Get the locale for the user
            var locale="ENG";            
            var desc="";
            if (self.SES.env) {
                locale=self.SES.env.locale || "ENG";
            }
            // Get the function first
            xfuncmod.findOne(mod)
                .then(function(modObj){
                    if (modObj) {
                        desc=modObj.xfmdesc;
                    }                    
                    // Now look for the locale specific description
                    return xfuncd.findOne({xfdcode:mod,xfdlocale:locale})                        
                })
                .then(function(modObj){
                    if (modObj) {
                        desc=modObj.xfddesc;
                    }
                    cb(null,desc);
                    return null;
                })
                .catch(function(err){
                    cb(err,null);
                    return null;
                })      
        },    
        
        /**
         * @name                hook.Func.getGroupDescription
         * @method
         * @description         Get the translated description of a function group 
         * @param {String}      grp     Group name
         * @param {Function}    cb      Callback 
         */
        getGroupDescription: function(grp,cb){
            var self=this;
            // Get the locale for the user
            var locale="ENG";            
            var desc="";
            if (self.SES.env) {
                locale=self.SES.env.locale || "ENG";
            }
            // Get the function first
            xfuncgrp.findOne(grp)
                .then(function(grpObj){
                    if (grpObj) {
                        desc=grpObj.xfgdesc;        
                    }                    
                    // Now look for the locale specific description
                    return xfuncd.findOne({xfdcode:grp,xfdlocale:locale})                        
                })
                .then(function(grpObj){
                    if (grpObj) {
                        desc=grpObj.xfddesc;
                    }
                    cb(null,desc);
                    return null;
                })
                .catch(function(err){
                    cb(err,null);
                    return null;
                })      
        },  
        
        /**
         * @name                hook.Func.getApp
         * @method 
         * @description         Get a callable function application 
         * @param {String}      module  The module name (with the .js extension)
         * @param {Function}    cb      Callback - will receive two params:  err and name of application 
         */
        getApp: function(module,cb){  
            dir.files(path.join(sails.config.appPath,"api","functions"),function(err, files){
                if (err) {
                    cb(err)
                }
                else {
                    // Look for the module 
                    var found=false;
                    _.forEach(files,function(file,f){
                        // Extract the module
                        var m=path.basename(file).toLowerCase();
                        if (m==module) {
                            // Match the module
                            var splits=path.dirname(file).split(path.delimiter);
                            var a=path.basename(splits[splits.length-1]).toLowerCase();
                            cb(null,a);
                            found=true;
                            return false; // Quit loop
                        }
                    })
                    if (!found) {
                        cb(null,"*error");
                    }
                }
            })
        },
        
    }
   
    
    // Expose hook public methods
    return {

        Func: Func, 

    };


};        