/***** BEGIN LICENCE BLOCK ***************************/                  
/* The initial developer of the code is Kevin Turner   */ 
/* kpturner.co.uk     */ 
/*                                                   */
/* Portions created by Kevin Turner Systems Ltd" are   */
/* Copyright (c) 2017 K P Turner Ltd.    */
/* All Rights Reserved.                              */
/***** END LICENCE BLOCK *****************************/   

/**    
 *  @Class          service.Email
 *  @Description    Chromis Email Services                    
 *  @Author         Kevin Turner                                            
 *  @Date           Jan 2016                                                         
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
   * @name          service.Email.send
   * @method
   * @description   Send email
   * @param {String}    template    Email template path
   * @param {Object}    data        Data to merge into email template
   * @param {Object}    options     Map of options {@link https://github.com/nodemailer/nodemailer/blob/v1.3.4/README.md#e-mail-message-fields}
   * @param {Function}  cb          Callback   
   */
  send: function(template,data,opts,cb) {
     
     // Check to see if we a reusing DKIM.  If not, we can just use sails-hook-email 
     // functionality unaugmented 
     
     // Use my localised email hook while waiting for a fix to sails-hook-email
     var hook="chremail";
     //var hook="email"; 
     var transporter=sails.hooks[hook].transporter(); 
     if (sails.config.chromis.DKIM && !transporter._dkim) {
        var nodemailer = require('nodemailer');
        var nodemailerDKIM = require('nodemailer-dkim');
        var fs = require('fs');
        
        // Verify keys before attempting to use them.
        // This checks that the configuration is correct and the private key matches the public key listed in DNS        
        var dkimOpts={
            domainName: sails.config.chromis.DKIM.domainName,
            keySelector: sails.config.chromis.DKIM.keySelector,
            privateKey: fs.readFileSync(sails.config.chromis.DKIM.privateKey)
        }
        nodemailerDKIM.verifyKeys(dkimOpts, function(err, success){
                if(err){
                        sails.log.debug('Verification failed');
                        sails.log.debug(err);
                }else if(success){
                        // create reusable transporter object using SMTP transport
                        sails.log.verbose('DKIM verification successful');
                        transporter._dkim=true; // Stops us initialising it again
                        // Tell it to stream correctly with the DKIM header(s)
                        transporter.use('stream', nodemailerDKIM.signer(dkimOpts));                         
                }
                // Send the email
                sails.hooks[hook].send(template,data,opts,cb);     	
        }); 
     } 
     else {
        // Send the email
        sails.hooks[hook].send(template,data,opts,cb);     	        
     }
     	
     
  },

   
};