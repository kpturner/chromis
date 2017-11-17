/**           
 *   @Module        xw0001                                                         
 *   @Description   Chromis menu widget model handler                    
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
                
            case "set":
                // At the moment this only does one thing - set the users default function  
                xuser.update(self.SES.user.xususer,{
                    xusdftfunc: self.MOD.get('home'),
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
                 
                // Run the callback
                cb();   
                break;
                
            case "refresh":
                var menu={};
                var modules=[]; 
                var moduleTracker=[];               
                // Get authorised functions
                self.SES.get("authfuncs",function(err,authFuncs){
                    if (err) {
                        sails.log.error(err);
                    }
                    if (authFuncs) {
                        // Traverse the list of functions and get the full details
                        async.each(authFuncs,function(func,next){
                            xfunc.findOne(func)
                                .populate("xfumodule")
                                .populate("xfugroup")
                                .exec(function(err,funcObj){
                                    if (err) {
                                        next(err)
                                    }
                                    else {
                                        // Added complication of getting the translations
                                        if (funcObj && funcObj.xfutype=="" && funcObj.xfumainmnu) {
                                            self.Func.getDescription(funcObj.xfufunc,function(err,desc){                                            
                                                if (desc) {
                                                    funcObj.xfudesc=desc;
                                                }
                                                self.Func.getModuleDescription(funcObj.xfumodule.xfmmod,function(err,desc){
                                                    if (desc) {
                                                        funcObj.xfumodule.xfmdesc=desc;
                                                    }
                                                    self.Func.getGroupDescription(funcObj.xfugroup.xfggrp,function(err,desc){
                                                        if (desc) {
                                                            funcObj.xfugroup.xfgdesc=desc;
                                                        }  
                                                        
                                                        function getFunc(funcObj) {
                                                            var f={};
                                                            f.id=funcObj.xfufunc;
                                                            f.title=funcObj.xfudesc;
                                                            f.log=funcObj.xfulogreq;
                                                            f.type=funcObj.xfutype;
                                                            f.exec=funcObj.xfuexecstr;
                                                            f.icon=funcObj.xfuicon;
                                                            f.seq=funcObj.xfumenuseq;
                                                            return f;
                                                        }
                                                        
                                                        function getModule(funcObj) {
                                                            var mod={};
                                                            mod.id=funcObj.xfumodule.xfmmod;
                                                            mod.title=funcObj.xfumodule.xfmdesc;
                                                            mod.icon=funcObj.xfumodule.xfmicon;
                                                            mod.seq=funcObj.xfumodule.xfmmseq;
                                                            mod.groups=[];
                                                            return mod;
                                                        }
                                                        
                                                        function getGroup(funcObj) {
                                                            var grp={};
                                                            grp.id=funcObj.xfugroup.xfggrp;
                                                            grp.title=funcObj.xfugroup.xfgdesc;
                                                            grp.seq=funcObj.xfugroup.xfgmseq;
                                                            grp.funcs=[];                       
                                                            return grp;
                                                        }
                                                        
                                                        var m=moduleTracker.indexOf(funcObj.xfumodule.xfmmod);
                                                        if (m<0) {
                                                            moduleTracker.push(funcObj.xfumodule.xfmmod);
                                                            // Module
                                                            var mod=getModule(funcObj);
                                                            // Group
                                                            var grp=getGroup(funcObj);               
                                                            // Add function to group
                                                            grp.funcs.push(getFunc(funcObj));
                                                            mod.groups.push(grp);
                                                            modules.push(mod);
                                                        }
                                                        else {
                                                            var mod=modules[m];
                                                            // Does the group already exist in this module?
                                                            var grp=getGroup(funcObj);
                                                            var exists=false;
                                                            _.forEach(mod.groups,function(gr,g){
                                                                if (gr.id==grp.id) {
                                                                    grp=gr; 
                                                                    exists=true;
                                                                    return false;
                                                                }
                                                            })
                                                            // Add function to group
                                                            grp.funcs.push(getFunc(funcObj));
                                                            if (!exists) {
                                                                mod.groups.push(grp);
                                                            }
                                                        }
                                                                                                    
                                                        // Next function 
                                                        next();
                                                    })
                                                })
                                            })    
                                        } 
                                        else {
                                            next();
                                        }                                       
                                    }
                                })
                        },
                        function(err){
                            // All done
                            if (err) {
                                sails.log.error(err)
                            }                            
                            
                            // Now we have a fully translated list
                            // Sort the modules by display sequence
                            modules.sort(function(a,b){
                                return a.seq-b.seq
                            });
                            // Traverse and sort each group
                            _.forEach(modules,function(mod,m){
                                mod.groups.sort(function(a,b){
                                    return a.seq-b.seq
                                })
                                _.forEach(mod.groups,function(grp,g){
                                    grp.funcs.sort(function(a,b){
                                        return a.seq-b.seq
                                    })
                                })
                            })
                            
                            menu.modules=modules;                        
                            
                            self.MOD.set("menu",menu);
                            self.MOD.set("home",self.SES.user.xusdftfunc);
                            cb();
                        })
                    }                   
                    
                }) 
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