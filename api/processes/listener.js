//-- ***** BEGIN LICENCE BLOCK *****
// - Copyright (c) 2017 K P Turner Ltd.    
// - All Rights Reserved.                            
// - ***** END LICENCE BLOCK *****  

//------------------------------------------------------------ 
//--  File:         listener.js               
//--  Description:  This tiny node app will listen for entries on a queue and pass them to the process that spawned (forked) it                  
//--  Author:       Kevin Turner                                      
//--  Date:         Aug 2015                              
//------------------------------------------------------------ 
// 
// Modification log
// ================
//  Inits  Date     Modification           
//  =====  ====     ============
// 
// ===================================================================

 
var _ = require("lodash");
//var Bus = require('busmq'); 
var Bus = require("../services/Bus.js");
var wsq;


// Busmq connection and event traps
 
// Establish a bus connection for the queue traffic
/*
bus = Bus.create({redis:
    ['redis://'+
        (process.env.BUS_PASS?process.env.BUS_PASS+"@":"")+
        process.env.BUS_HOST+
        ":"+
        process.env.BUS_PORT+
        (process.env.BUS_DB?"/"+process.env.BUS_DB:"")                
    ]}  
);
*/   
bus=Bus.create(process.env.BUS_PROVIDER,process.env.BUS_HOST,process.env.BUS_PORT,process.env.BUS_PASS,process.env.BUS_DB);

bus.on('error',function(err){
    console.log(err);
    process.exit(1);
})

// Trap the fact that we are online
bus.on('online', function() {                 
    // Tell the controller that we are ready
    process.send({data:"*READY"});    
});

// Trap the fact that we are offline
bus.on('offline', function() {
    // the bus is offline - redis is down...
});

// Connect the redis instances
bus.connect();

// Main process event traps

process.on('disconnect', function() {
	// Parent is exiting
	process.exit(0);
});

// When we get some data, start listening to the queue
process.on('message', function(parms) {
			 
	// Wait for stuff to arrive on a data queue also		
	var feedId=parms.feedId;   
	 
	switch(parms.action) {
	case "*LISTEN":
		
        var qualifiedQueue=(process.env.listenerPrexix || "chromis")+"_"+feedId;		
		wsq = bus.queue(qualifiedQueue);
        wsq.on('attached', function() {
            process.send({feedId:feedId,data:"*LOG:"+feedId+" listening..."});
        });
        
        // Listen for data on the queue
        wsq.on('message', function(str) {
            var log=(typeof str=="object")?JSON.stringify(str):str;
            process.send({feedId:feedId,data:"*LOG:"+feedId+" received '"+log+"'"});
            if (str=="*STOP") {
                wsq.detach();
                process.exit(0);
            }
            // Send the data back 
            var eventObj={};
    		eventObj.data=str;
	    	eventObj.feedId=feedId;
		    process.send(eventObj);		
        });
        
        // Attach to the queue and listen
        wsq.attach();
        wsq.consume(); 
        
        // Every 30 seconds, check to see if we should end
        // because there is nobody listening
        setInterval(
            _.bind(function(){
                    process.send({feedId:this.feedId,data:"*CHK:"});
                },
                {feedId:feedId}
            )
        ,30000)				
			 
		break;
	
		
	}
	
 
	 
	
});

