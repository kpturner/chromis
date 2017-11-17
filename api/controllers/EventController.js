/**
 *   @class         controller.EventController          
 *   @Description   Chromis Event Controller             
 *   @Author        Kevin Turner                                            
 *   @Date          Jan 2016                                                         
 *   @help          See http://sailsjs.org/#!/documentation/concepts/Controllers                                                                                 
 */

//********************************************************************/           
//*                                                                                    
//*  Modification log                                                                  
//*  ================                                                                  
//*                                                                                    
//*  Inits  Date    Modification                                                       
//*  =====  ====    ============    
//*  DW	   30/06/16 Moved parts of checkSubs out to service.WS                                                  
//*                               
//********************************************************************/

 
var childProcessDebug = require('child-process-debug'); // Allows the child process to start in debug if the master is in debug 
//var Bus = new sails.hooks.bus.Bus();
var path = require("path");

module.exports = {
		
		feeds: [], 
		
		totalUpdates: 0,
		updatesPerSecond: 0,
		updateMonitorCount: -1,
		
		/**
		 * @name  	controller.EventController.handleDashboard
		 * @method
		 * @description 
		 * Handle dashboard
		 *   Here a user has simply gone to the homepage to view dashboard information about the websocket activity		 *   
		 * @param {Object}   req    Request object   
     	 * @param {Object}   res    Response object 
		 */
		handleDashboard:function(req,res) {
			if(req.isSocket){ 
				//console.log( req.socket.id + " dashboard connection request" );	
				sails.log.debug( req.socket.id + " dashboard connection request" );					
								
				// Return data so far
				//console.log("Getting dashboard locally")
				return sails.controllers.event.getDashboard(req,res);
				
			}
			
		},
			
		
		/**
		 * @name  	controller.EventController.getDashboard
		 * @method
		 * @description 
		 * Get dashboard data
		 * @param {Object}   req    Request object   
     	 * @param {Object}   res    Response object 
		 */
		getDashboard:function(req,res) {
			if (req.isSocket) {
				//console.log("Getting dashboard") 				

				// Start dashboard process
				sails.controllers.event.startDashboard();				

				// Start update monitor if not yet started
				sails.controllers.event.updateMonitor();				 
				
				// Join
				sails.sockets.join(req.socket, "dashboard");	
				
				// Handle the socket disconnecting
				if (!req.socket._disconnectListenerAdded) {
					//console.log("disconnect event added")
					req.socket._disconnectListenerAdded=true;
					req.socket.on("disconnect",function(){
						sails.controllers.event.disconnectSocket(req.socket.id);
					})
				}		
				

				// Register socket 
				if (sails.controllers.event.dashboardMonitor) {
					sails.controllers.event.dashboardMonitor.send({
						action:"*REGISTER",
						socketId:req.socket.id,
						remoteAddress:req.socket.conn.remoteAddress
					});
					
					// Broadcast the dashboard info
					sails.controllers.event.dashboard();	
				}						
			}			
		},
		
		
		/**
		 * @name  	controller.EventController.startDashboard
		 * @method
		 * @description 
		 * Start the dashboard monitoring process
		 */
		startDashboard: function(){
			if (!sails.controllers.event.dashboardMonitor) {
                var execArgv=[];
                // If we are in debug, make sure the dashboard is also in debug.
                process.execArgv.forEach(function(arg){
                    if (arg.indexOf("--debug")>=0) {
                        // In debug mode
                        execArgv.push("--debug="+(sails.config.chromis.dashboardport?sails.config.chromis.dashboardport.toString():"8000"));
                    }
                    else {
                        execArgv.push(arg);
                    }
                }) 
				sails.controllers.event.dashboardMonitor = childProcessDebug.fork(path.join(path.dirname(__dirname),"processes","dashboard"),{
                    execArgv: execArgv,
                    //env: {
					//	BUS_PROVIDER: sails.config.chromis.busProvider,
                    //    BUS_HOST:     sails.config.bus.host,
                    //    BUS_PORT:     sails.config.bus.port,
                    //    BUS_PASS:     sails.config.bus.pass,
                    //    BUS_DB:       sails.config.bus.db,
                    //}
                });
        
                // Detect it exiting
				sails.controllers.event.dashboardMonitor.on("exit", function(code, signal){
					sails.log.debug("Dashboard process exiting with code/signal "+code+"/"+signal );
					sails.controllers.event.dashboardMonitor=null;
				})
				sails.log.debug( "Dashboard process started" );
				// Process the dashboard event
				sails.controllers.event.dashboardMonitor.on("message", function(parms) {
					switch(parms.action) {
					case "*LOG":						
						sails.log.debug(parms.data);
						break;
					case "*DASHBOARD": 
						sails.controllers.event.dashboard();
						break;
					case "*BROADCAST":
						var broadcast=parms.data;
						// Add an array of subscriptions 
						//broadcast.subs=sails.sockets.rooms();
						broadcast.feeds=[];
						sails.controllers.event.feeds.forEach(function(feed,index){
							if (feed.feedId)
								broadcast.feeds.push(feed.feedId);
						});
						// Total updates
						broadcast.totalUpdates=sails.controllers.event.totalUpdates;
						// Updates per second
						broadcast.updatesPerSecond=sails.controllers.event.updatesPerSecond;
						//sails.log.debug("Dashboard broadcast");
						//sails.log.debug(broadcast);
						 // Broadcast dashboard info
						sails.controllers.event.totalUpdates++;			
						sails.controllers.event.broadcast("dashboard","dashboard",broadcast);	
						break;
					}
				});
			}
		},
				
		
		/**
		 * @name  	controller.EventController.handleListener
		 * @method
		 * @description 
		 * Handle listener
		 * @param {Object}   req    Request object   
     	 * @param {Object}   res    Response object 
		 */
		handleListener:function(req,res) {
			 
			if(req.isSocket){ 
				// Start update monitor if not yet started
				sails.controllers.event.updateMonitor();
				
				// Register socket
				if (sails.controllers.event.dashboardMonitor) {
					sails.controllers.event.dashboardMonitor.send({
						action:"*REGISTER",
						socketId:req.socket.id,
						remoteAddress:req.socket.conn.remoteAddress
					});		
				}					
				
				// Handle the socket disconnecting
				//console.log(req.socket._disconnectListenerAdded)
				if (!req.socket._disconnectListenerAdded) {
					//console.log("disconnect event added")
					req.socket._disconnectListenerAdded=true;
					req.socket.on("disconnect",function(){
						sails.controllers.event.disconnectSocket(req.socket.id);
					})
				}			
			
				var data_from_socket = req.params.all();
				var feedId=req.param('feedid');
				var action=req.param('action');				 

				switch(action) {
				
				case "subscribe":
					// Join a room named after the feed id 
					sails.sockets.join(req.socket, feedId);
					var eventObj={};
					eventObj.type="data"; // As opposed to snapshot
					eventObj.data="*SUBSCRIBED";
                    sails.controllers.event.broadcast(req.socket.id,feedId,eventObj);
					sails.log.debug( req.socket.id + " subscribed to " + feedId );
					sails.controllers.event.dashboard();
					// Asyncronously register the socket/feed combo 
					xwsclient.create({
						feedId:		feedId,
						socketId:	req.socket.id
					}).exec(function(err){
						// Log any errors
						if (err) {
							sails.log.error(err);
						}
					})	
					break;					

				case "unsubscribe":
					// Join a room named after the feed id 
					sails.sockets.leave(req.socket, feedId);
					var eventObj={};
					eventObj.type="data"; // As opposed to snapshot
					eventObj.data="*UNSUBSCRIBED";
					sails.controllers.event.broadcast(req.socket.id,feedId,eventObj);
					sails.log.debug( req.socket.id + " unsubscribed from " + feedId );
					// Stop child process if no more subscriptions for the feed
					sails.controllers.event.checkSubs(feedId);
					sails.controllers.event.dashboard();
					// Asyncronously delete the socket/feed combo 
					xwsclient.destroy({
						feedId:		feedId,
						socketId:	req.socket.id
					}).exec(function(err,del){
						// Log any errors
						if (err) {
							sails.log.error(err);
						} 
					})		
					break;
					
				case "listen":
								
					// We only want to start a child process if there isn't one already running for the feed
					
					var startListener=function(feedId) {
					   
                        var listener = childProcessDebug.fork(path.join(path.dirname(__dirname),"processes","listener"),{
                                env: {
									BUS_PROVIDER: sails.config.chromis.busProvider,
                                    BUS_HOST:     sails.config.bus.host,
                                    BUS_PORT:     sails.config.bus.port,
                                    BUS_PASS:     sails.config.bus.pass,
                                    BUS_DB:       sails.config.bus.db,
                                    BUS_PFX:      sails.config.chromis.listenerPrefix,  
                                }
                        });
	                    
						listener.feedId=feedId;
						
						// Every 60 seconds, purge the snapshot data
						// Not necessary with redis - only used this for localDiskDB
                        /*
                        listener.purge=setInterval(_.bind(function(){
							var self=this;
							xwsevent.destroy({
								where:	{
											feedId:self.feedId 
										}
								})								
							.exec(function(err){
								if (err) {
									sails.log.error(err);
								}
								else {
									sails.log.debug("Snapshot events purged for "+self.feedId);									
								}
								
							})
						},{feedId:feedId}),60000)
						*/
                        
						// Process the data queue message every time we get one
						listener.on("message", function(eventObj) {
                            if (typeof eventObj.data=="string" && eventObj.data=="*READY") {
                                // Send listener process the details of the data queue
                                var parms=data_from_socket;						 
                                parms.feedId=feedId;
                                parms.action="*LISTEN";
                                listener.send(parms);
                            }                           
							else if (typeof eventObj.data=="string" && eventObj.data.indexOf("*LOG:")==0) {
								sails.log.debug(eventObj.data.substr(5))
							}
							else if (typeof eventObj.data=="string" && eventObj.data.indexOf("*CHK:")==0) {
								// If there are no subscribers left, kill the listener
								sails.controllers.event.checkSubs(eventObj.feedId);	
							}	
							else {
								var broadcast={};
								broadcast.type="data"; // As opposed to snapshot
								// Is the response actually an error XML string from the toolkit?
								if (typeof eventObj.data=="string" && eventObj.data.indexOf("<errnoxml>")>0) {
									// Something is wrong
									broadcast.data="*UNSUBSCRIBE";									
									listener.kill("SIGINT");
								}
								else {
									// Persist the event data for snapshots.
									broadcast.data=(typeof eventObj.data=="string")?eventObj.data:JSON.stringify(eventObj.data);									
									/**
									 * Now done in WS.triggerEvent so that we have a snapshot
									 * even if no listener is active									 
                                    var rcd={};
                                    rcd.feedId=eventObj.feedId;
                                    rcd.data=broadcast.data;
                                    xwsevent.create(rcd).exec(function(err,eventData){
                                        // Snapshot created
                                        if (err) {
                                            sails.log.error("Error creating snapshot data")
                                            sails.log.error(err)
                                        }
                                        return;
                                    })
									*/
								}	
								sails.controllers.event.totalUpdates++;
								sails.controllers.event.broadcast(eventObj.feedId,eventObj.feedId,broadcast);
								sails.controllers.event.dashboard();	
							}				  	
						});
						
						// Detect it closing
						listener.on("close", function(code, signal){
							//sails.log.debug("Process closing with code/signal "+code+"/"+signal )
							// Remove from register
							clearInterval(listener.purge);
							var i=-1
							sails.controllers.event.feeds.forEach(function(feed,index){
								if (feed.feedId==listener.feedId) {
									sails.log.debug("Listener for "+listener.feedId+" terminated" )
									i=index;
									return false;
								}
							})
							if (i>=0) 
								sails.controllers.event.feeds.splice(i,1);
							sails.controllers.event.dashboard();	
							 
						})
						
						// Detect it exiting
						listener.on("exit", function(code, signal){
							//sails.log.debug("Process exiting with code/signal "+code+"/"+signal )
						}) 
						
						return listener;
					
					}
					 
					var process=function(){												
						// Do we have a listener for this feed?
						var existing=false;
						sails.controllers.event.feeds.forEach(function(feed){
							if (feed.feedId==feedId) {
								existing=true;
								return false;
							}
						})
						if (!existing) {
							var feed={};
							feed.feedId=feedId;
							feed.listener=startListener(feedId);
							sails.controllers.event.feeds.push(feed);	
							sails.controllers.event.dashboard();	
						}
					}
					
					sails.log.debug("PROCESSING "+feedId+" for "+req.socket.id);
					
					// Get snapshot data and emit to the socket if required
					if (!req.param("ignoreSnapshot")) {
						if (req.param("snapshotLength")>0) {
							// Obtain snapshot data and then process the listener
							// Retrieve then in reverse order so that we can limit the number 
							// of rows to the last "snapshotlength" quantity. Then we will emit 
							// them in ascending order. 
							xwsevent.find({
								where:	{
											feedId:feedId 
										}, 
								sort: 	"id DESC",
								limit:	req.param("snapshotLength")
								})								
							.exec(
								function(err, events){
									if (!err) {									 
									  	if (events) {
									  		// Send them in reverse
									  		for (var i=events.length-1;i>=0;i--) {
												var eventObj=events[i];
												var emit={};
									  			emit.type="snapshot";
									  			emit.data=eventObj.data;
									  			sails.controllers.event.broadcast(req.socket.id,feedId,emit);									  			
											}									  		
									  	}
									}
									else {
										sails.log.error("Error retrieving snapshot data")
										sails.log.error(err)
									}
									process();
									return;  
								}
							)
						}
						else {
							process()
						}
					}
					else {
						process()
					}
										 
					break;						
					
				}
				
			}			
			
		},
		
		/**
		 * @name  	controller.EventController.broadcast
		 * @method
		 * @description 
		 * Broadcast event data
		 * @param {String} socketId   Socket identifier
		 * @param {String} feedId     Listener/Feed id
		 * @param {Object} eventObj   Event object
		 */
		broadcast: function(socketId,feedId,eventObj){
			try {
				sails.sockets.broadcast(socketId,feedId,eventObj);
  			}
  			catch(e) {
  				sails.log.error("Error broadcasting snapshot to socket "+socketId);
  				sails.log.error(e);
  			}			
		},
		 
		
		/**
		 * @name  	controller.EventController.updateMonitor
		 * @method
		 * @description 
		 * Update monitor
		 */
		updateMonitor:function(){
			// Start update monitor if not yet started
			if (sails.controllers.event.updateMonitorCount==-1) {
				sails.controllers.event.updateMonitorCount=0;
				setInterval(function(){
					// How many have we done in the last second?
					sails.controllers.event.updateMonitorCount++;
					sails.controllers.event.updatesPerSecond=sails.controllers.event.totalUpdates/sails.controllers.event.updateMonitorCount;
				},1000)
			}
		},
		
		/**
		 * @name  	controller.EventController.disconnectSocket
		 * @method
		 * @description 
		 * Disconnect socket
		 * @param {String} socketId   Socket identifier
		 */
		disconnectSocket:function(socketId) {
			//console.log("Disconnecting " + socketId );
			// Remove the socket from the array
			if (sails.controllers.event.dashboardMonitor) {
				sails.controllers.event.dashboardMonitor.send({
					action:"*DEREGISTER",
					socketId:socketId
				});	
			}
			// Asyncronously delete the socket client register
			xwsclient.destroy({
				socketId:	socketId
			}).exec(function(err,dels){
				// Log any errors
				if (err) {
					sails.log.error(err);
				}
				else {
					_.forEach(dels,function(del,d){
						sails.log.debug(socketId+" disconnected from "+del.feedId)
					})	
				}				
			})			
							
		},
		
		/**
		 * @name  	controller.EventController.checkSubs
		 * @method
		 * @description 
		 * Check the subscribers for a feed.  If there are none, kill the feed listener.
		 * @param {String} feedId     Listener/Feed id
		 */
		checkSubs:function(feedId) {
			//var subs=sails.sockets.subscribers(feedId);  // DEPRECATED
            // The only way we can get the number of clients in a room is like this, but it won't
            // work properly when the using clusters as it only returns clients connected to the 
            // current server
			WS.checkSubs(feedId,function(numOfSubs){
				if (numOfSubs == 0) {
					WS.killListener(feedId);
				}
			});	
		},
		
		/**
		 * @name  	controller.EventController.dashboard
		 * @method
		 * @description 
		 * Tell the dashboard process to broadcast its data
		 */
		dashboard:function() {
			if (sails.controllers.event.dashboardMonitor) {
				try {
					sails.controllers.event.dashboardMonitor.send({
						action:"*BROADCAST"
					});	
				}
				catch(e) {
					// Channel closed if shutting down
				}
			}						 
		}
		
};
