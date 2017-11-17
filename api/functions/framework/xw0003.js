/**          
 *   @Module        xw0003                                                         
 *   @Description   Chromis theme changer widget model handler                    
 *   @Author        Kevin Turner                                             
 *   @Date          Mar 2016                                                         
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


module.exports =  {
    
    /**
     * Globals
     */
    me:         Utility.getName(module),   
    dataout:    {},
    datain:     null,
    action:     null,
    MOD:        null,
    SES:        null,
    Func:       null,
    
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
        self.SES=handles.SES;
        self.Func=handles.Func;
        self.datain=datain;
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
        self.MOD.initialise(self.me,datain,true,function(err){
            
            // If we have an "err" then pass it back
            if (err) {
                cb(err);
            }
            else {
                // Clear out the messages
                self.MOD.Message.initialise();
                
                // Do local initialisation here
                //..... 
                                    
                // Run the callback
                cb();
            }             
           
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
        
        
        
        switch (self.action) {
            case "init":
                // Run the callback
                cb();   
                break;
            case "get":
                // get the users current theme
                var options={};
                self.Func.getDescription(self.me,function(err,desc){
                    options.title=desc;
                    // Get widget prefs
                    var prefs={};
                    prefs.xwpuser=self.SES.user.xususer;
                    prefs.xwpwidg=self.MOD.get("name");
                    xwprefs.findOne({where:prefs}).exec(function(err,opts){
                        if (opts && opts.xwpjson) {
                            // Put the function title in the options if we have a context
                            opts.xwpjson=JSON.parse(opts.xwpjson);
                            options=_.extend(options,opts.xwpjson);
                        }                  
                        // Load up the themes
                        xtheme.find().exec(function(err,themes){
                                var t=[];
                                _.forEach(themes,function(th,thi){
                                    t.push(th.xthname);
                                })
                                options.themes=t;
                                self.MOD.set("options",options)
                                cb();
                            })    
                    })
                })
                
                break;   
            case "set":
                // Set the users preferred theme
                xuser.update(self.SES.user.xususer,{
                    xustheme: self.MOD.get('theme'),
                }).exec(function(err,user){
                    if (err) {
                        sails.log.error(err)
                    }
                    else {
                        if (user.length==1) {
                            self.SES.set("user",user[0]);         
                        }                              
                    }                                    
                })
                cb();
                break; 
            default:
                 // Run the callback
                cb();  
                break;     
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
};