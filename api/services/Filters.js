/***** BEGIN LICENCE BLOCK ***************************/
/* The initial developer of the code is Kevin Turner   */
/* kpturner.co.uk     */
/*                                                   */
/* Portions created by Kevin Turner Systems Ltd" are   */
/* Copyright (c) 2017 K P Turner Ltd.    */
/* All Rights Reserved.                              */
/***** END LICENCE BLOCK *****************************/

/**     
 *   @Class         service.Filters 
 *   @Description   Chromis Filter Translations                  
 *   @Author        Dan Williams                                            
 *   @Date          Apr 2016                                                         
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

module.exports = {
	/**
	 * @name        service.Filters.convertToCriteria
	 * @method
	 * @description Finds the field object which contains it's data type. E.g in "xurole", there is no type attr for "xuruser" - this will find it's type which is String.
	 * @param {Object[]} filters  Filters object returned from the model.
	 * @param {String} tableName  The name of the table these filters are being applied to.
	 * @param {Boolean} strict  If true, string type fields must be exact match rather than "like".
	 * @return {Object} Criteria object ready for waterline find.
	 */
    convertToCriteria: function (filters, tableName, strict) {
        function convertToCriterion(filter, field, findCriteria, strict) {
            var dateFrom;
            var dateTo;
            var valueToAssign;
            var strictCheck = (strict !== undefined && strict);

            // Dependant on the fields datatype, translate the string value into search criteria.
            switch (field.type) {
                case "string":
                    if (field.enum && field.enum.indexOf(filter.fromValue) >= 0) {
                        valueToAssign = filter.fromValue;
                    } else {
                        if (strictCheck) {
                            valueToAssign = filter.fromValue;
                        } else {
                            valueToAssign = { "like": "%" + filter.fromValue + "%" };
                        }
                    }
                    break;

                case "number":
                    if (isFinite(filter.fromValue) && isFinite(filter.toValue)) {
                        valueToAssign = { ">=": parseFloat(filter.fromValue), "<=": parseFloat(filter.toValue) };
                    }
                    break;

                case "date":
                    dateFrom = new Date(filter.fromValue);
                    valueToAssign = dateFrom;
                    break;

                case "datetime":
                    dateFrom = new Date(filter.fromValue);
                    dateTo = new Date(dateFrom.getTime());
                    dateTo.setDate(dateTo.getDate() + 1);

                    // Do not filter by the time part here because we recieve only a date from the datepicker.
                    // For datetime we have to do a from and to date so that it allows any time for that date.
                    valueToAssign = { ">=": dateFrom, "<": dateTo };
                    break;
                    
                case "boolean":
                    valueToAssign = filter.fromValue;
                    break;
            }

            findCriteria[filter.field] = valueToAssign;

            return;
        }

        var findCriteria = {};

        // Build each filter object into waterline query language.
        _.forEach(filters, function (filter, i) {
            var actualField = findActualField(filter, tableName);

            if (actualField != undefined) {
                convertToCriterion(filter, actualField, findCriteria, strict);
            }
        });
        
        return findCriteria;
    }
};

function findActualField(filter, tableName) {
    var tryField = this[tableName].attributes[filter.field];
    var returnField = {};

    if (tryField == undefined) {
       
        returnField = undefined;

    } else {
        if (tryField.type == undefined) {
            
            if (tryField.model != undefined) {
                var fields = this[tryField.model].attributes;

                for (var field in fields) {
                    if (fields[field].primaryKey) {
                        returnField = fields[field];

                        break;
                    }
                }
                
            } else {
                // Unknown field.
                returnField = undefined;
            }
            
        } else {
            returnField = tryField;
        }
    }

    return returnField;
};