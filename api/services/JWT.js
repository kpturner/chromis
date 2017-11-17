/***** BEGIN LICENCE BLOCK ***************************/                  
/* The initial developer of the code is Kevin Turner   */ 
/* kpturner.co.uk     */ 
/*                                                   */
/* Portions created by Kevin Turner Systems Ltd" are   */
/* Copyright (c) 2017 K P Turner Ltd.    */
/* All Rights Reserved.                              */
/***** END LICENCE BLOCK *****************************/   

/**     
 *   @Class         service.JWT
 *   @Description   Chromis JSON Web Token Services   
 *                  See {@link https://github.com/auth0/node-jsonwebtoken}
 *   @Author        Kevin Turner                                            
 *   @Date          Mar 2016                                                  
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

var jwt = require("jsonwebtoken");


module.exports = { 

    /**
     * Globals
     */
   

    /**
     * @name         service.JWT.issue
     * @method
     * @description     Issue a token from supplied payload
     * @param   {Object} payload  Could be an object literal, buffer or string (to be encoded into the token)
     */
    issue: function(payload){
        return jwt.sign(
            payload,
            sails.config.session.secret           
        )
    }, 
   
    /**
     * @name         service.JWT.verify
     * @method
     * @description     Verify a token
     * @param   {String} token JSON web token string 
     * @param   {Function} callback
     */
    verify: function(token,cb){
        return jwt.verify(
            token,
            sails.config.session.secret, 
            {},
            cb
        )
    }, 
   
    /**
     * @name         service.JWT.decode
     * @method
     * @description     Decode a token
     * @param   {String} token JSON web token string 
     * @returns {Object}
     */
    decode: function(token){
        return jwt.decode(
            token, 
            {} 
        )
    },  
   
     
   
};