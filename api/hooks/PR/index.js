
//********************************************************************/           
//*   
//*   Description : Chromis Presentation Repository Services
//*   Author      : Kevin Turner                                            
//*   Date        : Mar 2016                                                  
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

module.exports = function PR(sails) {
    
    /**
     * @class   hook.PR
     * @author  Kevin Turner
     * @description Chromis Presentation Repository Services
     */
    function PR() { 
        this.redisClient=libredis.createClient(
            sails.config.connections.configDb.port,
            sails.config.connections.configDb.host
        );  
    }
    
    
    /**
     * Private hook globals
     */
    var async       = require("async"); 
    var trim        = require("trim");
    var libredis    = require("redis");
    
   /**
    * Private hook functions
    */ 
    
    
    // Prototype methods for class
    PR.prototype={
        
        /**
         * @name                hook.PR.initialise
         * @method
         * @description         Initialise the PR class by creating redis connection for PR cache
         * @param {Function}    cb  The callback
         */
        initialise: function(cb){
            // Authenticate redis if need be
            if (sails.config.connections.configDb.password) {
                this.redisClient.auth(sails.config.connections.configDb.password, cb);
            }
            else {
                cb();
            }
        },
        
        
        
        /**
         * @name                hook.PR.get
         * @method
         * @description         Get PR information for an array of inputs
         * @param {String}      locale The locale for the retrieval
         * @param {Array}       PR  Array of PR keys to retrieve
         * @param {String}      context   Function context 
         * @param {Boolean}     [noCache] If true, the cache is ignored and the data is retrieved straight from the DB
         */
        get: function(locale,prarray,cb,noCache){
            var self=this; 
            var res=[];
            
            // Process each array element of PR keys
            async.eachSeries(prarray,function(prIn,next){
                // Try the cache first (contains fully translated/resolved PR records)
                // Build a concatinated key string
                var keyStr=(prIn.app+"_"+prIn.func+"_"+prIn.table+"_"+prIn.type+"_"+prIn.attrib).replace(RegExp("\\*","g"),"")+"_"+locale;
                if (noCache) {
                    // Force the cache retrieval to fail
                    keyStr="nokey"
                }
                else {
                    keyStr="chromis:pr:"+keyStr;    
                }                
                var pr=_.extend({},prIn); // Clone key
                self.redisClient.hgetall(keyStr,function(err,prDta){
                    if (err) {
                        next(err)
                    }
                    else {
                        if (prDta) {
                            // Translated cached record
                            res.push(JSON.parse(prDta.cache));
                            next();
                        }
                        else {
                            // Resolve from the database
                            // Find the key
                            xpr.findOne(pr)
                                .then(function(prDta){  
                                    if (prDta) {
                                        return prDta;    
                                    }
                                    else {
                                        // Try again with "*all"
                                        pr.func="*all";
                                        return xpr.findOne(pr);
                                    }                        
                                })
                                .then(function(prDta){
                                    // Get the valid values
                                    var key={};
                                    key.pr=prDta.id;                        
                                    return xprvalue.find(key).sort("seq ASC")
                                        .then(function(values){
                                            prDta.values=values;
                                            return prDta;
                                        })
                                        .catch(function(err){
                                            next(err)
                                        })
                                })
                                .then(function(prDta){
                                    // We have the data in the default language. Does the user
                                    // use a different locale?                        
                                    ////locale="CZD"; // TEST
                                    // The PR is in English
                                    if (locale!="ENG") {
                                        var key={};
                                        key.pr=prDta.id;
                                        key.locale=locale;
                                        return xtrans.findOne(key)
                                            .then(function(trans){ 
                                                if (trans) {
                                                    if (trim(trans.text).length>0) {
                                                        prDta.text=trans.text;
                                                    } 
                                                    if (trim(trans.rhsLabel).length>0) {
                                                        prDta.rhsLabel=trans.rhsLabel;
                                                    } 
                                                    if (trim(trans.tooltip).length>0) {
                                                        prDta.tooltip=trans.tooltip;
                                                    } 
                                                    if (trim(trans.place).length>0) {
                                                        prDta.place=trans.place;
                                                    } 
                                                    if (trim(trans.confTxt).length>0) {
                                                        prDta.confTxt=trans.confTxt;
                                                    } 
                                                } 
                                                return prDta 
                                            })
                                            .catch(function(err){
                                                next(err)
                                            })                            
                                    } 
                                    else {
                                        return prDta;
                                    }                                    
                                })
                                .then(function(prDta){
                                    // Translated values?
                                    if (locale!="ENG") {
                                        var key={};
                                        key.pr=prDta.id;
                                        key.locale=locale;
                                        return xtransvalue.find(key).sort("seq ASC")
                                            .then(function(values){
                                                _.forEach(values,function(dta,v){
                                                    if (trim(dta.text).length>0) {
                                                        prDta.values[v].text=dta.text
                                                    }
                                                }) 
                                                return prDta;
                                            })
                                            .catch(function(err){
                                                next(err)
                                            })
                                    }
                                    else {
                                        return prDta;
                                    }     
                                })
                                .then(function(prDta){
                                    // Translated value
                                    res.push(prDta);
                                    // Cache it if required
                                    if (!noCache) { 
                                        self.redisClient.hmset(keyStr,{cache:JSON.stringify(prDta)});
                                        // Expire cache in 600 seconds
                                        self.redisClient.expire(keyStr,600);
                                    }
                                    // Next key
                                    next();
                                    return null; // Prevent annoying bluebird warning              
                                })
                                .catch(function(err){
                                    next(err);
                                })
                        }
                    }
                })
            },
            function(err){
                // All done or an error
                if (err) {
                    cb(err,null)
                }
                else {
                    cb(null,res)
                }
            })
        
        }, 
    
    
    }       
   
    
    // Expose hook public methods
    return {

        PR: PR, 

    };


};
