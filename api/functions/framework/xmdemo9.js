/**           
 *   @Module        xmdemo9                                                            
 *   @Description   Nested repeater demo                     
 *   @Author        Gavin Owen                                            
 *   @Date          04/05/2016                                                      
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
                // . . . . Do stuff
                self.getData(cb);
                // Run the callback
                // cb();   
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

        self.MOD.set("leftarray", self.left);
        self.MOD.set("rightarray", self.right);

        // Finish off.  VERY IMPORTANT!
        self.MOD.finalise(cb);

    },

    /**
     * @name             getData
     * @method
     * @description      Calls the DB and gets any information 
     *                   needed for the screen.  
     * @param {Function} cb     Callback
     */
    getData: function (cb) {

        var self = this;

        self.leftArray = [];
        self.rightArray = [];

        self.users = [];
        self.left = [];
        self.right = [];

        /* The following two functions are used in async.parallell
        * this is so that we can call two db reads in parallell.
        * The benefit of this is that when both are complete, a
        * a final callback is entered. In here we can do any
        * processing that we need to do when both are complete.
        */
        getUserRoles = function (callback) {
            // gets roles, if a user has already been found             
            // we slot these roles into the object

            xurole.find().populate('xurrole').
            exec(function (err, userRoles) {
                if (err) {
                    callback(err);
                }

                else {

                    _.forEach(userRoles, function (userRole, i) {

                        foundIndex = _.findIndex(self.users, function (chr) {
                            return chr.XUSUSER == userRole.xuruser;
                        });

                        if (foundIndex >= 0) {
                            self.users[foundIndex].rolesarray.push({
                                XRODESC: userRole.xurrole.xrodesc,
                                XROROLE: userRole.xurrole.xrorole
                            });
                        } else {
                            self.users.push({
                                XUSUSER: userRole.xuruser,
                                rolesarray: [{
                                    XRODESC: userRole.xurrole.xrodesc,
                                    XROROLE: userRole.xurrole.xrorole
                                }],
                                XUSNAME: ''
                            });
                        }

                    });

                    callback();
                }

            });

        };

        function getUsers(callback) {
            // gets the users, if roles have already been found for said user
            // the remaining details that we need get merged in
            xuser.find().exec(function (err, allUsers) {

                if (err) {
                    callback(err);
                } else {

                    _.forEach(allUsers, function (thisUser, i) {

                        foundIndex = _.findIndex(self.users, function (chr) {
                            return chr.XUSUSER == thisUser.xususer;
                        });

                        if (foundIndex >= 0) {
                            self.users[foundIndex].XUSUSER = thisUser.xususer;
                            self.users[foundIndex].XUSNAME = thisUser.xusname;
                        } else {
                            self.users.push({
                                XUSUSER: thisUser.xususer,
                                rolesarray: [],
                                XUSNAME: thisUser.xusname
                            });
                        }

                    });
                }

                callback();
            });

        }

        async.parallel([getUserRoles, getUsers], function bothDone(err) {

            if (err) {
                cb(err);
            } else {

                // Now that we done we can sort and divide the results into the two
                // lists.

                //First sort
                self.users = _.sortBy(self.users, 'XUSUSER');

                // Split to left and right array
                _.forEach(self.users, function (element, index) {
                    if (index % 2 === 0) {
                        self.left.push(element);
                    } else {
                        self.right.push(element);
                    }
                    // index++;
                });

                cb();

            }

        });

    },

};
