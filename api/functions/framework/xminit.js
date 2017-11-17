/**           
 *   @Module        xminit                                                             
 *   @Description   Chromis initialisation             
 *   @Author        Kevin Turner                                            
 *   @Date          Feb 2016                                                         
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

var uuid = require('uuid'); 

module.exports =  {
    
    /**
     * Global variables   
     */        
    content:        {},
    
    /**
     * @name             run
     * @method
     * @description      Main procedure 
     * @param {Object}   datain The inbound data
     * @param {Object}   An instance of the sails.hooks.mod.Model class
     * @param {Function} cb     Callback
     */
    run: function(datain,MOD,cb) {
        var self=this;        
        try {
            // Initialise the function
            this.initialise(function(){
                            
                // Process data model   
                self.process(datain,function(dataout){
                    cb(dataout);
                }); 
                        
            });
        }
        catch(e) {
            var dataout={};
            dataout.err=e;
            cb(dataout);
        }      
         
    },
    
    /**
     * @name             initialise
     * @method
     * @description      Initialisation 
     * @param {Function} cb     Callback
     */
    initialise: function(cb){
        var self=this;
         
        cb();
    },
    
    /**
     * @name             process
     * @method
     * @description      Process the data  
     * @param {Object}   datain The inbound data
     * @param {Function} cb     Callback
     */
    process: function(datain,cb){
        var self=this;
        sails.log.verbose("Initialising Chromis");   
        // Build and return initialisation data
        var dataout={};  
        /*
        // It seemed like such a good idea to generate a unique
        // AES key for each user/session, but it fell flat on its
        // face when the session expired, as there was no longer
        // any way that the server could know what key to use   
        // to decrypt stuff from the client. Now the key is 
        // set in sails.config.chromis.aeskey
        sails.config.chromis.aeskey=Crypto.generateKey();
        // Store the AES key in the session
        SES.set("aeskey", sails.config.chromis.aeskey);
        */
        // Get the version information
        xver.findOne({bcver:{">":""}}).exec(function(err,v){
            var model={
                "version" :         sails.config.chromis.version+((v.subver)?"."+v.subver.toString():""), 
                "bcversion" :       sails.config.chromis.version+"."+v.bcver, 
                "applib" :          sails.config.chromis.applib, 
                "additionalapps" :  sails.config.chromis.additionalapps, 
                "urlargs" :         "v="+sails.config.chromis.version+((v.subver)?"."+v.subver.toString():""),
                "locale" :          sails.config.chromis.defaultLocale || "ENG", 
                "uriencodings" :    "[]" , 
                "documentroot" :    sails.config.paths.public, 
                "loginlogo" :       "" , 
                "servername" :      sails.config.chromis.serverName ,
                "servertype" :      "node", 
                "worklib" :         "NA" , 
                "serverip" :        Utility.getIPAddress(true), 
                "wshttppolling" :   false, 
                "wshost" :          null , 
                "wsport" :          sails.config.port , 
                "wssslhost" :       null , 
                "wssslport" :       sails.config.port , 
                "wsdisabled":       false,
                "aeskey" :          sails.config.chromis.aeskey , 
                //"uimap"  :        map,                
                "paths" :           "{}" 
            } 
            dataout.model=model;
            cb(dataout); 
        })

        
    },
    
    
};
 
