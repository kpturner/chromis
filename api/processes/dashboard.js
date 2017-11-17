//-- ***** BEGIN LICENCE BLOCK *****
// - Copyright (c) 2017 K P Turner Ltd.    
// - All Rights Reserved.                            
// - ***** END LICENCE BLOCK *****  

//------------------------------------------------------------ 
//--  File:         dashboard.js               
//--  Description:  This tiny node app will deal with dashboard updates. It is forked from the main process                  
//--  Author:       Kevin Turner                                      
//--  Date:         Sept 2015                          
//------------------------------------------------------------ 
// 
// Modification log
// ================
//  Inits  Date     Modification           
//  =====  ====     ============
// 
// ===================================================================

var socketIds=[];
var clients=[];
var clientSockets=[];

// If we are in debug mode, let the developer know which port to attach to
var initLog=false;
process.execArgv.forEach(function(arg){
    if (arg.indexOf("--debug")>=0) {
        // In debug mode
        initLog=true;     
        console.log('"Dashboard" is listening: '+arg); 
    } 
}) 
if (!initLog) {
    console.log('"Dashboard" is ready'); 
}


process.on('disconnect', function() {
	// Parent is exiting
	process.exit(0);
});

process.on('message', function(parms) {
	
	switch(parms.action) {
	case "*REGISTER":
		registerSocket(parms.socketId,parms.remoteAddress)
		break;
	case "*DEREGISTER":
		deRegisterSocket(parms.socketId)
		break;
	case "*BROADCAST":
		var broadcast={};
		broadcast.action="*BROADCAST";
		broadcast.data={};
		broadcast.data.totalClients=clients.length;
		broadcast.data.totalSockets=socketIds.length;
		process.send(broadcast);	
		break;
	}	
	
});


/**
 * Register socket
 */
registerSocket=function(socketId,remoteAddress) {
	var clientSockets;
	var i;
	if (socketIds.indexOf(socketId)<0) {
		socketIds.push(socketId);
	}
	
	// Is there a remote client already registered for this IP address
	var rc=-1
	clients.forEach(function(c,i){
		if (c.ip==remoteAddress) {
			rc=i;
			return false;
		}
	})
	if (rc>=0) {
		//console.log(req.socket.conn.remoteAddress+" already registered");
		c=clients[rc];
		if (c.sockets.indexOf(socketId)<0)
			c.sockets+=","+socketId;
	}
	else {
		//console.log("Registering "+req.socket.conn.remoteAddress);
		var c={};
		c.ip=remoteAddress;
		c.sockets=socketId;
		clients.push(c)
	} 
	//console.log(clients)
	//console.log(clients.length)
	//console.log(sockets.length)
}

/**
 * Disconnect socket
 */
deRegisterSocket=function(socketId) {
	//console.log("Disconnecting " + socketId );
	var i=socketIds.indexOf(socketId);
	if (i>=0) {
		
		// Remove from remote address register if need be
		var s=-1;
		clients.forEach(function(client,idx){
			if (client.sockets.indexOf(socketId)>=0) {
				client.sockets=client.sockets.replace(RegExp(","+socketId,"g"),"");
				client.sockets=client.sockets.replace(RegExp(socketId,"g"),"");
				// No more sockets?
				if (client.sockets.length==0) {
					s=idx;
					process.send({action:"*LOG",data:client.ip + " has disconnected"});
				}								
				return false; // Break out of loop
			}						
		})
		
		if (s>=0) {
			clients.splice(s,1);		
		}
		
		socketIds.splice(i,1);
	}
	
	process.send({action:"*LOG",data:socketId + " has disconnected"});
	process.send({action:"*DASHBOARD",data:{}}); 
}