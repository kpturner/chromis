/**           
 *   @Module        xm0000                                        
 *   @Description   Chromis login screen handler                      
 *   @Author        Kevin Turner                                            
 *   @Date          Feb 2016                                                         
 *
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

var path    = require("path");
var fs      = require("fs");

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
    PR:         null, 
    
    /**
     * @name             run
     * @description      Main procedure 
     * @method
     * @param {Object}   datain The inbound data
     * @param {Object}   A map of handles to Framework objects
     * @param {Function} cb     Callback
     */
    run: function(datain,handles,cb) { 
        var self=this;
        self.MOD=handles.MOD;
        self.SES=handles.SES;
        self.PR=handles.PR; 
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
        self.MOD.initialise(self.me,datain,self.action=="init",function(err){
            
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
        var profile =self.MOD.get("user");
        var pwd     =self.MOD.get("pwd"); 
        var env     =self.MOD.get("env");
        ////sails.log.debug(self.action)
        switch (self.action) {
            case "init":
                // Initialisation
                self.SES.get(["authenticated","expired","lastRequest"],function(err,s){
                    if (s && s.authenticated && !s.expired) {
                        // Already authenticated?
                        //self.logon(profile,self.SES.env.db,cb);   
                        self.extendLoginModel(cb);                            
                    }
                    else { 
                        if (s && s.expired) {
                            self.dataout.resultCode=-900; // Must have expired                           
                            self.SES.kill(function(){
                                // trigger the usersonline event for websockets
                                self.SES().activeUsers(function(err,users){
                                    var usersonline={usersonline:(users)?users.length:0};
                                    WS.triggerEvent("usersonline",usersonline);   
                                })  
                                // Delete any locks for this session
                                //xlock.destroy({xslsession:self.SES.getToken()}).exec(function(){});    
                                Lock.releaseAllLocks(self.SES.getToken());
                                cb();
                            });    
                        }   
                        else {
                            self.MOD.set("hideloggedinusers",sails.config.chromis.hideloggedinusers); 
                            self.MOD.set("envs",[]);
                            self.MOD.set("user","");
                            self.MOD.set("pwd",""); 
                            self.SES.set({
                                authenticated:  false,
                                expired:        false,
                                lastRequest:    0,
                            },cb) 
                        }            
                    }                   
                                   
                })
               
                break;
            default:
                // Get the information on offer                
                var oldpwd  =self.MOD.get("oldpwd");
                var newpwd1 =self.MOD.get("newpwd1");
                var newpwd2 =self.MOD.get("newpwd2");
                // Deal with password change
                if (oldpwd && newpwd1 && newpwd2) {
                    if (newpwd1==newpwd2) {
                        // Change password
                        // TODO
                    }
                    else {
                        // Both passwords should match
                        self.MOD.Message.error('error0011','newpwd1')
                    }
                }
                // No errors, then continue
                if (self.MOD.Message.errorCount()==0) {
                    self.MOD.set("oldpwd","");
                    self.MOD.set("newpwd1","");
                    self.MOD.set("newpwd2","");
                    // User and password are required
                    if (!profile) {
                        self.MOD.Message.error('error0004','user')
                    }
                    if (!pwd) {
                        self.MOD.Message.error('error0005','pwd')
                    }
                }
                // No errors then validate the credentials if the environment is blank
                if (self.MOD.Message.errorCount()==0) {
                    if (!env) {
                        // Validate the credentials
                        passport.protocols.local.login(null,profile,pwd,function(err,profile){
                            if (err) {                                
                                self.MOD.Message.error(err.message,['user','pwd'])
                                // Run the callback
                                cb();           
                            }
                            if (profile) {
                                // Validated the profile, so now we need to assess the environments this profile
                                // has access to.  Start with the list of environments this server will have fired
                                // up, and then touch each one to see if the user is registered and active
                                var envs=[];
                                async.forEachOf(sails.config.chromis.environments,function(envdta,env,next){
                                    // Touch the server 
                                    Q.sendReceive("login_"+envdta.database,{
                                        func:   "xm0000a",
                                        env:    envdta.database,
                                        datain: {
                                            action: "chk",
                                            token:  self.datain.token,
                                            model:  {
                                                user: profile.username,
                                            }
                                        }
                                    },
                                    10000,
                                    {
                                        onSuccess: function(response){
                                             var model=response.dataout.model;
                                             //sails.log.debug(model)
                                             if (model && model.ok) {
                                                 var env={};
                                                 env.key=envdta.database;
                                                 if (envdta.desc) {                                                   
                                                    env.value=envdta.desc;        
                                                 }
                                                 else {
                                                    env.value=model.desc;    
                                                 }                                                 
                                                 envs.push(env);  
                                             }
                                             next();
                                        },
                                        onTimeout: function(){
                                            // Oh well, the user ain't gonna be able to log in to that environment
                                            // as it seems to be foobar
                                            sails.log.error("Login enquiry to "+envdta.database+" timed out!")
                                            next();
                                        },
                                        onError: function(error){                    
                                            sails.log.error(error)
                                            next();
                                        }
                                    })  
                                },
                                function(err){
                                    // Processed them all
                                    // If we have one environment, we can log straight on
                                    if (envs.length==0) {
                                        self.MOD.Message.error('error0001','user')
                                        // Run the callback
                                        cb();  
                                    }
                                    else {
                                        if (envs.length==1) {
                                            self.logon(profile.username,envs[0].key,cb);    
                                        }
                                        else {
                                            // Set the "envs" model value to the array we have found and
                                            // set the "env" model value to the first one in the list
                                            envs.sort(function(a,b){
                                                return ((a.key<b.key)?-1:(a.key==b.key)?0:1);
                                            });
                                            self.MOD.set("env",envs[0].key);                                        
                                            self.MOD.set("envs",envs);  
                                            // Run the callback
                                            cb();      
                                        }              
                                    }                                                         
                                   
                                })    
                                
                            }
                              
                        })  
                    }
                    else {
                        // We have the user, password and environment so we can log on
                        self.logon(profile,env,cb);    
                    }
                }
                else {
                    // Run the callback
                    cb();
                    return;      
                }
                break;     
        }   
    },
    
    /**
     * @name             logon
     * @method
     * @description      Logon after some checks
     * @param {Function} cb     Callback
     */
    logon: function(username,env,cb){
        var self=this;
        self.MOD.set("sessionid",self.SES.token);    

        // Get the complete user details
        Q.sendReceive("login_"+env,{
            func:   "xm0000a",
            env:    env,
            datain: {
                action: "get",
                token:  self.datain.token,
                model:  {
                    user: username,
                }
            }
        },
        10000,
        {
            onSuccess: function(response){
                var model=response.dataout.model;
                // Build a session object with all the relevant details and set it in one fell swoop
                if (model.user) {
                    var s={}
                    s.authenticated=true;
                    s.expired=false;
                    s.lastRequest=new Date().getTime();
                    s.user=model.user;
                    s.env=model.env;
                    s.env.db=env;
                    s.env.locale=model.user.xuslocale;
                    self.SES.setAll(s,function(){
                        self.SES.initialiseEnv(function(){
                            // Load up the model with all relevant user/environment info                    
                            self.extendLoginModel(cb);    
                        });
                    });     
                }
                else {
                    self.MOD.set("envs",[]);
                    self.MOD.set("user","");
                    self.MOD.set("pwd","");  
                    self.SES.set({
                        authenticated:false,
                        expired:true,
                        lastRequest:0,
                    },function(){
                        self.dataout.resultCode=-900; // Must have expired
                        self.SES.kill(function(){
                            // trigger the usersonline event for websockets
                            self.SES().activeUsers(function(err,users){
                                var usersonline={usersonline:(users)?users.length:0};
                                WS.triggerEvent("usersonline",usersonline);   
                            })  
                            // Delete any locks for this session
                            //xlock.destroy({xslsession:self.SES.getToken()}).exec(function(){});    
                            Lock.releaseAllLocks(self.SES.getToken());
                            cb();
                        });     
                    });
                }
            },
            onTimeout: function(){
                // Oh well, the user ain't gonna be able to log in to that environment
                // as it seems to be foobar                
            },
            onError: function(error){                    
                sails.log.error(error);                
            }
        }) 

    },
 
    /**
     * @name             extendLoginModel
     * @method
     * @description      Extend login model  
     * @param {Function} cb     Callback
     */
    extendLoginModel: function(cb){
        var self=this;  
        
        // Derive locale
        var locale=self.SES.env.locale?self.SES.env.locale:sails.config.chromis.defaultLocale;
        // Unload message
        self.MOD.set("unloadmsg",self.SES.env.xunlmsg);
        // Auto-refresh interval
        var autor=self.SES.env.xautor;
        if (autor==0) {
             self.MOD.set("autorefreshinterval",3600);
        } 
        else {
             self.MOD.set("autorefreshinterval",autor);
        }    
        
        // App lib
        self.MOD.set("applib",self.SES.env.app);
         // App name
        self.MOD.set("appname",self.SES.env.appname); 
        // Hostname
        self.MOD.set("hostname",sails.getHost());
        // IP address
        self.MOD.set("ipaddress",Utility.getIPAddress());
        // Mode
        self.MOD.set("mode",self.SES.env.mode);
        // Label terminator
        self.MOD.set("lblterm",self.SES.env.lblterm);
        // Environment name
        self.MOD.set("envname",self.SES.env.name);
        // Logo 
        self.MOD.set("logo",self.SES.env.logopath);
        // Logo dark
        self.MOD.set("logodark",self.SES.env.logodark);
        // Dark HSV value
        self.MOD.set("darkpct",(self.SES.env.darkpct || "26"));
        // HTTP server
        self.MOD.set("httpserver","node");
        // Server name
        self.MOD.set("servername","chromis");
        // Sidebar position
        self.MOD.set("sbarpos",(self.SES.user.xussidepos || self.SES.env.xsidepos));
        // Sidebar width
        self.MOD.set("sbarwidth",self.SES.env.xsidewidth);
        // Ping interval
        //self.MOD.set("ping",self.SES.env.pingint);
        self.MOD.set("ping",0);
        // Theme
        self.MOD.set("theme",(self.SES.user.xustheme || self.SES.env.xtheme));
        // PR help tips?
        self.MOD.set("showprkey",self.SES.user.xusprkeyh);
       
        // Is the user a developer?
        if (sails.config.chromis.developers && sails.config.chromis.developers.indexOf(self.SES.user.xususer)>=0) {
            self.SES.user.developer=true; // Only sets it locally
            self.SES.set("user",self.SES.user); // This persists it to the session for other servers
            self.MOD.set("timeout",3600000); 
            self.MOD.set("fulldiagnostics",true);             
        }
        else {
            var to=self.SES.env.ctimeout;
            if (!to) {
                to=90000
            }
            else {
                to=to*1000
            }
            self.MOD.set("timeout",to);
            self.MOD.set("fulldiagnostics",false);           
        } 
        // Load up some data from certain models
        var aal=[];
        var authFuncs=[];    
        var models=["xlocale","xaal","xver","xpr","xurole","xfunc","xwprefs"];        
        async.eachSeries(models,function(model,next){
            switch (model) {
                case "xlocale":
                    xlocale.findOne(locale)
                        .exec(function(err,localeDta){
                            if (err) {
                                next(err)
                            }    
                            else {
                                // Locale object
                                var l={};
                                l.name=locale;        
                                l.datepicker=localeDta.jqdpp;
                                l.desc      =localeDta.locale;
                                l.datefmt   =localeDta.datefmt;
                                l.datesep   =localeDta.datesep;
                                l.timesep   =localeDta.timesep;
                                l.decsep    =localeDta.decsep;
                                l.grid      =localeDta.jqjgr;
                                l.facebook  =localeDta.fbloc;
                                self.MOD.set("localeobj",l);
                                // Some of these things are stored separately also
                                self.MOD.set("locale",locale);
                                self.MOD.set("datepicker",l.datepicker);
                                self.MOD.set("jqgrid",l.grid);
                                
                                next();
                            }
                        })
                    break;
                case "xaal" :
                    xaal.find({sort:{xaadsc:"asc"}}).exec(function(err,adds){
                        _.forEach(adds,function(aa,a){
                            aal.push(aa.xaalib)
                        })                                               
                        next();
                    })
                    break;     
                case "xver" :
                    xver.find({bcver:{">":""}}).exec(function(err,v){
                        self.MOD.set("bcversion",v.bcver);                                                 
                        next();
                    })
                    break;     
                case "xpr" :
                    // PR constants for RQSTO and RQSFAILED
                    // Build array of PR stuff we want
                    var pr=[
                        {
                            app:    "chromis",
                            func:   self.me,
                            table:  "",
                            type:   "C",
                            attrib: "rqsto"
                        },
                        {
                            app:    "chromis",
                            func:   self.me,
                            table:  "",
                            type:   "C",
                            attrib: "rqsfailed"
                        },
                        //{
                        //    app:    "chromis",
                        //    func:   self.me,
                        //    table:  "",
                        //    type:   "F",
                        //    attrib: "dayofweek"
                        //}
                    ];
                    // The "get" methods will return the data in an array with the same number of elements                    
                    self.PR.get(locale,pr,function(err,prDta){
                        if (err) {
                            throw err
                        }
                        else {
                            self.MOD.set("timeoutmsg",prDta[0].text);
                            self.MOD.set("requestfailedmsg",prDta[1].text);  
                            ////sails.log.debug(prDta[2]);               
                            next();    
                        }                        
                    })
                    
                    break;  
                    
                case "xurole":
                    // Build a list of roles and subsequently functions the user is authorised to  
                    xurole.find({xuruser:self.SES.user.xususer})
                        .then(function(roles){
                            // Get a list of functions for each role
                            async.eachSeries(roles,function(role,cb){
                                xrfunc.find({xrfrole:role.xurrole})
                                    .exec(function(err,funcs){
                                        if (err) {
                                            sails.log.error(err)
                                            cb(err)
                                        }
                                        else {
                                            async.each(funcs,function(f,nf){
                                                // Only add the function if a node module exists
                                                xfunc.findOne(f.xrffunc).exec(function(err,func){
                                                    if (func) {
                                                        var xpath=path.join(sails.config.appPath,"api","functions");
                                                        if (func.xfuapp) {
                                                            xpath=path.join(xpath,"apps",func.xfuapp.toLowerCase());
                                                        }
                                                        else {
                                                            xpath=path.join(xpath,"framework");
                                                        }  
                                                        // Each function is in a subfolder of the same name    
                                                        xpath=path.join(xpath,func.xfufunc);     
                                                        // Does it exist?
                                                        try {                 
                                                            xpath+=".js";               
                                                            fs.accessSync(xpath);
                                                            if (authFuncs.indexOf(f.xrffunc)<0) {
                                                                authFuncs.push(f.xrffunc);                                                    
                                                            }
                                                        }
                                                        catch(e) {
                                                            //sails.log.debug(xpath+" does not exist")
                                                            // Does not exist
                                                        }    
                                                    }   
                                                    nf(); // Next function
                                                })                                                
                                            },
                                            function(err){
                                                // All functions done
                                                cb(err)
                                            })                                                                                
                                        }                                        
                                    })
                            },
                            function(err){
                                // All functions loaded for role
                                if (!err) {
                                    // Store in the session
                                    self.SES.set("authfuncs",authFuncs,next);    
                                }
                                else {
                                    next(err);    
                                }                                
                            })
                        })
                        .catch(function(err){
                            next(err)
                        })
                    break;
                                  
                case "xfunc":
                    // Default function     
                    if (self.SES.user.xusdftfunc) {
                        xfunc.findOne(self.SES.user.xusdftfunc).exec(function(err,func){
                            if (func) {
                                // Make sure the user is authorised to this function  
                                if (authFuncs.indexOf(func.xfufunc)>=0) {
                                    funcObj={};
                                    funcObj.func=func.xfufunc;
                                    funcObj.type=func.xfutype;
                                    funcObj.grp=func.xfugroup;
                                    funcObj.mod=func.xfumodule;
                                    funcObj.log=func.xfulogreq;
                                    funcObj.exec=func.xfuexecstr;                                
                                    self.MOD.set("dftfunc",funcObj);
                                }
                                next();
                            }
                            else {
                                next();
                            }
                        })
                    }
                    else {
                        next();
                    }
                    break;  
                    
                case "xwprefs":
                    var wa=[];
                    xwprefs.findOne({xwpuser:self.SES.user.xususer,xwpwidg:"widget-area"}).exec(function(err,wprefs){
                        if (err || !wprefs) {
                            self.MOD.set("widgetorder",{order:[]});
                        }
                        else {
                            var jsona=[];
                            _.forEach(JSON.parse(wprefs.xwpjson).order,function(widget,w){
                                if (widget.substr(0,2)!="L:") {
                                    jsona.push(widget);
                                }
                            })
                            self.MOD.set("widgetorder",jsona);
                        }
                        // Loop through the authorised functions and pick out
                        // widgets                 
                        async.each(authFuncs,function(func,cb){
                            xfunc.findOne(func).exec(function(err,funcObj){
                                if (err) {
                                    cb(err)
                                }
                                if (funcObj && funcObj.xfutype=="W") {
                                    if (funcObj.xfuexecstr) {
                                        wa.push(funcObj.xfuexecstr);
                                    }
                                    else {
                                        wa.push("W:"+funcObj.xfufunc);
                                    }
                                }
                                cb();
                            })        
                        },
                        function(err){
                            // All done
                            self.MOD.set("widgetarea",wa);
                            next(err);
                        }) 
                    })                 
                    break;            
            }
             
        },
        function(err){  
            // Additional applications
            self.MOD.set("additionalapps",aal); 
            
            // Get number of users online and
            // trigger the usersonline event for websockets
            self.SES.activeUsers(function(err,users){
                var usersonline={usersonline:(users)?users.length:0};
                WS.triggerEvent("usersonline",usersonline);   
            })       
            
            cb();
            
        })
        
        
        
        
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
 

