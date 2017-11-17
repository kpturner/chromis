/***** BEGIN LICENCE BLOCK ***************************/                  
/* The initial developer of the code is Kevin Turner   */ 
/* kpturner.co.uk     */ 
/*                                                   */
/* Portions created by Kevin Turner Systems Ltd" are   */
/* Copyright (c) 2017 K P Turner Ltd.    */
/* All Rights Reserved.                              */
/***** END LICENCE BLOCK *****************************/   

/********************************************************************/           
/*   @Description : Chromis back-end server          
/*   @Author      : Kevin Turner                                            
/*   @Date        : Jan 2016                                                         
/*                                                                                    
/********************************************************************/           
/*                                                                                    
/*  Modification log                                                                  
/*  ================                                                                  
/*                                                                                    
/*  Inits  Date    Modification                                                       
/*  =====  ====    ============                                                       
/*   KT  16/05/16  Try to remove model lock if any errors occur because we cannot be sure that MOD.finalise() has been called                            
/*   KT  03/06/16  Safety net for memory leaks
/********************************************************************/

var sails, server, loadBalancer, inactTimer, bus, inq, inactto;
var path = require('path');
var lastMemChk=new Date().getTime();
var PR;
var pending=0;
var exitTries=0;


function _initialise(parms) {
    server=process.env.QUEUE;
    inactto=process.env.INACTTO;
    loadBalancer=process.env.LOADBALANCER=="true"?true:false;    
    
    // Override the grunt hook to do nothing and ensure we don't mess with the database
    var cfg={
            hooks: { 
                grunt:          false,
            },
            models: {
                migrate: 'safe'  
            },            
            log: {
                level: process.env.logLevel,
            }
        };    
     
        
    require('sails').load(cfg,function(err, sailsInstance) {
        
        if (err) {
            throw err
        }
        
        // Initialise the "sails" global
        sails=sailsInstance;   

        // If we are in debug mode, let the developer know which port to attach to
        var initLog=false;
        process.execArgv.forEach(function(arg){
            if (arg.indexOf("--debug")>=0) {
                // In debug mode
                initLog=true;
                sails.log.debug('"'+server+'_'+process.pid+"_"+process.env.ENVNAME+'" server is listening: '+arg); 
            } 
        }) 

        
        //console.log(sails.config) 
        ////var busmq = sails.config.busmq;

        // Create a PR class
        PR=new sails.hooks.pr.PR();
        
        // Initialise PR before continuing (authenticates redis if required) 
        PR.initialise(function(){
            // Establish a bus connection for the queue traffic
            bus = Bus.create();  
            
            // Trap errors
            bus.on('error', function(err) {
                // an error has occurred
                sails.log.error(err);
            });
            
                
            // Trap the fact that we are online
            bus.on('online', function() {                 
                
                // The bus is online               
                var qualifiedQueue=process.env.QUEUE+"_"+process.env.ENVNAME;
                sails.log.debug("Bus connected for "+qualifiedQueue);
                inq = bus.queue("out_"+qualifiedQueue);
                inq.on('attached', function() {
                    sails.log.verbose('Attached to "'+qualifiedQueue+'" queue');
                    // Flag as ready
                    process.send({
                        status: "ready"
                    })
                });
                inq.on('message', function(parms, id) {
                    if (typeof parms=="string")
                        parms=JSON.parse(parms)
                    sails.log.verbose('"'+server+'_'+process.pid+"_"+process.env.ENVNAME+'" server received '+JSON.stringify(parms))                
                    switch (parms.action) {
                        // Stop server      
                        case "stop":
                            sails.log.debug('"'+server+'_'+process.pid+'" server stopping');
                            inq.on("detached",function(){
                                _exitServer();
                            })
                            if (inq) {
                                inq.detach();   
                            }
                            else {
                                _exitServer();
                            }                                                     
                            break;
                        default:
                        
                            // Instantiate the objects we need for this request    
                            var SES     = new sails.hooks.ses.SES();
                            var Func    = new sails.hooks.func.Func(SES);
                            var Message = new sails.hooks.message.Message(); 
                            var MOD     = new sails.hooks.mod.MOD(SES,Message);  
                            var handles = {
                                SES:        SES,
                                MOD:        MOD,
                                Func:       Func,
                                PR:         PR,
                                Message:    Message,
                            }                           
                            // Make sure the proxy has a handle to our new model handling object (MOD)
                            var proxy=_.bind(_execute,
                                {
                                    parms:parms,
                                    handles: handles,
                                });             
                            if (parms.datain && parms.datain.token) {
                                // Verify the token and set the session token  
                                JWT.verify(parms.datain.token,function(err,token){                                     
                                    SES.initialise(false,function(){
                                        SES.setToken(token.sessionToken); 
                                        // Before execution, extract the environment specific session data into memory for use within 
                                        SES.initialiseEnv(proxy);                                                                                                                            
                                    })              
                                })                                   
                            }
                            else {
                                // Execute function
                                proxy();    
                            } 
                                
                            break;	
                    }
                
                });
                inq.attach();
                inq.consume(); // the 'message' event will be fired when a message is retrieved            
                
                if (!initLog) {
                    sails.log.debug('"'+server+'_'+process.pid+'" server for '+process.env.ENVNAME+' ready'); 
                }             
            
                
                
            });
            
            // Trap the fact that we are offline
            bus.on('offline', function() {
                // the bus is offline - redis is down...
            });

            // connect the redis instances
            bus.connect();
            
            // If we are a load balancer, start a time to monitor inactivity 
            if (loadBalancer) {                
                _inactTimer()         
            }
            
        }) 
        
    });    
    
} 

function _execute(){
    
    var self=this;
    var parms=this.parms;
    var executeCount=0;
    pending++;
        
    var returnResponse=function(response){       
        // Return the response if the client is interested (if not, outq will be null)
        // To do so, we need to create a special queue that only the sender
        // will be listening to. The sender will have told us the name of the queue
        // (which should be unique across the entire system)
        if (parms.outq) {
            //sails.log.debug("Attaching to "+parms.outq)
            var outq = bus.queue(parms.outq);
            if (outq) {
                outq.on('attached', function() {
                    response.server=server+'_'+process.pid; 
                    sails.log.verbose(parms.func+" responding")
                    outq.push(response); 
                    //sails.log.debug("Server detaching from "+this.outq.id)
                    outq.detach();
                    pending--;
                    // If we are a load balancer, start a time to monitor inactivity 
                    if (loadBalancer && parms.func!="ping") {                
                        _inactTimer()       
                    }  
                
                });
                outq.on("detached",function(){
                    //sails.log.debug("Server detached from "+outq.id)
                    outq=null;
                    // Periodically check memory
                    if (new Date().getTime()-lastMemChk>=60000) {
                        lastMemChk=new Date().getTime(); 
                        if (sails.config.chromis.serverMaxMemory) {
                            var mem=process.memoryUsage();    
                            // If we have exceeded the maximum amount of memory allowed for this task, 
                            // end it and let a new one start.  This is just to avoid unexpected memory
                            // leaks from killing us
                            //sails.log.debug(mem)   
                            if (mem.heapUsed>sails.config.chromis.serverMaxMemory) {
                                // See if garbage collection helps
                                if (!Utility.gcCheck()) {
                                    inq.on('detached', function() {
                                        sails.log.debug(new Date().toString()+' "'+server+'_'+process.pid+'" ending as memory usage exceeds '+sails.config.chromis.serverMaxMemory);
                                        _exitServer();
                                    });
                                    if (inq) {
                                        inq.detach();  
                                    }
                                    else {
                                        _exitServer();
                                    }                     
                                }                                                                     
                            }
                        }        
                    }                   
                })
                outq.attach({ttl:1});    
            }
        }
        else {
             pending--;
        }
    }
    
    // Flag as busy
    process.send({
        status: "busy"
    })
    
    // Kill the inactivity timer if we are a load balancing job
    if (loadBalancer && parms.func!="ping") {                
        clearTimeout(inactTimer);         
    }
    //console.log(parms)    
    sails.log.verbose('"'+server+'_'+process.pid+'" server: Running function '+parms.func);
                    
    var response;
   
    // Load and run the function
    try {
        //sails.log.debug(parms.func+ " incoming")
        self.handles.Func.get(parms.func,function(err,func){
            if (err) {
                // Something went horribly wrong trying to load the function
                var dataout={};
                dataout.err=err.message;
                dataout.func=parms.func;
                dataout.timestamp=new Date().toString();  
                dataout.ipaddress=Utility.getIPAddress();   
                response={status:"error",dataout:dataout};
                returnResponse(response);     
            }
            else {
                                
                // Run the function
                try {
                    self.handles.MOD.setModelLocking(true); // Reset default                   
                    // Call the "Run" method
                    func.run(parms.datain,self.handles,function(dataout){
                        function respond(){
                            if (dataout.err) {
                                // Clear model lock just in case it is lingering
                                self.handles.MOD.unlockModel();
                                // The function barfed :(
                                process.send({
                                    status: "error"
                                })
                                if (typeof dataout.err === 'object') {
                                    if (dataout.err instanceof Error && dataout.err.stack) {
                                        dataout.stack=dataout.err.stack;
                                        dataout.err=dataout.err.toString(); 
                                    } 
                                }
                                Utility.diagnosticEmail(dataout.stack||dataout.err,"Chromis Diagnostics");	                
                                response={status:"error",dataout:
                                    {
                                        func: parms.func,
                                        err:dataout.err,  
                                        timestamp: new Date().toString(),  
                                        ipaddress: Utility.getIPAddress(),                     
                                        model: dataout.model,
                                    },                                
                                };
                            }
                            else {
                                // Success!
                                // If we haven't been given the model, default to the current delta
                                if (!dataout.model)
                                    dataout.model=self.handles.MOD.delta();
                                if (parms.datain) {
                                    dataout.silent=parms.datain.silent;
                                }                            
                                response={status:"success",dataout:dataout,func:parms.func};                             
                            }                            
                            returnResponse(response);
                            // Flag as idle
                            process.send({
                                status: "idle"
                            })
                            self.handles=null;
                        }

                        // Check for bug in server program where they may have called us twice
                        executeCount++;
                        if (executeCount>1) {
                            sails.log.error(parms.func+" error running callback. Already called once before!")
                        }
                        else {
                            // Add function description
                            if (parms.datain && parms.datain.token) {
                                self.handles.Func.getDescription(parms.func,function(err,desc){
                                    dataout.title=desc;
                                    respond();                                
                                });
                            } 
                            else {
                                respond();
                            }         
                        }                        
                    });          
                }
                catch(e) {
                    // Clear model lock just in case it is lingering
                    self.handles.MOD.unlockModel();
                    process.send({
                        status: "error"
                    })
                    sails.log.error(e);
                    var dataout={};
                    dataout.err=e.stack;
                    response={status:"error",dataout:dataout};
                    returnResponse(response);
                }                
            }
        },parms.app);
        
    }
    catch(e) {
        // Clear model lock just in case it is lingering 
        self.handles.MOD.unlockModel();
        // Flag as idle
        process.send({
            status: "error"
        })
        sails.log.error(e);
        var dataout={};
        dataout.err=e.stack;
        response={status:"error",dataout:dataout};
        returnResponse(response);
    }
   
}
  
  
function _inactTimer(){
    // These jobs are only started if demand is required.) 
    inactTimer=setTimeout(function(){
        sails.log.debug("Server "+server+"_"+process.pid+" process exiting due to inactivity"); 
        inq.on("detached",function(){
            _exitServer();
        })
        if (inq)
            inq.detach();
        
    },inactto)   
}  

function _exitServer(){
    if (pending<=0 || exitTries>10) {
        process.exit(0);
    }
    else {
        exitTries++;
        setTimeout(_exitServer,500)
    }    
}


// ----- Process events -----
  
process.on('disconnect', function() {
	// Parent is exiting
    var msg="Server "+server+"_"+process.pid+" process exiting";  
    sails.log.debug(msg);
    inq.on("detached",function(){
        process.exit(0);
    }) 
    if (inq)
        inq.detach();    
});

// When we get some data, start listening to the queue
process.on('message', function(parms) {
	 
	switch (parms.action) {
        
        // Load config
        case "initialise":
            _initialise(parms);            
            break;	
        
        // Stop server      
		case "stop":
			sails.log.debug('"'+server+'_'+process.pid+'" server stopping');
            inq.on("detached",function(){
                _exitServer();
            })
            if (inq) {
                inq.detach();
            }
            else {
                _exitServer();
            }    
			
            break;	
    }
	 
	
}); 
 
process.on('uncaughtException', function (err) {
    try {                          
        process.send({
            status: "stopped"
        })        
        msg="uncaughtException: "+err.message;
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
            process.exit(1);    
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
        process.exit(1);    
    }
    
})  