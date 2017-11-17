/**
 *   @Module        xm0058                                                          
 *   @Description   Chromis lazy loader                 
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
/*   KT  27/05/16  Sort values by sequence                            
/********************************************************************/                   

var async=require("async");
path=require('path');

module.exports =  {
    
    /**
     * Globals
     */ 
    me:         Utility.getName(module), 
    dataout:    {},
    action:     null,
    MOD:        null, 
    
    /**
     * @name             run
     * @method
     * @description      Main procedure 
     * @param {Object}   datain The inbound data
     * @param {Object}   A map of handles to Framework objects
     * @param {Function} cb     Callback
     */
    run: function(datain,handles,cb) { 
        var self=this; 
        self.MOD=handles.MOD;
        self.action=datain.action.toLowerCase();     
        try {
            // Initialise the function
            this.initialise(datain,function(err){
                
                // If we have an error then pass it back to the client
                if (err) {
                    self.dataout.err=err;
                    self.finalise(function(){
                        cb(self.dataout);    
                    });   
                }
                else {                    
                    // Process data model   
                    self.process(function(){
                        
                        // Finalise matters and run the callback
                        self.finalise(function(){
                            // Pass back the payload and the delta model
                            cb(self.dataout);    
                        });                    
                        
                    });    
                }                
                        
            });
        }
        catch(err){  
            // Oops!            
            self.dataout.err=err;
            self.finalise(function(){
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
    initialise: function(datain,cb){
        var self=this;
        // Switch model locking off because we are not going to need to 
        // share our model across multiple server instances
        self.MOD.setModelLocking(false);
        self.MOD.initialise(self.me,datain,true,function(err){
            
            // If we have an "err" then pass it back
            if (err) {
                cb(err);
            }
                         
            // Clear out the messages
            self.MOD.Message.initialise();
            
            // Do local initialisation here
            //..... 
                                  
            // Run the callback
            cb();
        });
    },
    
    /**
     * @name             process
     * @method
     * @description      Process the data   
     * @param {Function} cb     Callback
     */
    process: function(cb){
        var self=this; 
        
        // Lazy load data may be coming from a client designed to talk to Chromis for RPG
        if (self.action=="lazyl") {
            // fData will contain a comma delimited list on concatinated keys
            var prcache={};
            var keys=JSON.parse(self.MOD.get("data"));
            async.forEach(keys,function(key,next){
                
                // Split up the concatinated key into actual values
                var prk=self.getKey(key);
               
                prcache[key]={};                 
                // Get the PR details for this key
                xpr.findOne({
                    func:   prk.func,
                    table:  prk.table,
                    type:   prk.type,
                    attrib: prk.attrib,
                })
                .then(function(pr){
                    if (pr) {
                        return pr
                    }
                    else {
                        return  xpr.findOne({
                            func:   "*all",
                            table:  prk.table,
                            type:   prk.type,
                            attrib: prk.attrib,
                        })
                        .then(function(pr){
                            key=key.replace(prk.func.toUpperCase(),"*ALL");
                            return pr
                        })
                    }
                })
                .then(function(pr){  
                    if (pr) {                  
                        prcache[key]=pr;
                        // Get values
                        return xprvalue.find({
                            pr:     prcache[key].id,
                        })
                        .sort("seq") 
                        .then(function(values){
                            return values
                        })  
                    }
                    else {
                        sails.log.debug("No PR information found for "+key)
                        prcache[key]={};
                        prcache[key].id=-1;
                        return [];
                    }                    
                })
                .then(function(values){
                    prcache[key].values=values;
                    // Now get the translations
                    return xtrans.find({
                        locale: self.MOD.get("locale")||sails.config.chromis.defaultLocale,
                        pr:     prcache[key].id,
                    })  
                    .then(function(trans){
                        return trans
                    }) 
                })
                .then(function(trans){
                    prcache[key].trans=trans;
                    // Now get the translation values
                    return xtransvalue.find({
                        locale: self.MOD.get("locale")||sails.config.chromis.defaultLocale,
                        pr:     prcache[key].id,                        
                    })  
                    .sort("seq")
                    .then(function(transValues){
                        prcache[key].transValues=transValues;                        
                        next();
                        return null;
                    }) 
                })
                .catch(function(err){
                    sails.log.error(err);
                    next(err)
                })     
               
            },function(err){
                // We get here when all are processed or we have an error
                if (err) {
                    self.dataout.err=err;
                } 
                self.MOD.set("prcache",prcache); 
                self.MOD.set("data",null);    
                self.MOD.set("locale",null);              
                cb();
            });
        }
        else { 
            cb();
        }
    },
    
    /**
     * @name             finalise
     * @method
     * @description      Finalise the function  
     * @param {Function} cb     Callback
     */
    finalise: function(cb){
        var self=this; 
        
        // Perform any local tidy up here
        //.....
        
        // Finish off.  VERY IMPORTANT!
        self.MOD.finalise(cb);   
             
    },
    
    /**
     * @name             getKey
     * @method
     * @description      Get individual keys from composite 
     * @param {Object}   key
     * @return {Object}
     */
    getKey: function(key) {
        // Split composite key into separate PR entities
        var k=key.split("_");
        var prk={};
                
        k.forEach(function(v,i){
            if (i==0) {
                if (v)
                    prk.func=v.toLowerCase();
                else
                    prk.func="";
            }
            if (i==1) {
                if (v)
                    prk.table=v.toLowerCase();
                else
                    prk.table="";
            }
            if (i==2) {
                if (v)
                    prk.type=v;
                else
                    prk.type="";
            }
            if (i==3) {
                if (v)
                    prk.attrib=v.toLowerCase();
                else
                    prk.attrib="";
            }
        })
        return prk;
    },
 
};
 

