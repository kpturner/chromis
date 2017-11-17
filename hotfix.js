/***** BEGIN LICENCE BLOCK ***************************/                  
/* The initial developer of the code is Kevin Turner   */ 
/* kpturner.co.uk     */ 
/*                                                   */
/* Portions created by Kevin Turner Systems Ltd" are   */
/* Copyright (c) 2017 K P Turner Ltd.    */
/* All Rights Reserved.                              */
/***** END LICENCE BLOCK *****************************/     

/********************************************************************           
/*   @Function    : hotfix                                                        
/*   @Description : Chromis hotfix.  If you have made changes and want clients to 
/*                  pick up those changes when they next start RNS, you can run this 
/*                  node app to do so:   "node hotfix.js"
/*                  If you want active clients to be prompted to reload, 
/*                  run "node hotfix.js --reload"
/*                  NOTE: Only impacts clients that connect to the server instance that houses this 
/*                  module and that have access to the same instance of the XVer table.             
/*   @Author      : Kevin Turner                                            
/*   @Date        : Apr 2016                                                         
/*                                                                                    
/********************************************************************           
/*                                                                                    
/*  Modification log                                                                  
/*  ================                                                                  
/*                                                                                    
/*  Inits  Date    Modification                                                       
/*  =====  ====    ============                                                       
/*                               
/********************************************************************/    

var sails;

// Override the grunt hook to do nothing and ensure we don't mess with the database
var cfg={
        hooks: { 
            grunt:          false, 
        },
        models: {
            migrate: "safe" 
        },
    };
    
// Lift sails with the above config    
require('sails').load(cfg,function(err, sailsInstance) {
  
    // Initialise the "sails" global
    sails=sailsInstance; 
    
    // Increment the sub-version number then trigger an 
    // event for clients to reload
    xver.findOne({bcver:{">":""}}).exec(function(err,v){
        // Now we can increment the sub version. NOTE: this
        // is a terrible way of doing it, because of course 
        // somebody else could jump in and change it before
        // this instance does. To avoid that we need to do an atomic
        // update. However, it is low risk and hardly earth shattering
        // in the unlikely event it happens
        if (err) {
            sails.log.error(err);
             process.exit(1);
        }
        else {
            // Increment and update
            v.subver++;
            xver.update(v.id,v).exec(function(err,updated){
                if (err) {
                    sails.log.error(err)
                    process.exit(1);
                }
                else {
                    // Trigger an event on the server properties datapush listener
                    var feedId=sails.config.chromis.serverName+"_properties";
                    // Prompt the clients to reload if the user has specified --reload in the command line args
                    var reloadClient=false;
                    if (process.argv.length>=3) {
                        reloadClient=(process.argv[2].indexOf("--reload")>=0);    
                    }                    
                    // Build the event json
                    var data={
                        urlargs:"v="+sails.config.chromis.version+"."+v.subver.toString(),
                        reloadclient:reloadClient,
                    }
                    // Trigger the web socket event
                    WS.triggerEvent(feedId,data,function(){
                        sails.log.info("Hotfix complete");
                        process.exit(0);    
                    })
                }
            })
        }
    });    
   
    
}); 

 
process.on('uncaughtException', function (err) {
    try {
        var msg='uncaughtException: '+err.message;
        msg+="</br>"+err.stack;
        if (sails) {
            sails.log.error('uncaughtException:', err.message);
            sails.log.error(err.stack);
            if (Utility) {
                Utility.diagnosticEmail(msg,"Application crash",function(){
                    process.exit(1);    
                });      
            }   
            else {
                 process.exit(1);    
            }        
            // Make sure we exit if the email sending fails
            setTimeout(function(){process.exit(1)},5000)   
        }
        else {
            console.log(msg);
            process.exit(1);   //Forever should restart us;
        }
    }
    catch(e) {
        if (sails) {
            sails.log.error("Error handling uncaught exception");
            sails.log.error(e);            
        }
        else {
            console.log("Error handling uncaught exception");
            console.log(e);  
        }
        process.exit(1);   //Forever should restart us;
    }
    
}) 
 