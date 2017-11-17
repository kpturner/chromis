/***** BEGIN LICENCE BLOCK ***************************/                  
/* The initial developer of the code is Kevin Turner   */ 
/* kpturner.co.uk     */ 
/*                                                   */
/* Portions created by Kevin Turner Systems Ltd" are   */
/* Copyright (c) 2017 K P Turner Ltd.    */
/* All Rights Reserved.                              */
/***** END LICENCE BLOCK *****************************/   

/**
 *   @Class         service.SQL          
 *   @Description   Chromis SQL Services                    
 *   @Author        Kevin Turner                                            
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
 
 


module.exports = { 
    
    
    /**
     * @name         service.SQL.createIndex
     * @method
     * @description  Create an index
     * @param {String}  index   Name of the index to created
     * @param {String}  table   Table on which the index is based
     * @param {Array}   columns Array of column names (keys) for the index
     * @param {Boolean} drop    Drop the index before creation
     * @param  {Function} callback
     */
    createIndex: function(index, table, columns, cb){
        var self=this;
        var cmd;
        async.series([
            function(next){
                // Drop index
                cmd="DROP INDEX IF EXISTS "+index+";";
                sails.log.debug("Running "+cmd);
                sails.models[table].query(cmd,function(err,res){
                    if (err) {
                        next(err)
                    }
                    else {
                        next(null)
                    }
                });    
            },
            function(next){
                // Create index
                cmd="CREATE INDEX "+index+" ON "+table+" (";
                columns.forEach(function(col,c){
                    if (c>0)
                        cmd+=","
                    cmd+='"'+col+'"';
                })
                cmd+=");";
                sails.log.debug("Running "+cmd); 
                sails.models[table].query(cmd,function(err,res){
                    if (err) {                        
                        next(err)
                    }
                    else {
                        next(null);
                    }     
                });   
            }
        ],
        function(err,results){
            // All done
            if (err) {
                 sails.log.error(err);   
            }
            cb(err)
        })
        
    }, 

    
   
   
};