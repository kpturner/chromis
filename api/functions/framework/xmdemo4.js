/**           
 *   @Module        xmdemo4                                                            
 *   @Description   Input field demo screen                     
 *   @Author        Gavin Owen                                            
 *   @Date                                                                
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


module.exports = {

    /**
     * Globals
     */
    me: Utility.getName(module),
    dataout: {},
    datain: null,
    action: null,
    MOD: null,
    SES: null,
    Func: null,


    /**
     * @name             run
     * @method
     * @description      Main procedure 
     * @param {Object}   datain The inbound data
     * @param {Object}   A map of handles to Framework objects
     * @param {Function} cb     Callback
     */
    run: function (datain, handles, cb) {
        var self = this;
        self.MOD = handles.MOD;
        self.SES = handles.SES;
        self.Func = handles.Func;
        self.datain = datain;

        self.action = datain.action.toLowerCase();
        try {
            // Initialise the function
            this.initialise(datain, function (err) {

                // If we have an error then pass it back to the client
                if (err) {
                    self.dataout.err = err;
                    self.finalise(function (err) {
                        cb(self.dataout);
                    });
                }
                else {
                    // Process data model   
                    self.process(function (err) {
                        if (err) self.dataout.err = err;
                        // Finalise matters and run the callback
                        self.finalise(function (err) {
                            // Pass back the payload and the delta model
                            if (err) self.dataout.err = err;
                            cb(self.dataout);
                        });

                    });
                }

            });
        }
        catch (err) {
            // Oops!            
            self.dataout.err = err;
            self.finalise(function (err) {
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
    initialise: function (datain, cb) {
        var self = this;
        self.MOD.initialise(self.me, datain, (self.action == "init"), function (err) {

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
    process: function (cb) {
        var self = this;


        switch (self.action) {
            case "init":

                var now = new Date();         
                var nowDate = now.getDate() +'/'+now.getMonth() +'/'+now.getFullYear();
                var nowTime = now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();       

                var example2data = [];
                var styles = [];
                var colours = [];
                var sizes = [];

                example2data[0] = {
                    key: '0',
                    value: 'Today\'s date is ' + nowDate
                };

                example2data[1] = {
                    key: '1',
                    value: 'The current time is ' + nowTime
                };

                // Data for filter examples
                styles[0] = {
                    key: 'T',
                    desc: 'T-shirt',
                    colours: ['O', 'B']
                };

                styles[1] = {
                    key: 'H',
                    desc: 'Hoodie',
                    colours: ['B', 'R']
                };

                colours[0] = {
                    key: 'O',
                    desc: 'Orange',
                    sizes: ['S', 'M', 'L']
                };


                colours[1] = {
                    key: 'B',
                    desc: 'Blue',
                    sizes: ['S', 'M', 'L']
                };

                colours[2] = {
                    key: 'R',
                    desc: 'Red',
                    sizes: ['S','M','L']
                };

                sizes[0] = {
                    key: 'S',
                    desc: 'Small'
                };
                
                sizes[1] = {
                    key: 'M',
                    desc: 'Medium'
                };
                
                sizes[2] = {
                    key: 'L',
                    desc: 'Large'
                };

                // Store all of the results in the model
                // Send our array of user objects.
                self.MOD.set("example2data", example2data);
                self.MOD.set("styles",styles);
                self.MOD.set("colours",colours);
                self.MOD.set("sizes",sizes);


                // Run the callback
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
    finalise: function (cb) {
        var self = this;

        // Perform any local tidy up here
        //.....

        // Finish off.  VERY IMPORTANT!
        self.MOD.finalise(cb);

    },

};
