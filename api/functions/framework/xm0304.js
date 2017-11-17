/**           
 *   @Module        xm0304                                                            
 *   @Description   Chromis maintenance screen generator
 *                  - This program will create the specified programs in
 *                    './generated-programs/'.                     
 *   @Author        Gavin Owen                                            
 *   @Date          17/05/2016                                                      
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
var async = require("async");
var path = require('path');
var glob = require('glob');
var fs = require('fs');
var beautify_js = require('js-beautify').js_beautify;
var beautify_html = require('js-beautify').html;

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

                self.generatedPath = path.join('.', 'generated').normalize();
                self.jsPath = path.join(self.generatedPath, 'js').normalize();
                self.rmlPath = path.join(self.generatedPath, 'rml').normalize();

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
            case 'init':

                var modelsList = Object.getOwnPropertyNames(sails.models);
                var moldelsListKVP = [];

                _.forEach(modelsList, function (model) {
                    moldelsListKVP.push({
                        key: model,
                        value: model
                    });
                });


                //get the list of models
                self.MOD.set('programmodellist', moldelsListKVP);
                cb();

                break;

            case 'create':

                var specs = self.getFormData();

                self.validateFormData(specs, function (err, valid) {
                    if (valid === true) {
                        if (specs.type === 'grid') {
                            self.generateGrid(specs.model, specs.name, specs.desc, specs.prAction, specs.toGen, specs.maintenanceTarget, cb);
                        } else if (specs.type === 'maintenance') {
                            self.generateMaintenance(specs.model, specs.name, specs.desc, specs.prAction, cb);
                        }
                    } else {
                        // Run the callback
                        cb();
                    }
                });


                break;

            default:

                // Run the callback
                cb();
                break;
        }
    },

    /**
     * @name             getModelsList
     * @method
     * @description      Gets a list of all of the models   
     * @oaran {string} app      The application to get the models from
     * @param {Function} cb     Callback - needs to take params (err, data)
     */
    getModelsList: function (cb) {

        var self = this;
        var err;
        var data;
        var framework;
        var modelPath;

        modelPath = path.normalize(
            path.join('api', 'models', '**', 'models', '**', '*.js')
        );

        // glob all of the js files at this path
        // these will be all of the available models
        glob(modelPath, function (err, models) {

            if (err) {
                cb(err, null);
            }

            if (models.length > 0) {
                // Take away the path base    
                _.forEach(models, function (model, i) {
                    models[i] = path.basename(model.replace('.js', ''));
                });
                // Now we need to pass these forward into the callback
                cb(null, models);
            } else {
                cb(null, null);
            }

        });

    },

    /**
     * @name             generateMaintenance
     * @method
     * @description      generates an rennaissance maintenance screen program   
     * @oaran {string} model    The model that we are looking to generate the grid from
     * @param {string} name     The name of the program that we want to generate
     * @param {string} description  The name of the program that we want to generate
     * @param {Function} cb     Callback - needs to take params (err, data)
     */
    generateMaintenance: function (model, name, description, prAction, cb) {

        var self = this;
        var err;
        var data;

        async.parallel([
            function (acb) {
                if (model.toGen === 'both' || model.toGen === 'rml') {
                    self.generateMaintenanceRML(model, name, description, prAction, acb);
                } else {
                    acb();
                }
            }, function (acb) {
                if (model.toGen === 'both' || model.toGen === 'js') {
                    self.generateMaintenanceJS(model, name, description, acb);
                } else {
                    acb();
                }
            }], function allDone(err) {
                if (err) {
                    cb(err);
                } else {
                    cb();
                }
            }
        );
    },

    /**
     * @name             generateGrid
     * @method
     * @description      generates an rennaissance list program   
     * @oaran {string} model    The model that we are looking to generate the grid from
     * @param {string} name     The name of the program that we want to generate
     * @param {string} description  The name of the program that we want to generate
     * @param {Function} cb     Callback - needs to take params (err, data)
     */
    generateGrid: function (model, name, description, prAction, type, maintenanceTarget, cb) {

        var self = this;
        var err;
        var data;
        var functions = [];

        function js(acb) {
            self.generateGridJS(model, name, description, acb);
        }

        function rml(acb) {
            self.generateGridRML(model, name, description, prAction, maintenanceTarget, acb);
        }


        if (type === 'both' || type === 'rml') {
            functions.push(rml);
        }

        if (type === 'both' || type === 'js') {
            functions.push(js);
        }


        async.parallel(functions, function allDone(err) {
            cb();
        });

    },

    /**
     * @name             replaceAll
     * @method
     * @description      this will replace all of the instances of a value in a string   
     * @param {string} target   the string to search through
     * @param {string} search   the search term
     * @param {string} replacement  what to replace any instances of the search term with
     */
    replaceAll: function (target, search, replacement) {
        return target.replace(new RegExp(search, 'g'), replacement);
    },

    /**
     * @name             populateHeader
     * @method
     * @description      populates the values in the header of a pgm template   
     * @param {string} name         the name of the program being generated
     * @param {string} description  Description to put in the header
     */
    populateHeader: function (template, model, name, description, newTemplate) {
        var self = this;

        if (newTemplate) {
            template = self.replaceAll(template, '&YR&', new Date().getFullYear());
            template = self.replaceAll(template, '&PRGMNAMV&', name);
            template = self.replaceAll(template, '&PRGMNAMR&', name);
            template = self.replaceAll(template, '&DESCRIPTION&', description);
            template = self.replaceAll(template, '&AUTHOR&', self.SES.user.xususer);
            template = self.replaceAll(template, '&DATE&', new Date().toLocaleDateString('en-GB'));
            return template;
        }

        template = self.replaceAll(template, '#NAME#', name);
        template = self.replaceAll(template, '#DESC#', description);
        template = self.replaceAll(template, '#USER#', self.SES.user.xususer);
        template = self.replaceAll(template, '#CREATEDATE#', new Date().toLocaleDateString('en-GB'));

        return template;
    },

    /**
     * @name             generateMaintenanceRML
     * @method
     * @description      generates the rml markup for a chromis maintenance program   
     * @paran {string} model        The model that we are looking to generate the grid from
     * @param {string} name         The name of the program that we want to generate
     * @param {string} description  Description of the program
     * @param {Function} cb         Callback - needs to take params (err)
     */
    generateMaintenanceRML: function (model, name, description, prAction, cb) {

        var self = this;
        var err;
        var data;
        var fields = '';
        var pkey = '';

        // Use fs to load in a template
        templatePath = path.normalize(path.join(
            'templates', 'maintenance-template.rml'
        ));

        fs.readFile(templatePath, 'utf8', function (err, maintenanceTemplate) {

            maintenanceTemplate = self.populateHeader(maintenanceTemplate, model, name, description);

            // Get the schema info from waterline
            lSchema = _.clone(sails.models[model].schema);
            // Build the model set string
            lSchemaFieldNames = Object.getOwnPropertyNames(lSchema);


            // Build up the list of fields based on the schema of the chosen model
            _.forEach(lSchemaFieldNames, function (field, i) {
                if (lSchema[field].primaryKey === true) {
                    pkey = field;
                    fields = '<chr-inputfield ref="' + field + '" pr="{{pr \'' + field +
                        '\' \'f\' \'#FNAME#\'}}" enabled="/%createcopymode%/"></chr-inputfield>\n' + fields;
                } else {
                    fields += '<chr-inputfield ref="' + field + '" pr="{{pr \'' + field +
                        '\' \'f\' \'#FNAME#\'}}" enabled="/%editable%/" size="8"></chr-inputfield>\n';
                }
            });

            // Inject the fields
            maintenanceTemplate = self.replaceAll(maintenanceTemplate, '#FIELDS#', fields);
            // Replace all of the instances of #FNAME# with the model name
            maintenanceTemplate = self.replaceAll(maintenanceTemplate, '#FNAME#', model);
            maintenanceTemplate = self.replaceAll(maintenanceTemplate, '#FNAME.PKEY#', pkey);

            // write to a new file with the appropriate name
            self.findOrCreateDirectory(self.generatedPath, function (err) {
                if (err) { cb(err); }
                else {
                    self.findOrCreateDirectory(self.rmlPath, function (err) {
                        if (err) { cb(err); }
                        else {
                            self.writeFile('rml', maintenanceTemplate, name, function (err) {
                                if (err) { cb(err); }
                                else {
                                    // success so do what we need to do to the PR
                                    self.updatePR(prAction, lSchema, name, model, cb);
                                }
                            });
                        }
                    });
                }
            });

        });

    },

    /**
     * @name             generateGridJS
     * @method
     * @description      generates the js markup for a chromis list program   
     * @paran {string} model        The model that we are looking to generate the grid from
     * @param {string} name         The name of the program that we want to generate
     * @param {string} description  The name of the program that we want to generate
     * @param {Function} cb         Callback - needs to take params (err)
     */
    generateGridJS: function (model, name, description, cb) {

        var self = this;
        var err;
        var data;
        var templatePath;
        var primaryKey;
        var gridTemplate;
        var initGridTemplate;
        var lSchema;
        var locals = '';


        // Use fs to load in a template
        templatePath = path.normalize(path.join(
            'templates', 'grid-template.js'
        ));

        // Use fs to load in a template
        initGridTemplatePath = path.normalize(path.join(
            'templates', 'initgrid-template.js'
        ));

        async.parallel([readGridtemplate, readInitGridTemplate], function done(err) {

            gridTemplate = self.populateHeader(gridTemplate, model, name, description);

            initGridTemplate = self.replaceAll(initGridTemplate, '#FNAME#', model);

            // Get the schema info from waterline
            lSchema = _.clone(sails.models[model].schema);
            // Build the model set string
            lSchemaFieldNames = Object.getOwnPropertyNames(lSchema);

            _.forEach(lSchemaFieldNames, function (property) {
                if (lSchema[property].primaryKey === true) {
                    primaryKey = property;
                }

                locals += 'local.' + property + ' = ' + 'record.' + property;
                if (lSchema[property].type === 'text') {
                    locals += ' || \'\'';
                }
                locals += ';\n ';
            });


            initGridTemplate = initGridTemplate.replace('#IGBLOCK#', locals);
            gridTemplate = gridTemplate.replace('#INITGRID#', initGridTemplate);
            gridTemplate = self.replaceAll(gridTemplate, '#PKEY#', primaryKey);


            // write to a new file with the appropriate name
            self.findOrCreateDirectory(self.generatedPath, function (err) {
                if (err) { cb(err); }
                else {
                    self.findOrCreateDirectory(self.jsPath, function (err) {
                        if (err) { cb(err); }
                        else { self.writeFile('js', gridTemplate, name, cb); }
                    });
                }
            });

        });

        function readGridtemplate(acb) {
            fs.readFile(templatePath, 'utf8', function (err, template) {
                if (err) {
                    acb(err);
                } else {
                    gridTemplate = template;
                    acb();
                }
            });
        }

        function readInitGridTemplate(acb) {
            fs.readFile(initGridTemplatePath, 'utf8', function (err, template) {
                if (err) {
                    acb(err);
                } else {
                    initGridTemplate = template;
                    acb();
                }
            });
        }

    },

    /**
     * @name             generateGridRML
     * @method
     * @description      generates the rml markup for a chromis list program   
     * @paran {string} model        The model that we are looking to generate the grid from
     * @param {string} name         The name of the program that we want to generate
     * @param {string} description  The name of the program that we want to generate
     * @param {string} prAction     The action to take when generating PR entries
     * @param {string} maintenanceTarget     The target program to put in the navigation buttons
     * @param {Function} cb         Callback - needs to take params (err)
     */
    generateGridRML: function (model, name, description, prAction, maintenanceTarget, cb) {

        var self = this;
        var err;
        var data;
        var columns;

        // Use fs to load in a template
        // templatePath = path.normalize(path.join(
        //     'templates', 'grid-template.rml'
        // ));

        templatePath = path.normalize(path.join(
            'assets', 'res', 'framework',
            'templates', 'listscreen', 'rmllistscreen.rml'
        ));

        fs.readFile(templatePath, 'utf8', function (err, gridTemplate) {

            gridTemplate = self.populateHeader(gridTemplate, model, name, description, true);

            // Replace all of the instances of #FNAME# with the model name
            gridTemplate = self.replaceAll(gridTemplate, '#FNAME#', model);

            // Get the schema info from waterline
            lSchema = _.clone(sails.models[model].schema);
            // Build the model set string
            lSchemaFieldNames = Object.getOwnPropertyNames(lSchema);

            // Build up list of properties
            columns = '';
            _.forEach(lSchemaFieldNames, function (property) {
                columns += '<chr-datagrid-column ref="' + property + '" 	  ';
                columns += 'pr="{{pr \'' + property + '\' \'f\' \'' + model + '\'}}" ';
                columns += 'filterable="true"';
                columns += 'sortable="true"></chr-datagrid-column>\n';
            });

            // gridTemplate = gridTemplate.replace('#COLUMNS#', columns);
            gridTemplate = gridTemplate.replace('&GRIDCOLUMNS&', columns);
            gridTemplate = self.replaceAll(gridTemplate, '&MNTPGM&', maintenanceTarget);

            // write to a new file with the appropriate name
            self.findOrCreateDirectory(self.generatedPath, function (err) {
                if (err) { cb(err); }
                else {
                    self.findOrCreateDirectory(self.rmlPath, function (err) {
                        if (err) { cb(err); }
                        else {
                            self.writeFile('rml', gridTemplate, name, function (err) {
                                if (err) { cb(err); }
                                else {
                                    // success so do what we need to do to the PR
                                    self.updatePR(prAction, lSchema, name, model, cb);
                                }
                            });
                        }
                    });
                }
            });

        });


    },

    /**
     * @name             generateMaintenanceJS
     * @method
     * @description      generates the js markup for a chromis list program   
     * @paran {string} model        The model that we are looking to generate the grid from
     * @param {string} name         The name of the program that we want to generate
     * @param {string} description  The name of the program that we want to generate
     * @param {Function} cb         Callback - needs to take params (err)
     */
    generateMaintenanceJS: function (model, fileName, description, cb) {

        var self = this;
        var err;
        var data;
        var templatePath;
        var maintenanceTemplate;
        var lSchema;
        var primaryKey;
        var setLocals = '';
        var nullTypeChecks = '';
        var emptyModel = '';
        var populatedModel = '';

        // Use fs to load in a template
        templatePath = path.normalize(path.join(
            'templates', 'maintenance-template.js'
        ));

        readMaintenancetemplate(done);

        function done(err) {

            // Replace tags with appropriate data
            maintenanceTemplate = self.populateHeader(maintenanceTemplate, model, fileName, description);
            maintenanceTemplate = self.replaceAll(maintenanceTemplate, '#FNAME#', model);

            // Get the schema info from waterline
            lSchema = _.clone(sails.models[model].schema);
            // Build the model set string
            lSchemaFieldNames = Object.getOwnPropertyNames(lSchema);

            primaryKey = _.findKey(lSchema, 'primaryKey', true);
            maintenanceTemplate = self.replaceAll(maintenanceTemplate, '#FNAME.PKEY#', primaryKey);

            _.forEach(lSchemaFieldNames, function (field, i) {
                // null checks
                if (lSchema[field].primaryKey === true &&
                    lSchema[field].autoIncrement !== true) {
                    //Add a null check
                    nullTypeChecks += 'if (!record.' + field + '){\n';
                    nullTypeChecks += '  ok = false;\n';
                    nullTypeChecks += '  self.MOD.Message.error(\'error0001\', \'' + field + '\');\n';
                    nullTypeChecks += '}\n';
                }

                emptyModel += 'self.MOD.set(\'' + field + '\', \'\');\n';
                populatedModel += 'self.MOD.set(\'' + field + '\', \dta.' + field + ');\n';

                // set local vars
                if (lSchema[field].type === 'boolean') {
                    setLocals += 'local.' + field + ' = (self.MOD.get(\'' + field + '\') === \'Y\');';
                } else if (lSchema[field].type === 'number') {
                    setLocals += 'func.' + field + ' = Number(self.MOD.get(\'' + field + '\'));\n';
                } else if (lSchema[field].type.indexOf('timestamp') > -1) {
                    // TODO: add some special date handling
                    setLocals += 'local.' + field + ' = self.MOD.get(\'' + field + '\') || \'\';\n';
                } else { // else we can just assume its text, or can be handled as text
                    setLocals += 'local.' + field + ' = self.MOD.get(\'' + field + '\') || \'\';\n';
                }
            });

            maintenanceTemplate = maintenanceTemplate.replace('#NULLTYPECHECKS#', nullTypeChecks);
            maintenanceTemplate = maintenanceTemplate.replace('#SETLOCALS#', setLocals);
            maintenanceTemplate = maintenanceTemplate.replace('#EMPTYMODEL#', emptyModel);
            maintenanceTemplate = maintenanceTemplate.replace('#POPULATEDMODEL#', populatedModel);

            // write to a new file with the appropriate name
            self.findOrCreateDirectory(self.generatedPath, function (err) {
                if (err) { cb(err); }
                else {
                    self.findOrCreateDirectory(self.jsPath, function (err) {
                        if (err) { cb(err); }
                        else { self.writeFile('js', maintenanceTemplate, fileName, cb); }
                    });
                }
            });
        }

        function readMaintenancetemplate(cb) {
            fs.readFile(templatePath, 'utf8', function (err, template) {
                if (err) {
                    cb(err);
                } else {
                    maintenanceTemplate = template;
                    cb();
                }
            });
        }

    },

    /**
    * @name             writeFile
    * @method
    * @description      writes either an rml or js file based on data, filename and type
    * @param {Function} type     
    * @param {Function} data     
    * @param {Function} fileName           
    * @param {Function} cb     Callback
    */
    writeFile: function (type, data, fileName, cb) {

        var self = this;
        var fPath;
        var saveLocNormalized;

        if (type === 'js') {
            fPath = self.jsPath;
        } else {
            fPath = self.rmlPath;
        }

        saveLocNormalized = path.join(fPath, fileName + '.' + type).normalize();

        if (type === 'js') { data = beautify_js(data, { indent_size: 4 }); }
        if (type === 'rml') { data = beautify_html(data, { indent_size: 4 }); }

        fs.writeFile(saveLocNormalized, data, function (err) {
            if (err) { cb(err); }
            else { cb(null); }
        });

    },

    /**
    * @name             findOrCreateDirectory
    * @method
    * @description      Checks to see if a directory exists. If it does not then it is created.
    * @param {Function} normalizedPath     Path to check/create      
    * @param {Function} cb     Callback
    */
    findOrCreateDirectory: function (normalizedPath, cb) {

        var self = this;

        fs.mkdir(normalizedPath, function (err, folder) {
            if (err) {
                if (err.code == 'EEXIST') cb(null); // ignore the error if the folder already exists
                else cb(err); // something else went wrong
            } else cb(null); // successfully created folder
        });

    },

    /**
     * @name             getFormData
     * @method           Gets any form data from the model. 
     * @description      Get a list of the available applications  
     * @param {Function} cb     Callback
     */
    getFormData: function (cb) {

        var self = this;
        var specs = {};

        specs.name              = self.MOD.get('pgmname') || '';
        specs.desc              = self.MOD.get('pgmdesc') || '';
        specs.type              = self.MOD.get('pgmtype') || '';
        specs.model             = self.MOD.get('pgmmodel') || '';
        specs.prAction          = self.MOD.get('pgmpr') || '';
        specs.creationDate      = Date.now();
        specs.toGen             = self.MOD.get('pgmgen') || '';
        specs.maintenanceTarget = self.MOD.get('pgmmaint') || '';

        return specs;

    },

    /**
     * @name             validateFormData
     * @method
     * @description      Validate the data gathered from the form  
     * @param {Function} specs  program specs to validate
     * @param {Function} cb     Callback
     */
    validateFormData: function (specs, cb) {

        var self = this;
        var ok = true;

        async.parallel([pgmNameValid, modelValid, typeValid], allDone);

        function pgmNameValid(acb) {

            // Check there isn't already a program with the desired name
            // and that the program name is not ''
            if (!specs.model) {
                ok = false;
                self.MOD.Message.error('', 'programname');
                acb();
            } else {
                var paths = [];


                paths.push(path.normalize(
                    path.join('generated-programs', 'js', specs.name + '.js'))
                );

                paths.push(path.normalize(
                    path.join('generated-programs', 'rml', specs.name + '.rml'))
                );

                async.each(paths, checkFileNotExists, function done(err) {
                    if (err) {
                        acb(err);
                    } else {
                        acb();
                    }
                });
            }
        }

        function modelValid(acb) {
            // Check that the model exists
            if (!specs.model) {
                ok = false;
                self.MOD.Message.error('programmodel', 'programmodel');
            } else {
                if (!sails.models[specs.model]) {
                    ok = false;
                    self.MOD.Message.error('programmodel', 'programmodel');
                }
            }

            acb();
        }

        function typeValid(acb) {
            // check that the program type is set
            if (!specs.type) {
                ok = false;
                self.MOD.Message.error('', 'programtype');
            }
            acb();
        }

        function allDone() {
            // All done, send back
            cb(null, ok);
        }

        function checkFileNotExists(filePath, nacb) {
            glob(filePath, function (err, dta) {
                if (err) {
                    ok = false;
                    self.MOD.Message.error('', 'programname');
                    nacb(err);
                } else {
                    if (dta.length > 0) {
                        ok = false;
                        self.MOD.Message.error('', 'programname');
                    }
                    nacb();
                }
            });
        }
    },

    /**
     * @name             updatePR
     * @method
     * @description      Creates the records in the PR based on the schema  
     * @param {String}   mode     
     * @param {Object}   schema     
     * @param {String}   programName
     * @param {String}   modelName
     * @param {Function} cb     Callback
     */
    updatePR: function (mode, schema, programName, modelName, cb) {

        var self = this;

        // Build the model set string
        var schemaFieldNames = Object.getOwnPropertyNames(schema);

        function loopOnSchema() {

            // Build up the list of fields based on the schema of the chosen model
            async.each(schemaFieldNames, function (field, acb) {

                // Get the schema info from waterline
                curModel = _.clone(schema[field]);
                curModel.fieldName = field;
                self.editPREntry(mode, curModel, programName, modelName, acb);

            }, function alldone(err) {
                if (err) {
                    cb(err);
                } else {
                    cb();
                }
            });
        }

        if (mode === 'create') {
            xpr.destroy()
                .where({ func: programName, table: modelName })
                .exec(function (err, results) {
                    if (err) {
                        cb(err);
                    } else {
                        loopOnSchema();
                    }
                });
        } else {

            loopOnSchema();
        }

    },


    /**
    * @name             editPREntry
    * @method
    * @description      Creates a PR entry for a schema field 
    * @param {String}   mode
    * @param {Object}   fieldInfo
    * @param {String}   programName
    * @param {Function} cb     Callback
    */
    editPREntry: function (mode, fieldInfo, programName, modelName, cb) {
        var self = this;

        var prEntry = {};

        prEntry.func = programName;
        prEntry.attrib = fieldInfo.fieldName;
        prEntry.text = fieldInfo.fieldName;
        prEntry.tooltip = fieldInfo.fieldName;
        prEntry.app = 'CHROMIS'; // TODO: FILL THIS WITH THE RIGHT THING

        prEntry.table = modelName;
        prEntry.type = 'F';

        if (fieldInfo.type === 'integer') {
            prEntry.inputType = 'G';
            prEntry.entryType = 'B';

        } else if (fieldInfo.type === 'timestamp with time zone') {
            prEntry.inputType = 'G';
            prEntry.entryType = 'D';

        } else if (fieldInfo.type === 'boolean') {
            prEntry.inputType = 'C';
            prEntry.check = true;
            prEntry.uncheck = false;

        } else { // It will be text - or should be handled as text
            prEntry.inputType = 'G'; //: alphanumeric text
        }

        if (mode === 'create') {
            // Clear where programname = programname
            xpr.create(prEntry).exec(function (err, created) {
                if (err) { cb(err); }
                else {
                    cb();
                }
            });

        } else if (mode === 'createnew') {

            // try and find.. if not found then create.
            xpr.findOrCreate({
                func: programName,
                table: prEntry.table,
                attrib: prEntry.attrib,
                type: prEntry.type
            }, prEntry).exec(function (err, createdOrFoundRecords) {
                if (err) {
                    cb(err);
                } else {
                    cb();
                }
            });
        } else {
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

        // Perform any local tidy up here
        //.....

        // Finish off.  VERY IMPORTANT!
        self.MOD.finalise(cb);

    },
};
