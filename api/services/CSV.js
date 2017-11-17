/***** BEGIN LICENCE BLOCK ***************************/                  
/* The initial developer of the code is Kevin Turner   */ 
/* kpturner.co.uk     */ 
/*                                                   */
/* Portions created by Kevin Turner Systems Ltd" are   */
/* Copyright (c) 2017 K P Turner Ltd.    */
/* All Rights Reserved.                              */
/***** END LICENCE BLOCK *****************************/   

/**      
 *   @class         service.CSV
 *   @description   Chromis CSV Services          
 *   @author        Kevin Turner                                            
 *   @date          Apr 2016                                                         
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
 
var path    = require("path");
var fs      = require("fs");
var json2csv = require("json2csv")

module.exports = { 
    
    /**
     * @name         service.CSV.generateCSV
     * @method
     * @description  Generate CSV from array of JSON data {@link https://github.com/zemirco/json2csv}
     * @param  {String} targetDirectory The directory into which the file is going to be generated
     * @param  {String} targetFile      The name of the file containing the exported data
     * @param  {Object} data            The data to be exported
     * @param  {Object} options         See {@link https://github.com/zemirco/json2csv}
     * @param  {Function} [callback]
     */
      
	generateCSV: function(targetDirectory, targetFile, data, optionsIn, cb) {

	    var options = _.extend({},optionsIn);
	 
        if(!data){
            throw new Error('Data cannot be null');
        }
        
        if(!_.isArray(data)){
            throw new Error('Data must be of type array');
        }
        
        var columns = data.length ? _.keys(data[0]) : [];   
         
        
        options.data=data;
        options.fields=columns;
        
        json2csv(options, function(err, csv) {
        
            if (err) { throw err; }
        
            //Make the target directory (and any parents) 
            require("mkdirp").sync(targetDirectory);
        
            var fullpath=path.join(targetDirectory,targetFile);
        
            //create the csv file and upload it to our directory
            fs.writeFile(fullpath, csv, function(err) {
                if (!err) {
                    sails.log.silly('CSV file saved to ' + fullpath); 
                }
                if (cb) cb(err)   
            });
        
        });
        
	},
   
    
        
}; 