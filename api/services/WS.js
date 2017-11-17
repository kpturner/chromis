/***** BEGIN LICENCE BLOCK ***************************/                  
/* The initial developer of the code is Kevin Turner   */ 
/* kpturner.co.uk     */ 
/*                                                   */
/* Portions created by Kevin Turner Systems Ltd" are   */
/* Copyright (c) 2017 K P Turner Ltd.    */
/* All Rights Reserved.                              */
/***** END LICENCE BLOCK *****************************/   

/**         
 *   @Class         service.WS
 *   @Description   Chromis Web Sockets Services          
 *   @Author        Kevin Turner                                            
 *   @Date          Apr 2016                                                         
 */
                                                                                    
/********************************************************************/           
/*                                                                                    
/*  Modification log                                                                  
/*  ================                                                                  
/*                                                                                    
/*  Inits  Date    Modification                                                       
/*  =====  ====    ============                                                       
/*  DW	  30/06/16 Created killListeners and checkSubs from parts of checkSubs in EventController.js 
/*                                
/********************************************************************/
 
//var _ = require("lodash"); 

module.exports = { 

    bus:    null,

    /**
     * @name         service.WS.initialise
     * @method
     * @description  Initialise redis connection for busmq
     * @param  {Function} callback
     */
    initialise: function(cb){
        var self=this;
        
        if (!self.bus || (self.bus && !self.bus.isOnline())) {
            if (!self.bus) {
                self.bus = Bus.create();       
            }            

            self.bus.on('error',function(err){
                sails.log.error(err);
            })

            // Trap the fact that we are online
            self.bus.once('online', cb);

            if (!self.bus.isOnline()) {
                self.bus.connect();
            }            
            
        } 
        else {
            cb();
        }
        
    }, 
   
    /**
     * @name         service.WS.triggerEvent
     * @method
     * @description  Trigger a web socket event
     * @param  {String} feedId  The handle/id of the datapush listener
     * @param  {String} data    The event data to send to the listener 
     * @param  {Function} [callback] optional callback 
     */
    triggerEvent: function(feedId, data, cb) {
        var self=this;
        
        // Proxy function to enqueue the trigger data
        var trigger=_.bind(function(){
                var me=this;
                var qualifiedQueue=(sails.config.chromis.listenerPrexix || "chromis")+"_"+me.feedId;		
                var wsq = self.bus.queue(qualifiedQueue);
                wsq.on('attached', function() {
                    var data = (typeof me.data=="object")?JSON.stringify(me.data):data;
                    wsq.push(data);
                    wsq.detach();

                    // Persist the event for snapshots
                    var rcd={};
                    rcd.feedId=feedId;
                    rcd.data=data;
                    xwsevent.create(rcd).exec(function(err,eventData){
                        // Snapshot created
                        if (err) {
                            sails.log.error("Error creating snapshot data")
                            sails.log.error(err)
                        } 
                    })    

                    if (me.cb) me.cb(); 
                });
                wsq.attach();
            },
            {
                feedId:feedId,
                data:data,
                cb:cb
            }
        )
        
        // Initialise the bus and trigger the event
        this.initialise(trigger)        
    },

    /**
     * @name  	service.WS.checkSubs
     * @method
     * @description 
     * Check the subscribers for a feed.  If there are none, kill the feed listener.
     * @param {String} feedId     Listener/Feed id
     * @param {Function} cb       Callback with number of subs.  
     */
    checkSubs:function(feedId, cb) {
        xwsclient.find({feedId:feedId}).exec(function(err,subs){
            if (!subs) {
                cb(0);			
            } else {
                cb(subs.length);
            }	 
        }); 		
    },

    /**
     * @name  	service.WS.killListener
     * @method
     * @description 
     * Kill the feed listener.
     * @param {String} feedId     Listener/Feed id
     */
    killListener:function(feedId) {
        var self=this;

        this.initialise(function(){
            // Get a handle to the listener and kill it
            sails.controllers.event.feeds.forEach(function(feed){
                if (feed.feedId==feedId) {
                    //feed.listener.kill("SIGINT");
                    function stopListener(feedId) {
                        var qualifiedQueue=(sails.config.chromis.listenerPrexix || "chromis")+"_"+feedId;		
                        var wsq = self.bus.queue(qualifiedQueue);
                        wsq.on('attached', function() {
                            wsq.push("*STOP");
                            wsq.detach(); 
                        });
                        wsq.attach();
                    }

                    stopListener(feed.feedId);	    
                    
                    return false;
                }
            });
        });
    },
     
};