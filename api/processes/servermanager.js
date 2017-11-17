/***** BEGIN LICENCE BLOCK ***************************/                  
/* The initial developer of the code is Kevin Turner   */ 
/* kpturner.co.uk     */ 
/*                                                   */
/* Portions created by Kevin Turner Systems Ltd" are   */
/* Copyright (c) 2017 K P Turner Ltd.    */
/* All Rights Reserved.                              */
/***** END LICENCE BLOCK *****************************/   

/********************************************************************/           
/*   @Description : Chromis back-end server manager                
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
/*                               
/********************************************************************/
 
var sails;
var heapdump=require("heapdump");
var path=require("path");
var childProcessDebug = require('child-process-debug'); // Allows the child process to start in debug if the master is in debug
var qm;  // Queue monitor
var pm={}; // Performance monitors 
var lastMemChk=new Date().getTime();
var queuesRunning={};
var diagnostics={};  // Keep track of diagnostic emails so we dont spam!
// Set the database migration flag based on the environment variable received
// unless we are dealing with the standard "chrdta" database. In that case 
// migration will have already been done by the main server (if it was required). 
var migrate=(process.env.CHRDTA_DB=="chrdta")?'safe':process.env.migrate;

// Override the grunt hook to do nothing and ensure we don't mess with the database
var cfg={
        hooks: { 
            grunt:          false, 
        },
        models: {
            migrate: migrate 
        },
        log: {
            level:  process.env.logLevel
        }
    };

 
require('sails').load(cfg,function(err, sailsInstance) {
  
    // Initialise the "sails" global
    sails=sailsInstance;
        
    // Memory leak checking
    if (sails.config.chromis.serverHeapDump) {
        var p=path.join(sails.config.appPath,"heapdump",process.env.ENVNAME); 
        try {
            require("fs").mkdirSync(p);
        }
        catch(e){}
        setInterval(function(){
            var hd=path.join(p,Date.now().toString()+".heapsnapshot");        
            heapdump.writeSnapshot(hd,function(err, filename) {
                sails.log.debug('Dump written to', filename);
            });
        },30000) 
    }
    
    
    // If we are in debug mode, let the developer know which port to attach to
    var initLog=false;
    process.execArgv.forEach(function(arg){
        if (arg.indexOf("--debug")>=0) {
            // In debug mode
            initLog=true;
            sails.log.debug("Chromis back-end server manager "+process.pid+" for "+process.env.ENVNAME+" is listening: "+arg); 
        } 
    }) 
    if (!initLog) {
        sails.log.debug("Chromis back-end server manager "+process.pid+" for "+process.env.ENVNAME+" ready"); 
    } 
    

    if (sails.config.models.migrate=="alter") {
        // Asynchronously build any indexes required for this environment
        Utility.buildIndexes(process.env.CHRDTA_DB)
    }    

    // Tell the main server
    process.send({
        status: "ready",
        env:    process.env.ENVNAME,
    })
    

    // Migrate config data before we start?
    if (sails.config.chromis.migrateConfig) {
        CFG.migrate(process.env.ENVNAME,startQueueServers);
    }
    else {
        startQueueServers();
    }   
    
}); 

 

/**
 * @Description Start queue servers
 */
function startQueueServers() {
    // Initialise server status and then fire everything up
    sails.controllers.serverstatus.initialise(function(){
        // Before doing anything, wipe out any lingering busmq queue data
        // NO!  If we have clients that have sent requests while the server
        // is starting up, we don't want them vaporised when the manager
        // is (re)starting.
        //Utility.deleteRedisKeys("bus:*",function(){
            // Now start up the back-end server instances 
            var defaultQ=false;   
            var loginQ=false;   
            xqueue.find()
                .then(function(queues){
                    async.forEach(queues,function(q,next){
                        queuesRunning[q.name]=true;
                        // Flag the fact that we have started a default queue
                        if (q.name=="default") defaultQ=true;
                        if (q.name=="login") loginQ=true;
                        var qc=0;
                        while (qc<q.minWorkers) {
                            startQueueServer(q.name,q.inactto,false);
                            qc++;   
                        } 
                        next();       
                    },function(err){
                        if (err) {
                            sails.log.error(err)
                        }
                        else {
                            // Start a default queue if we haven't already
                            if (!defaultQ) {
                                sails.log.debug("No default queue so starting one anyway for "+process.env.ENVNAME);
                                xqueue.create({
                                    name:          "default",
                                    maxWorkers:    5,
                                    minWorkers:    1,
                                    inactto:       300000,
                                },function(){
                                    startQueueServer("default",300000,false);
                                })                                
                            }
                            // Start a login queue if we haven't already
                            if (!loginQ) {
                                sails.log.debug("No login queue so starting one anyway for "+process.env.ENVNAME);
                                xqueue.create({
                                    name:          "login",
                                    maxWorkers:    5,
                                    minWorkers:    1,
                                    inactto:       300000,
                                },function(){
                                    startQueueServer("login",300000,false);
                                })            
                            }
                            // Start queue monitor
                            setTimeout(function(){qm=setInterval(checkQueues,5000)},10000);
                            
                            sails.log.debug("All queues started for Chromis back-end server manager for "+process.env.ENVNAME);                                                 
                        }
                    })         
                })
            
            
            // Test harness
            if (sails.config.chromis.queueTestHarness) {
                Q.testHarness();
                setTimeout(function(){ Q.testHarness();},5000)    
            }
            
        //})    
    });   
}    
 
/**
 * @Description Start queue server
 * @param {String}  q        Queue name
 * @param {Integer} inactto  Inactivity timeout
 */
function startQueueServer(q,inactto,loadBalancer) {
    
                
    // Fork a worker
    process.env.QUEUE=q;
    process.env.INACTTO=inactto;
    process.env.LOADBALANCER=loadBalancer;
    process.env.log={
        level:  sails.config.log.level,
    }
    var qs = childProcessDebug.fork(path.join(path.dirname(__dirname),"processes","server"));
    var server=q+"_"+qs.pid;
            
    // Register the server so we can track its status
    var rcd={
        server: server,
        pid:    qs.pid,
        queue:  q,
        status: "starting"
    };                
    //sails.log.debug(q)
    xserverstatus.create(rcd).exec(function(err,rcd){
        if (err) {
            sails.log.error("Cannot start "+server);
            sails.log.error(err)
        }
        else {        
            
            sails.log.debug("Initialising "+server+"...");
            // Tell the queue server what to do
            qs.send({
                action: "initialise"        
            });
            
                
            // React to messages
            qs.on("message",function(parms){
                
                // First of all, as soon as we see any sign of life, start
                // performance checking
                if (!pm[q]) {
                    pm[q]=setInterval(function(){checkPerformance(q)},5000);
                }
                
                
                // Update the status
                xserverstatus.update(server,{status: parms.status})
                    .exec(function(err,rcd){
                        if (err) {
                             sails.log.error(err)
                        }
                    })         
                
                // Output server situation to debugging
                /*
                setTimeout(function(){
                    ServerStatus.find()
                    .then(function(sts){
                        _.forEach(sts,function(rcd,i){
                            sails.log.debug(rcd.server+" status: "+rcd.status)
                        })
                    })
                },1000)
                */
                
            })
            
            
            qs.on("exit",function(code, signal){
                var pid=qs.pid;
                var server=q+"_"+pid;
                var msg="Server "+server+" for "+process.env.ENVNAME+" exiting with code/signal "+code+"/"+signal ;  
                xserverstatus.update(server,{status: "stopped"})
                            .then(function(){
                                // Delete any locks for this PID
                                xlock.destroy({xslpid:pid}).exec(function(){});
                            })
                            .catch(function(err){
                                sails.log.error(err)
                            })
                sails.log.debug(msg);    
                qs=null;
            })
        }
    }) 
} 


 
function checkPerformance(queueName) {
     
   
    //sails.log.debug("Checking server performance for "+queueName);
   
    function _increaseCapacity(queue){
        // Get all the server status records (excluding "stopped")
        xserverstatus.find({queue:queue.name,status: {"not":"stopped"}})
            .then(function(servers){
                // If we have capacity, start another server
                if (queue.maxWorkers<queue.minWorkers)
                    queue.maxWorkers=queue.minWorkers               
                if (queue.maxWorkers>servers.length) {
                    startQueueServer(queue.name,queue.inactto,true);
                    sails.log.debug("Increasing capacity for server '"+queue.name+"_"+process.env.ENVNAME+"'");
                }
                else {
                    if (process.env.NODE_ENV!=="development") {
                        var err="Server '"+queue.name+"_"+process.env.ENVNAME+"' is out of capacity!";
                        sails.log.error(err);
                        if (!diagnostics[queue.name]) {
                            Utility.supportEmail(err,"Chromis Server Diagnostics");	
                            diagnostics[queue.name]=true; // Only once   
                        }              
                    }                             
                }
            })
        
    }
      
    function _checkQueue(queue) {
         
        xserverstatus.find({queue:queue.name,status: {"not":"stopped"}}).exec(function(err,servers){
            
                       
            // Before checking performance, make sure that at least
            // one of the servers is ready (i.e. not still "starting")
            var ready=false;
            _.forEach(servers,function(server){
                if (server.status!="starting") {
                    ready=true;
                    return false;
                }
            })

            if (ready) {
                // Check performance           
                sails.log.verbose("Checking performance of '"+queue.name+"_"+process.env.ENVNAME+"' queue");
                Q.sendReceive(queue.name+"_"+process.env.ENVNAME,{                   
                    func:   "ping"
                },
                1000,
                {
                    onSuccess: function(response){
                        //sails.log.debug("response success");
                        diagnostics[queue.name]=false; // Allow diagnostics again                   
                    },
                    onTimeout: function(){
                        //sails.log.debug("response timeout");
                        _increaseCapacity(queue)
                    },
                    onError: function(err){          
                        sails.log.error(err)
                    }
                }) 
            }            

        }) 

    }
     
    
         
    // Ping each queue and see how long the server takes to respond
    xqueue.find({name:queueName}).exec(function(err,queues){   
        if (queues.length>0) {
              _checkQueue(queues[0]);     
        }  
    })
         
   
  
} 

function checkQueues(){

    function _checkQueue(queue,cb) {
         
        sails.log.verbose("Checking queue "+queue.name+" has enough servers")

        xserverstatus.find({queue:queue.name,status: {"not":"stopped"}}).exec(function(err,servers){
            
            // Make sure we have the correct number running
            var qc=servers.length;
            //sails.log.debug("Checking minimum servers available for "+queue.name);
            while (qc<queue.minWorkers) {
                sails.log.debug("Starting a "+queue.name+" server as we don't have the minimum level of "+queue.minWorkers.toString());
                startQueueServer(queue.name,queue.inactto,false);
                qc++;
            }
            // Make sure we haven't got too many
            while (qc>queue.maxWorkers) {
                Q.sendReceive(queue.name,{
                    action:   "stop"
                })
                qc--;
            }           

            // Callback
            if (cb) cb();  
        }) 
    }


    function _checkQueues(){
         
        var lQueuesRunning=_.extend({},queuesRunning);
        _.forEach(lQueuesRunning,function(v,q){
            lQueuesRunning[q]=false;
        })

        // Make sure we have the right number of servers running
        xqueue.find().exec(function(err,queues){
           
            async.each(queues,function(queue,next){
                //sails.log.debug("Checking "+queue.name)
                lQueuesRunning[queue.name]=true;
                _checkQueue(queue,next);
             
            },
            function(err){
                if (err) {
                    sails.log.error(err);
                }                
                else {
                    // Kill off any queues that are not running as they have been deleted from the database
                    _.forEach(lQueuesRunning,function(v,q){
                        if (lQueuesRunning[q]==false) {
                            sails.log.debug("Stopping queue "+q+" as it has been removed");
                            clearInterval(pm[q]);
                            _checkQueue({
                                name:          q,
                                maxWorkers:    0,
                                minWorkers:    0,
                                inactto:       300000,
                            })
                        }
                    })
                    queuesRunning=_.extend({},lQueuesRunning);
                }
            })
             
        })
         
    }
    
    // Time to check the queues, but decide if we need to reset the connection and reclaim
    // memory first
    if (sails.config.chromis.serverMaxMemory && new Date().getTime()-lastMemChk>=60000) {
        lastMemChk=new Date().getTime(); 
        var mem=process.memoryUsage(); 
        //sails.log.debug(mem)   
        // If we have exceeded the maximum amount of memory allowed for this task, 
        // end it and let a new one start.  This is just to avoid unexpected memory
        // leaks from killing us
        if (mem.heapUsed>sails.config.chromis.serverMaxMemory) {
            // See if garbage collection helps
            if (!Utility.gcCheck()) {
                clearIntervals();
                sails.log.debug(new Date().toString()+" Server manager for "+process.env.ENVNAME+" stopping as memory usage exceeds "+sails.config.chromis.serverMaxMemory);
                stopManager(new Date().toString()+" Restarting server manager for "+process.env.ENVNAME+" as memory usage exceeds "+sails.config.chromis.serverMaxMemory);   
            }         
        }
    }
    else {
        _checkQueues();
    }

}

function clearIntervals(){
    clearInterval(qm);
    _.forEach(pm,function(pmm){
        clearInterval(pmm)
    })
}


function stopManager(logMsg) {
    // Tell all the servers to stop, and then only stop when they are all inactive
    xserverstatus.find({status: {"not":"stopped"}})
        .populate("queue")
        .then(function(servers){
            async.eachSeries(servers,function(server,next){
                //var sn=((server.queue)?server.queue.name:"login")+"_"+process.env.ENVNAME;
                var sn=server.queue.name+"_"+process.env.ENVNAME;
                //sails.log.debug("Stopping "+sn)
                Q.sendReceive(sn,{
                    action:   "stop"
                })
                next();
            },
            function(err){
                // Exit manager when all servers have stopped
                setInterval(function(){
                    xserverstatus.find({status: {"not":"stopped"}})
                        .then(function(servers){
                            if (!servers || (servers && servers.length==0)) {  
                                if (logMsg) {
                                    sails.log.debug(logMsg)
                                }                                      
                                process.exit(0);
                            }
                        })
                },1000)                        
            })
        })
}

/**** Process listeners ********************************/
 
// Trap the fact that we have disconnected  
process.on('disconnect', function() {
	// Parent is exiting
    clearIntervals();
	process.exit(0);
});

// Trap incoming messages
process.on('message', function(parms) {
			 
	switch (parms.action) {	
         
		case "stop":
			sails.log.debug("Chromis back-end server manager  "+process.pid+" stopping for "+process.env.ENVNAME);
            clearIntervals();
            stopManager();
		 
            break;	
    }
	 
	
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
 