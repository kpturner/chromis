/**           
 *   @Module        xm0015                                                          
 *   @Description   Chromis PR maintenance                    
 *   @Author        Dan Williams                                             
 *   @Date          May 2016                                                      
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
                    self.finalise(function(err){
                        cb(self.dataout);    
                    });   
                }
                else {                    
                    // Process data model   
                    self.process(function(){
                        
                        // Finalise matters and run the callback
                        self.finalise(function(err){
                            // Pass back the payload and the delta model
                            self.dataout.err=err;
                            cb(self.dataout);    
                        });                    
                        
                    });    
                }                
                        
            });
        }
        catch(err){  
            // Oops!            
            self.dataout.err=err;
            self.finalise(function(err){
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
        self.MOD.initialise(self.me,datain,(self.action=="init"),function(err){
            
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
        var mode = self.MOD.get("mode"); 
                        
        switch (self.action) {
            case "init" :
                initialiseDisplayConditions(self);
                
                // Set some vars that we use in RML for selecting what to display.  
                self.MOD.set("displayMode",mode === "display");
                self.MOD.set("translateMode", mode === "translate");
                self.MOD.set("readonlyNonKey", (mode === "translate" || mode === "display"));
                
                // Set navBack to false. When this is set to true in backend, screen will navigate to caller.
                self.MOD.set("navBack",false);
                
                // Start off three IO functions.
                async.parallel([
                    function (callback) {
                        // Init the pr data into form if we are not in create mode. 
                        if (mode != "create") {
                            xpr.findOne({where:{id:self.MOD.get("pr")}}).exec(function(err,record){
                                if (record) {        
                                    // Send our pr object to model.
                                    self.MOD.set("pr",record);

                                    // Now that we may have all the record details, let's decide what fields to display.
                                    updateDisplayConditions(self);

                                    if (mode === "translate") {
                                        xtrans.findOne({where:{locale:self.MOD.get("transLocale"),pr:record.id}}).exec(function(err,translation){
                                            self.MOD.set("trans",translation);
                                            // Run the callback
                                            callback();                                             
                                        });       
                                    } else {
                                        callback();
                                    }
                                } else {
                                    callback();  
                                }                                         
                            });         
                        } else {
                            if (mode == "create"){
                                // If create mode then ensure we set a blank object into model ready for new values.
                                self.MOD.set("pr",{});
                            }
                            callback();     
                        }   
                    },
                    function (callback) {
                        xlocale.find({where:{key:{not:"ENG"}}}).exec(function(err,rawData){
                            // Send our array of locale objects.
                            self.MOD.set("locales",rawData);         
                            // Run the callback
                            callback();                                             
                        });   
                    },
                    function (callback) {
                        xpr.findOne({app:"chromis",func:"*all",table:"",type:"C",attrib:mode}).exec(function(err,record){
                            // Send our pr text for mode to model.
                            if (record) {
                                self.MOD.set("maintainTitle",record.text);
                            }    
                            callback();                                               
                        })    
                    }],                    
                    // When the two functions are done above, we know we have the data we need to continue.
                    function alldone() {
                        // Run the callback for process function
                        cb();
                    }
                );
                  
                break;
           
            case "set" :
                var pr = self.MOD.get("pr");
                var fieldArray = sails.models["xpr"].attributes;
                var vis = self.MOD.get("visability");
                var prUpdate = {};
                
                for (var field in fieldArray) {
                    if (vis[field] !== undefined && vis[field] === true) {
                        prUpdate[field] = pr[field];    
                    }
                }
                
                if (vis.inputType !== undefined && vis.inputType === true){
                    if (fieldArray.inputType["enum"].indexOf(pr.inputType) < 0) {
                        prUpdate.inputType = '';   
                    }
                } else {
                    prUpdate.inputType = '';   
                }

                prUpdate.table = prUpdate.table || "";

                var requiredFields = ["func","type","attrib"];
                for (var i = 0 ; i < requiredFields.length ; i++) {
                    if (prUpdate[requiredFields[i]]) {
                        requiredFields.splice(i,1);
                        i -= 1;
                    }                
                }
                if (requiredFields.length !== 0) {
                    self.MOD.Message.error("format0005",requiredFields);
                    cb();
                    return;
                }
            
                switch (mode) {
                    case "create" :
                        prUpdate.app = self.SES.env.app;

                        xpr.create(prUpdate).exec(function(err,created){
                            if (!err) {
                                self.MOD.set("navBack",true);
                            }
                            
                            // Run the callback
                            cb();                                                    
                        });

                        break;
                        
                    case "edit" :
                        xpr.update({where:{id:pr.id}},prUpdate).exec(function(err,updated){
                            if (!err) {
                                self.MOD.set("navBack",true);
                            }
                            
                            // Run the callback
                            cb();                                                    
                        });
                        break;
                        
                    case "copy" :
                        prUpdate.app = self.SES.env.app;
                        
                        xpr.create(prUpdate).exec(function(err,created){
                            xprvalue.find({where:{pr:pr.id}}).exec(function(err,rawData){
                                async.each(rawData, function(prvalueRec, callback) {
                                    delete prvalueRec.id;
                                    prvalueRec.pr = created.id;
                                    xprvalue.create(prvalueRec).exec(function(err,prvalueCreated){
                                        callback();
                                    });      
                                }, function(err){
                                    // Run the callback
                                    self.MOD.set("navBack",true);
                                    cb();   
                                });
                            });                                            
                        });
                        
                        break;
                    
                    case "translate" :
                        var trans = self.MOD.get("trans");
                        var transFieldArray = sails.models["xtrans"].attributes;
                        var tranvis = self.MOD.get("transvisability");
                        var tranUpdate = {};
                        
                        for (var field in transFieldArray) {
                            if (tranvis[field] !== undefined && tranvis[field] === true) {
                                tranUpdate[field] = trans[field];    
                            }
                        }

                        tranUpdate.pr = pr.id;
                        tranUpdate.locale = self.MOD.get("transLocale");
                        tranUpdate.translationStamp = new Date();
                        tranUpdate.translationStamp = tranUpdate.translationStamp.toISOString();

                        // We don't care about the callback from this because if it fails it's not worth
                        // worrying about.. it's just a nice to have timestamp.
                        function stampPR(id,stamp){
                            xpr.update({where:{id:id}},{translationStamp:stamp}).exec(function(err,updated){});
                        }

                        xtrans.update({where:{id:trans.id}},tranUpdate).exec(function(err,updated){
                            if (!err) {
                                if (updated.length > 0) {
                                    stampPR(pr.id,tranUpdate.translationStamp);
                                    self.MOD.set("navBack",true);
                                    cb();    
                                } else {
                                    xtrans.create(tranUpdate).exec(function(err,created){
                                        if (created) {
                                            stampPR(pr.id,tranUpdate.translationStamp);
                                            self.MOD.set("navBack",true);
                                        }
                                        cb();       
                                    });      
                                }
                            } else {
                                // Run the callback
                              cb(); 
                            }                                                   
                        });

                        break;
                        
                    default :
                        cb();
                        break;
                }
                
                break; 
                
            case "post":      
                postback(self,cb);
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

function postback(self,cb) {
    if (self.MOD.get("_postbackfield") == "translang") {
        xtrans.findOne({where:{locale:self.MOD.get("transLocale"),pr:self.MOD.get("pr").id}}).exec(function(err,translation){
            self.MOD.set("trans",translation || {});
            // Run the callback
            cb();                                          
        });    
    } else {
        updateDisplayConditions(self);
        cb();
    }   
    
    return;
};

function updateDisplayConditions(self) {
    var vis = self.MOD.get("visability");
    var tranvis = self.MOD.get("transvisability");
    var pr = self.MOD.get("pr");
    var translateMode = (self.MOD.get("mode") === "translate");
    
    vis.text       = (["F","C","B","M","E"].indexOf(pr.type) >= 0 && ((pr.text && pr.text.trim() && translateMode) || !translateMode));
        tranvis.text = (vis.text && translateMode);

    vis.inputType  = (pr.type === "F" && !translateMode);
    vis.rhsLabel   = (pr.type === "F" && ((pr.rhsLabel && pr.rhsLabel.trim() && translateMode) || !translateMode));
        tranvis.rhsLabel = (vis.rhsLabel && translateMode);

    vis.tooltip    = ((pr.type === "F" || pr.type === "C" || pr.type === "B") && ((pr.tooltip && pr.tooltip.trim() && translateMode) || !translateMode));
        tranvis.tooltip = (vis.tooltip && translateMode);

    vis.decPos     = (pr.type === "F" && (pr.inputType === "G" || pr.inputType === "M") && (pr.entryType === "B" || pr.entryType === "P" || pr.entryType === "N") && !translateMode);
    vis.maxLen     = (pr.type === "F" && (pr.inputType === "G" || pr.inputType === "M" || pr.inputType === "P") && !translateMode);
    vis.rows       = (pr.type === "F" && pr.inputType === "M" && !translateMode);
    vis.maxRows    = (pr.type === "F" && pr.inputType === "M" && !translateMode);
    vis.check      = (pr.type === "F" && pr.inputType === "C" && !translateMode);
    vis.uncheck    = (pr.type === "F" && pr.inputType === "C" && !translateMode);
    vis.entryType  = (pr.type === "F" && (pr.inputType === "G" || pr.inputType === "M") && !translateMode);
    vis.aliasTable = (pr.type === "F" && !translateMode);
    vis.alias      = (pr.type === "F" && !translateMode);
    vis.icon       = ((pr.type === "C" || pr.type === "B") && !translateMode);
    vis.place      = (pr.type === "F" && ((pr.place && pr.place.trim() && translateMode) || !translateMode));
        tranvis.place = (vis.place && translateMode);

    vis.fkey       = (pr.type === "B" && !translateMode);
    vis.default    = (pr.type === "F" && !translateMode);
    vis.confTxt    = (pr.type === "B" && ((pr.confTxt && pr.confTxt.trim() && translateMode) || !translateMode));
        tranvis.confTxt = (vis.confTxt && translateMode);

    vis.prmsg      = (pr.type === "F" && !translateMode);
    vis.regex      = (pr.type === "F" && !translateMode);
    vis.translationStamp  = (pr.type === "F" && !translateMode);

    vis.box3 = (vis.inputType || vis.maxLen || vis.rows || vis.maxRows || vis.check || vis.uncheck);
    vis.box4 = (vis.entryType || vis.decPos);
    vis.box5 = (vis.rhsLabel || vis.aliasTable || vis.alias || vis.icon || vis.place || vis.fkey || vis.default || vis.confTxt || vis.prmsg || vis.regex); 
    
    self.MOD.set("visability",vis);
    self.MOD.set("transvisability",tranvis);
    
    return;    
};

function initialiseDisplayConditions(self) {
    var prFieldArray = this["xpr"].attributes;
    var transFieldArray = this["xtrans"].attributes;
    var startVisible = ["func","table","type","attrib"];
    var vis = {};
    var tranvis = {};
    
    for (var field in prFieldArray) {
        vis[field] = (startVisible.indexOf(field) >= 0);
        if (transFieldArray[field]) {
            tranvis[field] = vis[field];
        }
    }

    vis["box3"] = false;
    vis["box4"] = false;
    vis["box5"] = false;
    
    self.MOD.set("visability",vis);
    self.MOD.set("transvisability",tranvis);
    
    return;    
};