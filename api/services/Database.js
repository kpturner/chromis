/***** BEGIN LICENCE BLOCK ***************************/
/* The initial developer of the code is Kevin Turner   */
/* kpturner.co.uk     */
/*                                                   */
/* Portions created by Kevin Turner Systems Ltd" are   */
/* Copyright (c) 2017 K P Turner Ltd.    */
/* All Rights Reserved.                              */
/***** END LICENCE BLOCK *****************************/

/**     
 *   @Class         service.Database 
 *   @Description   Chromis Database merging utilities                  
 *   @Author        Dan Williams                                            
 *   @Date          May 2016                                                         
 */

/********************************************************************/
/*                                                                                    
/*  Modification log                                                                  
/*  ================                                                                  
/*                                                                                    
/*  Inits  Date    Modification                                                       
/*  =====  ====    ============                                                       
/*                               
/********************************************************************/

/**
 * Module dependencies
 */

var fs = require("fs");  

module.exports = {
	
	/**
     * @name        service.Database.exportPr
     * @method
     * @description Export the presentation repository and all associated values to JSON file. File will be exported to assets.
     * @param {String} exportName  Name of exported file.
	 * @param {(String|String[])} selectedpr  The PR id(s) of records to be exported.
	 * @param {exportedCallback} cb  Callback.
     */
    exportPr: function(exportName,selectedpr,cb){
        var fileLoc = exportName || "prExport";
        fileLoc += ".json";
        
        xpr.find(selectedpr ? {where:{id:selectedpr}} : {}).exec(function(err,rawData){
            async.each(rawData, function(prRecord, callback) {
                xprvalue.find({where:{pr:prRecord.id}}).exec(function(err,prvalueRawData){
                    if (prvalueRawData !== undefined) {
                        prRecord.prvalues = prvalueRawData;     
                    }
                       
                    callback();
                });      
            }, function(err){
                fs.writeFile("assets/" + fileLoc,JSON.stringify(rawData,null,4),function(err) {
                    if(err) {
                        console.log(err);  
                    }
                    
                    cb(fileLoc);
                });        
            });
        })   
    },
    
	/**
     * @name        service.Database.getPrDifference
     * @method
     * @description Detect the difference between local PR and JSON file PR.
     * @param {String} fileLoc  Full path of JSON file to be read.
     * @param {String} progress Listener ID for progress bar.
	 * @param {differenceCallback} cb Callback.
     */	 	 
    getPrDifference: function(fileLoc,progress,cb){
        var gPrs = [];
        var prAttribs = sails.models["xpr"].attributes;
        var prvalueAttribs = sails.models["xprvalue"].attributes;
        
        var updated = [];
        var created = [];
        
        delete prAttribs["id"];
        delete prAttribs["createdAt"];
        delete prAttribs["updatedAt"];
        delete prAttribs["translationStamp"];
        
        delete prvalueAttribs["pr"];
        delete prvalueAttribs["id"];
        delete prvalueAttribs["createdAt"];
        delete prvalueAttribs["updatedAt"];
        delete prvalueAttribs["translationStamp"];
        
        fs.readFile(fileLoc, "utf8", function (err,jsonString) {
            if (err) {
                console.log(err);
                fs.unlink(fileLoc, function(){ 
                    cb();
                });
            } else {
                fs.unlink(fileLoc, function(){ 
                    if (err) {
                        console.log(err);
                        cb();
                    } else {
                        gPrs = JSON.parse(jsonString);
                        var gprcounter = 0;
                        var currentPercent = 0;

                        // We can't use async.each here, we must use eachSeries - because the function can take so long... we want to stay in control 
                        // of what is still to happen so we can not continue if we have no listeners.
                        async.eachSeries(gPrs, function(gPr, callback) {
                            var livePercent = 0;
                            function thisDone(){
                                WS.checkSubs(progress,function(numOfSubs){
                                    if (numOfSubs == 0) {
                                        // Making callback with an error means that we will not continue the eachSeries, but instead go to final callback now.
                                        callback("No listeners");    
                                    } else {
                                        livePercent = Math.ceil((gprcounter / gPrs.length) * 100);
                                        if (livePercent > currentPercent) {
                                            if (progress) {
                                                WS.triggerEvent(progress,{value:livePercent});
                                            } 
                                            currentPercent = livePercent;
                                        }
                                        
                                        gprcounter += 1;
                                        callback();
                                    }
                                });
                            }

                            xpr.findOne({app:gPr.app,func:gPr.func,table:gPr.table,type:gPr.type,attrib:gPr.attrib}).exec(function(err,lPr){ 
                                if (!err) {         
                                    if (lPr !== undefined) {
                                        var somethingDifferent = false;
                                        
                                        async.each(gPr.prvalues, function(gPrvalue, prvalueCallback) {
                                            xprvalue.findOne({where:{pr:lPr.id,seq:gPrvalue.seq}}).exec(function(err,lPrvalue){
                                                if (lPrvalue === undefined) {
                                                    somethingDifferent = true;
                                                } else {
                                                    for (var attr in prvalueAttribs) {
                                                        if (lPrvalue[attr] !== gPrvalue[attr]) {
                                                            somethingDifferent = true;
                                                            break;      
                                                        }
                                                    }    
                                                }
                                                
                                                prvalueCallback();
                                            });          
                                        }, function(err){
                                            if (somethingDifferent === false) {
                                                for (var attr in prAttribs) {
                                                    if (lPr[attr] !== gPr[attr]) {
                                                        somethingDifferent = true;
                                                        break;      
                                                    }
                                                }
                                            }
                                            
                                            if (somethingDifferent === true) {
                                                gPr.id = lPr.id;
                                                gPr.index = updated.length;
                                                updated.push(gPr);
                                                thisDone();
                                            } else {
                                                thisDone();
                                            }        
                                        });
                                    } else {
                                        delete gPr.id;
                                        gPr.index = created.length;
                                        created.push(gPr);
                                        thisDone();
                                    }                                       
                                } else {
                                    console.log(err);
                                    thisDone();
                                }    
                            });   
                            
                        }, function(err){
                            if (progress) {
                                WS.checkSubs(progress,function(numOfSubs){
                                    if (numOfSubs > 0) {
                                        // Reset prog bar to 0
                                        WS.triggerEvent(progress,{value:0});
                                    }
                                });
                            }

                            // Run the callback
                            cb(created,updated);       
                        });
                    }
                });
            }
        });      
    },
	
	/**
     * @name        service.Database.deleteExportedTable
     * @method
     * @description Delete a previously exported JSON file.
     * @param {String} exportName  Name of JSON file to be deleted. Function will look in assets folder.
     */	     
    deleteExportedTable: function(exportName){
        var fileLoc = "assets/";

        if (exportName) {
            if (exportName.length > 5 && exportName.substring(exportName.length - 5,exportName.length).toLowerCase() === ".json") {
                fileLoc += exportName;
            } else {
                fileLoc += exportName + ".json";
            }

            fs.unlink(fileLoc); 
        }
    },

	/**
     * @name        service.Database.exportTable
     * @method
     * @description Export basic table to JSON. File will be exported to assets.
     * @param {String} tableName  Name of table to be exported. E.g "xfunc".
	 * @param {(String|String[])} selectedRecords  The id(s) of records to be exported.
	 * @param {exportedCallback} cb Callback.
     */	 	 
    exportTable: function(tableName, selectedRecords, cb){
        var fileName = tableName + "_export.json";
        var table = sails.models[tableName] || undefined;
        var primaryKey = "";
        var criteria = {};

        // As long as we have been given a valid table name and it has attributes, continue.
        if (table && table.attributes) {
            // Loop the attributes of the table. When we find primaryKey then stop looping.
            for (var attr in table.attributes) {
                if (table.attributes[attr].primaryKey === true) {
                    primaryKey = attr;
                    break;
                }    
            }

            // If we have a primary key, use this to build search criteria with the keys passed in selectedRecords.
            if (primaryKey && selectedRecords) {
                criteria.where = {};
                criteria.where[primaryKey] = selectedRecords;
            }
            
            table.find(criteria).exec(function(err,rawData){
                // We place the returned records in a data attribute in exported json. This means we can have additional info
                // like when the data was exported and the table name.
                fs.writeFile("assets/" + fileName,JSON.stringify({table: tableName, data:rawData, exportedAt: Date.now()},null,4),function(err) {
                    if(err) {
                        console.log(err);  
                    }
                    
                    cb(fileName);
                });      
            })  
        }
    },
	
	/**
     * @name        service.Database.differenceTable
     * @method
     * @description Detect the difference between local table and exported table JSON.
	 * @param {String} tableName  Name of table to determine difference for. E.g "xfunc".
     * @param {String} filePath  Full path of JSON file to be read.
     * @param {String} progress Listener ID for progress bar.
	 * @param {differenceCallback} cb Callback.
     */	 	 
    differenceTable: function(tableName, filePath, progress, cb){
        var gRecords = [];
        var table = sails.models[tableName] || undefined;
        var primaryKey = "";
        var criteria = {};
        
        var updated = [];
        var created = [];
        
        delete table.attributes["createdAt"];
        delete table.attributes["updatedAt"];

        // As long as we have been given a valid table name and it has attributes, continue.
        if (table && table.attributes) {
            // Loop the attributes of the table. When we find primaryKey then stop looping.
            for (var attr in table.attributes) {
                if (table.attributes[attr].primaryKey === true) {
                    primaryKey = attr;
                    break;
                }    
            }

            fs.readFile(filePath, "utf8", function (err,jsonString) {
                if (err) {
                    console.log(err);
                    fs.unlink(filePath, function () {
                        cb();
                    });
                } else {
                    fs.unlink(filePath, function () {
                        if (err) {
                            console.log(err);
                            cb();
                        } else {
                            // We are not currently utilising the exported timestamp or table name here.
                            gRecords = JSON.parse(jsonString).data; 
                            var grecCount = 0;
                            var currentPercent = 0;
                            
                            async.eachSeries(gRecords, function(gRecord, callback) {
                                var livePercent = 0;
                                function thisDone(){
                                    WS.checkSubs(progress,function(numOfSubs){
                                        if (numOfSubs == 0) {
                                            // Making callback with an error means that we will not continue the eachSeries, but instead go to final callback now.
                                            callback("No listeners");    
                                        } else {
                                            livePercent = Math.ceil((grecCount / gRecords.length) * 100);
                                            if (livePercent > currentPercent) {
                                                if (progress) {
                                                    WS.triggerEvent(progress,{value:livePercent});
                                                } 
                                                currentPercent = livePercent;
                                            }
                                            
                                            grecCount += 1;
                                            callback();
                                        }
                                    });
                                }

                                // For each of the records we have read in, using the primary key, build criteria to find the table version.
                                if (primaryKey) {
                                    criteria.where = {};
                                    criteria.where[primaryKey] = gRecord[primaryKey];
                                } else {
                                    criteria = {};
                                }

                                table.findOne(criteria).exec(function(err,lRecord){ 
                                    if (!err) {         
                                        // As long as we have found a record then we start to check if anything is different. 
                                        if (lRecord !== undefined) {
                                            var somethingDifferent = false;
                                            
                                            for (var attr in table.attributes) {
                                                // Skip this attribute check if its a date or datetime.
                                                if (!(table.attributes[attr].type && (table.attributes[attr].type === "date" || table.attributes[attr].type === "datetime"))) {
                                                    if (lRecord[attr] !== gRecord[attr]) {
                                                        // When we find a difference between the read in record and the table version then we get out of the loop.
                                                        // We dont need to see what else is different because we class the record as a potential update whether it has 1 or more difference.
                                                        somethingDifferent = true;
                                                        break;      
                                                    }
                                                }
                                            }
                                            
                                            // If we did indeed find something different then we know its one we may wish to update.
                                            if (somethingDifferent === true) {
                                                gRecord.index = updated.length;
                                                updated.push(gRecord);
                                                thisDone();
                                            } else {
                                                thisDone();
                                            }        

                                        // If we havent found a record then we know its one that we may wish to create.
                                        } else {
                                            gRecord.index = created.length;
                                            created.push(gRecord);
                                            thisDone();
                                        }                                       
                                    } else {
                                        console.log(err);
                                        thisDone();
                                    }    
                                });   
                                
                            }, function(err){
                                if (progress) {
                                    WS.checkSubs(progress,function(numOfSubs){
                                        if (numOfSubs > 0) {
                                            // Reset prog bar to 0
                                            WS.triggerEvent(progress,{value:0});
                                        }
                                    });
                                }

                                // Run the callback - passing back our records we have available for create or update.
                                cb(created,updated);       
                            });
                        }
                    });
                }
            });    
        }  
    },
	
	/**
     * @name        service.Database.importTable
     * @method
     * @description Import chosen records from table difference.
	 * @param {String} tableName  Name of table to import to. E.g "xfunc".
     * @param {Object[]} toCreate  Record objects which we may want to create - typically returned from differenceTable.
	 * @param {Object[]} toUpdate  Record objects which we may want to update - typically returned from differenceTable.
	 * @param {(Number[]|Number)} selectedCreate  Record index(s) which we want to create - typically retrieved from grid multiselect.
	 * @param {(Number[]|Number)} selectedUpdate  Record index(s) which we want to update - typically retrieved from grid multiselect.
	 * @param {Function} cb Callback.
     */	 
    importTable: function(tableName, toCreate, toUpdate, selectedCreate, selectedUpdate, cb){
        var table = sails.models[tableName] || undefined;
        var primaryKey = "";
        var criteria = {};
        var success = false;

        // As long as we have been given a valid table name and it has attributes, continue.
        if (table && table.attributes) {
            // Loop the attributes of the table. When we find primaryKey then stop looping.
             for (var attr in table.attributes) {
                if (table.attributes[attr].primaryKey === true) {
                    primaryKey = attr;
                    break;
                }    
            }

            // We use an async parallel here so we can go about creating and updating in parallel. 
            async.parallel([
                function (paracb) {
                    // As long as we have been passed some records to create, contine.
                    if (selectedCreate !== undefined && selectedCreate !== "") { 
                        // The way we create the records will depend on if we have more than one.
                        if (Array.isArray(selectedCreate)) {
                            // If we have more than one, then we start the creates with an async each. 
                            async.each(selectedCreate, function(recordIndex, callback) {
                                delete toCreate[recordIndex].index;
                                // We use the index from the selected records to find the record details in our array of records available to create.
                                table.create(toCreate[recordIndex]).exec(function(err,created){
                                    // When each create comes back saying its done, we do the callback to the async each.
                                    if (err) {
                                        callback(err);
                                    } else {
                                        callback();
                                    }                                                        
                                })     
                            // This function runs when all async each callbacks have been called.
                            }, function(err){
                                // Run the callback for the async parallel.
                                paracb();       
                            });
                        } else {
                            // If we have just a single record to create then we do the create and make a callback to the async parallel when done.
                            delete toCreate[selectedCreate].index;
                            
                            table.create(toCreate[selectedCreate]).exec(function(err,created){
                                paracb();                        
                            })    
                        }
                    } else {
                        // If we dont have any records to create at all, just call back to the async parallel straight away.
                        paracb();
                    } 
                },
                function (paracb) {
                    // As long as we have been passed some records to update, contine.
                    if (selectedUpdate !== undefined && selectedUpdate !== "") {
                        // The way we update the records will depend on if we have more than one. 
                        if (Array.isArray(selectedUpdate)) {
                            // If we have more than one, then we start the updates with an async each. 
                            async.each(selectedUpdate, function(recordIndex, callback) {
                                delete toUpdate[recordIndex].index;

                                // We use the index from the selected records to find the record 
                                // details in our array of records available to update. From these details, build the attribute
                                // which is the primary key into criteria.
                                if (primaryKey) {
                                    criteria.where = {};
                                    criteria.where[primaryKey] = toUpdate[recordIndex][primaryKey];

                                    table.update(criteria,toUpdate[recordIndex]).exec(function(err,updated){
                                        // When each update comes back saying its done, we do the callback to the async each.
                                        if (err) {
                                            callback(err);
                                        } else {
                                            callback();
                                        }
                                                                                                
                                    })   
                                } else {
                                    // If we dont have a primary key attribute then call straight back to the async each.
                                    // This means that we are unable to update this record because we dont have anything reliable to locate the table record with.
                                    callback();
                                }

                            // This function runs when all async each callbacks have been called.
                            }, function(err){
                                if (!err) {
                                    success = true;
                                }
                                
                                // Run the callback for the async parallel.
                                paracb();       
                            });
                        } else {    
                            // If we have just a single record to update then we do the update and make a callback to the async parallel when done.
                            delete toUpdate[selectedUpdate].index;    

                            // We use the index from the selected record to find the record 
                            // details in our array of records available to update. From these details, build the attribute
                            // which is the primary key into criteria.
                            if (primaryKey) {
                                criteria.where = {};
                                criteria.where[primaryKey] = toUpdate[selectedUpdate][primaryKey];
                                
                                table.update(criteria,toUpdate[selectedUpdate]).exec(function(err,updated){
                                    if (!err) {
                                        success = true;
                                    }
                                    
                                    paracb();                          
                                })   
                            } else {
                                // If we dont have a primary key attribute then call straight back to the async parallel.
                                // This means that we are unable to update this record because we dont have anything reliable to locate the table record with.
                                paracb();
                            }               
                        }
                    } else {
                        // If we dont have any records to update at all, just call back to the async parallel straight away.
                        paracb();
                    }
                }],
                
                // When the two functions are done above, we are all done.
                function alldone() {
                    success = true;
                    cb(success);   
                }
            );
        }
    }
};

/**
 * @callback differenceCallback
 * @param {Object[]} created Records to be created.
 * @param {Object[]} updated Records to be updated.
 */
 
 /**
 * @callback exportedCallback
 * @param {String} fileName Name of file which has been exported. With ".json".
 */