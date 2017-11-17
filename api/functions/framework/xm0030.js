/**
 *   @Module        xm0030
 *   @Description   Icon Gallery
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

/*
  Required modules
*/
var fs = require('fs');
var path = require('path');

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

        // init and refresh are the two actions that this program uses
        // however both do the same thing. so just treat them the same
        if (self.action === 'init' || self.action === 'refresh') {

            self.searchTerm = self.MOD.get('XICTEXT');
            self.searchTerm = (self.searchTerm) ? self.searchTerm : '';
            // XUSEDPR is triggered by the checkbox labeled - show all available icons
            // therefor if it is set to true we want to find all of the icons.
            // if not we only want the ones in the PR.
            if (self.MOD.get('XUSEDPR') === '1') {
                self.allAvailable = true;
            } else { self.allAvailable = false; }

            self.search(cb);

        } else {
            // Invalid action so just run the callback and return no data
            cb();
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

        // Store all of the results in the model
        // Send our array of user objects. 
        self.MOD.set("icons", self.iconsArray);

        // Perform any local tidy up here
        //.....

        // Finish off.  VERY IMPORTANT!
        self.MOD.finalise(cb);

    },

    /**
     * @name             search
     * @method
     * @description      Performs a search on the two css files that include icons
     * @param {Function} cb     Callback
     */
    search: function (cb) {
        var self = this;

        self.iconsArray = [];
        self.iconClasses = [];

        var searchData = [{
            path: path.normalize(
                path.join('.', 'assets', 'css', 'webhostinghub-' +
                    'glyphs', 'webhostinghub-glyphs.css')),
            prefix: '.icon-'
        }, {
                path: path.normalize(
                    path.join('.', 'assets', 'css', 'chr-glyphs', 'chr-glyphs.css')),
                prefix: '.chr-icon-'
            }];

        // async.each allows for a kind of forEach with async operations
        async.each(searchData,

            // This is the action that we want to perform on each
            function each(item, callback) {
                self.getIconsFromCSSFile(item.path, item.prefix, self.searchTerm, callback);
            },

            //This is the function to call when all of the items are done
            function allDone(err) {

                if (err) {
                    cb(err);
                }
                else {

                    // If this is set to false then we need to
                    // go and get of the icons that have been used from
                    // the database.
                    if (!self.allAvailable) {
                        self.trimToUsedIcons(cb);
                    } else {

                        // We then push them onto the self.iconsArray
                        _.each(self.iconClasses, function pushToSelf(iconClass) {
                            self.iconsArray.push({
                                'class': iconClass,
                                'tip': ''
                            });
                        });

                        cb();
                    }
                }
            }
        );

    },

    /**
     * @name             getIconsFromCSSFile
     * @method
     * @description      This function takes a path and a prefix
     *                   and will find all instances of classes
     *                   with that prefix
     * @param {string} path    - The path to the css fuile where icon details
                                 are stored
     * @param {string} prefix  - The css class prefix for icons.
     * @param {string} term    - The search term we are looking for.
     * @param {string} cb      - The callback to speak to when we are all done.
     */
    getIconsFromCSSFile: function (file, prefix, term, cb) {
        var self = this;

        // Locals
        var lFile = file;

        // First of all we need to pull in the CSS file
        fs.readFile(file, 'utf8', function traverseFile(err, data) {

            var regexstring = '';

            // if there is an error then we need to cascade back up
            if (err)
                cb(err);
            else {

                // If the search term contains the prefix we need to replace it when searching the relevant file
                // this will allow for searches like 'chromis', 'chr-icon' etc.
                if (term.indexOf('chr-icon') > -1 && prefix === '.chr-icon-') term = term.replace('chr-icon', '');
                if (term.indexOf('chromis') > -1 && prefix === '.chr-icon-') term = term.replace('chromis', '');
                if (term.indexOf('icon') > -1 && prefix === '.icon-') term = term.replace('icon', '');

                // We need to escape any '.' characters otherwise the 
                // regex will pick up a load of extra rubbish.
                prefix = prefix.replace('.', '\\.');


                // Inject the prefix into the regular expression
                regexstring = prefix + '[a-zA-Z0-9-]*' + term + '[a-zA-Z0-9-]*';

                // and then create a new regex object.
                var regexp = new RegExp(regexstring, 'g');

                // Run the regex search on the data
                // Loop through all of the data
                found = data.match(regexp);

                if (found != null) {
                    found.forEach(function (element) {
                        self.iconClasses.push(element.replace('.', ''));
                    }, this);
                }

                // return the data back to the callback
                cb(null);

            }

        });

    },

    /**
     * @name             trimToUsedIcons
     * @method
     * @description      This looks at the array of icons that we found from searching through
     *                   the css files and compares them with the records in the presentation
     *                   repository. It then removes any unused icons from the self.iconsArray.
     * @param {Function} cb     Callback
     */
    trimToUsedIcons: function (cb) {
        var self = this;

        xpr.findByIconIn(self.iconClasses, function proccess(err, found) {

            if (err) {
                cb(err);
            } else {
                // TODO: build up the tooltip
                // it looks like i need to somehow merge 
                // a whole bunch of data here from each of the prs.

                // loadash uniq finds all of the unique values
                found = _.uniq(found, 'icon');
                // We then push them onto the self.iconsArray
                _.each(found, function pushToSelf(item) {
                    self.iconsArray.push({
                        'class': item.icon,
                        'tip': ''
                    });
                });

                cb();
            }

        });

    },

};
