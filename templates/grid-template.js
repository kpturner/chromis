/***** BEGIN LICENCE BLOCK ***************************/
/* The initial developer of the code is Kevin Turner   */
/* kpturner.co.uk     */
/*                                                   */
/* Portions created by Kevin Turner Systems Ltd" are   */
/* Copyright (c) 2017 K P Turner Ltd.    */
/* All Rights Reserved.                              */
/***** END LICENCE BLOCK *****************************/

/**
 *   @Module        #NAME#
 *   @Description   #DESC#
 *   @Author        #USER#
 *   @Date          #CREATEDATE#
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


        switch (self.action) {
            case "init":
		        // . . . . Do stuff
                // Set the default sort order.
                self.MOD.set("sortorder","asc");
                self.MOD.set("sortby","#PKEY#");

                // Run the callback
                cb();
                break;

            #INITGRID#

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
