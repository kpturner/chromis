//***** BEGIN LICENCE BLOCK ***************************/                  
//* The initial developer of the code is Kevin Turner   */ 
//* kpturner.co.uk     */ 
//*                                                   */
//* Portions created by Kevin Turner Systems Ltd" are   */
//* Copyright (c) 2017 K P Turner Ltd.    */
//* All Rights Reserved.                              */
//***** END LICENCE BLOCK *****************************/   

/**      
 *   @class         service.Bus
 *   @description   Chromis Bus Services          
 *   @author        Kevin Turner                                            
 *   @date          June 2016                                                         
 */ 

//********************************************************************/           
//*                                                                                    
//*  Modification log                                                                  
//*  ================                                                                  
//*                                                                                    
//*  Inits  Date    Modification                                                       
//*  =====  ====    ============                                                       
//*                               
//********************************************************************/

 

module.exports = {

    provider:   null,
    bus:        null,
    p:          null,

    /**
     * Internal functions
     */

    _initialise: function(provider){
        var self=this; 
        if (typeof sails==="undefined") {
            // All options should be passed as parameters
            self.p=provider; 
            sails={
                config: {
                    bus: {}
                },
                log: {
                    debug:  console
                }
            };

        }
        else {
            self.p=(provider)?provider:sails.config.chromis.busProvider;
        }
        if (!self.provider) { 
            self.provider=require(self.p);
        }
    },

    /**
     * @name                service.Bus.initialise
     * @method
     * @description         Initialise message bus (clears out old queues etc)
     * @param {String}      [provider]  Override default config provider 
     * @param {Function}    cb  callback
     */
    initialise: function(provider,cb) {
        var self=this;
        this._initialise(provider);

        var keys;
        switch(self.p) {
            case "busmq":
                keys="bus:queue:*"
                break;
            case "rsmq":
                keys="chromis:bus:*"
                break;
        } 

        Utility.deleteRedisKeys([keys],cb);
    },

    /**
     * @name                service.Bus.create
     * @method 
     * @description         Create a bus to facilitate message queue creation 
     * @param {String}      [provider]  Override default config provider
     * @param {String}      [host]      Override default config host
     * @param {String}      [port]      Override default config port
     * @param {String}      [pass]      Override default config password
     * @param {String}      [db]        Override default config database
     * @return {object}
     */
    create: function(provider, host, port, pass, db){
        var self=this; 

        this._initialise(provider);      
        

        switch(self.p) {
            case "busmq":
                
                if (!self.bus) { 
                    var url='redis://'+
                            ((pass)?pass+"@":((sails.config.bus.pass?sails.config.bus.pass+"@":"")))+
                            ((host)?host:sails.config.bus.host)+
                            ":"+
                            ((port)?port:sails.config.bus.port)+
                            ((db)?"/"+db:((sails.config.bus.db?"/"+sails.config.bus.db:"")))           
                    self.bus = self.provider.create({redis:
                        [url]}  
                    );          
                }
                          
                break;
            case "rsmq":
                 
                // Create an rsmq bus that emulates busmq 
                if (!self.bus) { 
                                       
                    var BusClass=function(provider, host, port, pass, db){
                        var me=this;
                        this.RedisSMQ=null;
                        this.rsmq=null;
                        this.connected=false;
                        // Create an ioredis client
                        this.Redis  =   require("ioredis");
                        this.ioredis=   new this.Redis({
                            port:   (port)?port:(sails.config.bus.port?sails.config.bus.port:null),
                            host:   (host)?host:(sails.config.bus.host?sails.config.bus.host:null),
                            password: (pass)?pass:(sails.config.bus.pass?sails.config.bus.pass:null),
                            db:     (db)?db:(sails.config.bus.db?sails.config.bus.db:null),
                            lazyConnect: true,
                        })

                        // Add some listeners
                        this.ioredis.on("connect",function(){
                            me.connected=true;
                            //sails.log.debug("ioredis connected event");
                            me.emit("online");
                        })

                        this.ioredis.on("close",function(){
                            me.connected=false;
                            //sails.log.debug("ioredis disconnected event");
                            me.emit("offline");
                        })
                    }
                    
                    // Event emitter for the bus 
                    require("util").inherits(BusClass,require("events").EventEmitter);
                    
                    // Add methods
                    BusClass.prototype.connect=function(){
                        var me=this;
                        this.RedisSMQ=require("rsmq");
                        this.rsmq = new this.RedisSMQ({
                            client: this.ioredis,
                            ns:     "chromis:bus",  
                        })

                        // A "disconnect" listener will be added by every worker (consumer) that we 
                        // create. We don't know how many we will create, so set the maximum to something
                        // huge to prevent warnings.  The listener is removed when the worker's "stop" 
                        // method is run.                       
                        this.rsmq.setMaxListeners(9999999999);

                        // Connect ioredis
                        this.ioredis.connect()
                            .catch(function(err){
                                me.connected=false;
                                //sails.log.debug("ioredis error event");
                                me.emit("error",err);
                            })   
                    }

                    BusClass.prototype.disconnect=function(){
                        this.ioredis.disconnect();
                    };

                    BusClass.prototype.queue=function(qname){
                        var me=this; 
                        // Define a queue class
                        var QueueClass = function(bus,qname) {
                            
                            this.bus=bus;
                            this.name=qname;   
                            this.consumer=null;
                            this.attached=false;
                        }

                        // Event emitter for the bus 
                        require("util").inherits(QueueClass,require("events").EventEmitter);                        

                        // Methods of queue class
                        QueueClass.prototype.attach=function(){
                            var me=this;
                            this.bus.rsmq.getQueueAttributes({qname:this.name},function(err, resp){
                                if (err) {
                                    // Create the queue
                                    me.bus.rsmq.createQueue({
                                        qname:me.name
                                    },function(err, resp){
                                        // Emit attached event
                                        me.emit("attached");
                                        me.attached=true;
                                    })
                                }
                                else {
                                    // Already exists
                                    me.emit("attached");
                                    me.attached=true;
                                }
                            });                                           
                        };

                        QueueClass.prototype.detach=function(deleteQueue){
                            // If we are consuming, then stop
                            var me=this;

                            function tidyUp() {
                                me.bus.rsmq.getQueueAttributes({qname:me.name},function(err, resp){
                                    if (err) {
                                        me.emit("detached");
                                        me.attached=false;
                                        me.consumer=null;                             
                                    }
                                    else {
                                        if (deleteQueue && resp.msgs==0 && resp.hiddenmsgs==0) {
                                            me.bus.rsmq.deleteQueue({qname:me.name},function(err, resp){
                                                //sails.log.debug(me.name+" queue deleted");
                                                me.emit("detached");
                                                me.attached=false;
                                                me.consumer=null;
                                            });                                        
                                        } 
                                        else {
                                            me.emit("detached");
                                            me.attached=false;
                                        }                                   
                                    }
                                });          
                            }

                            // Stop the consumer if it exists and tidy up afterwards
                            if (me.consumer) {
                                me.consumer.on("stopped",tidyUp);
                                me.consumer.stop();
                            } 
                            else {
                                tidyUp();
                            }        
                            
                        };

                        QueueClass.prototype.consume=function(){
                            var me=this;
                            var RSMQWorker = require( "rsmq-worker" );
                            if (me.consumer) {
                                //sails.log.debug("Already have consumer")
                                me.consumer.start();
                            }
                            else {
                                //sails.log.debug("Creating consumer for "+me.name)
                                me.consumer=new RSMQWorker(me.name,{
                                    rsmq:       me.bus.rsmq,
                                    autostart:  true,
                                    interval:   [0.1],
                                });
                                
                                // Listeners
                                me.consumer.on("message",function(msg, next, id){
                                    //sails.log.debug("Received "+msg)
                                    me.bus.rsmq.deleteMessage({
                                        qname:  me.name,
                                        id:     id
                                    },function(err,resp){
                                        if (err) {
                                            me.emit("error",err); 
                                        }
                                        else {
                                            if (typeof msg=="string") {
                                                try {
                                                    msg=JSON.parse(msg);
                                                }
                                                catch(e) {
                                                    // Meh!
                                                }
                                            }
                                            //sails.log.debug("Emitting "+msg)
                                            me.emit("message",msg, id);
                                            next();
                                        }
                                    });                                
                                    
                                });
                                me.consumer.on("error",function(err, msg){
                                    me.emit("error",err); 
                                });
                                me.consumer.on("exceeded",function(msg){
                                    me.emit("error",new Error("Maximum receive count exceeded"))
                                });
                                me.consumer.on("timeout",function(msg){
                                    me.emit("error",new Error("Message processing timeout exceeded"))
                                });
                            }                            
                        };

                        QueueClass.prototype.push=function(msg){
                            // Enqueue a message
                            var me=this;
                            if (typeof msg=="object") {
                                msg=JSON.stringify(msg);
                            }
                            //sails.log.debug("Pushing "+msg)
                            me.bus.rsmq.sendMessage({
                                qname:      me.name,
                                message:    msg,    
                            },function(err, resp){
                                if (err) {
                                     me.emit("error",err); 
                                }
                            })
                        };

                         QueueClass.prototype.isAttached=function(){
                            // Enqueue a message
                            var me=this;
                            return me.attached;
                        };

                        // Instantiate a queue 
                        return new QueueClass(me,qname);

                        
                    },

                    BusClass.prototype.isOnline=function(){
                        return (this.ioredis && this.connected); 
                    },

                    self.bus = new BusClass(provider, host, port, pass, db);

                }
                          
                break;
        }        

        return self.bus;
    },  

}

