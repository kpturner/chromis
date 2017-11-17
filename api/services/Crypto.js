/***** BEGIN LICENCE BLOCK ***************************/                  
/* The initial developer of the code is Kevin Turner   */ 
/* kpturner.co.uk     */ 
/*                                                   */
/* Portions created by Kevin Turner Systems Ltd" are   */
/* Copyright (c) 2017 K P Turner Ltd.    */
/* All Rights Reserved.                              */
/***** END LICENCE BLOCK *****************************/   

/**      
 *   @Class         service.Crypto
 *   @Description   Chromis Cryptographic Services  
 *                  See {@link https://www.npmjs.com/package/node-cryptojs-aes}                
 *   @Author        Kevin Turner                                            
 *   @Date          Jan 2016                                                         
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

var node_cryptojs = require('node-cryptojs-aes');
var crypto = require('crypto');
var CryptoJS = node_cryptojs.CryptoJS;
var randomstring=require('randomstring');
var trim=require('trim');

module.exports = { 


    JsonFormatter: {
        stringify: function (cipherParams) {
            // create json object with ciphertext
            var jsonObj = {
                ct: cipherParams.ciphertext.toString(CryptoJS.enc.Base64)
            };

            // optionally add iv and salt
            if (cipherParams.iv) {
                jsonObj.iv = cipherParams.iv.toString();
            }
            if (cipherParams.salt) {
                jsonObj.s = cipherParams.salt.toString();
            }

            // stringify json object
            return JSON.stringify(jsonObj);
        },

        parse: function (jsonStr) {
            // parse json string
            var jsonObj = JSON.parse(jsonStr);

            // extract ciphertext from json object, and create cipher params object
            var cipherParams = CryptoJS.lib.CipherParams.create({
                ciphertext: CryptoJS.enc.Base64.parse(jsonObj.ct)
            });

            // optionally extract iv and salt
            if (jsonObj.iv) {
                cipherParams.iv = CryptoJS.enc.Hex.parse(jsonObj.iv)
            }
            if (jsonObj.s) {
                cipherParams.salt = CryptoJS.enc.Hex.parse(jsonObj.s)
            }

            return cipherParams;
        }
    },

    /**
     * @name         service.Crypto.encrypt
     * @method
     * @description  Encrypt a string
     * The return value is a JSON in the following format: {"ct":"drOTefTK8JhPT7794aog6A==","iv":"101112131415161718191a1b1c1d1e1f"} 
	 * where "ct" is the cypher text (the encrypted string) and "iv" is the initialisation vector used. This can be passed to the decrypting system. 
	 * PLEASE NOTE that the encrypted data is not safe from decryption. It simply makes the field difficult to read without a great deal of fiddling about. 
	 * For example, encrypted fields like passwords are not human readable when viewed by a packet sniffer, but anyone could decrypt the value if they
	 * so wish simply because the private key is obtainable to those with the wherewithal to know where to look for it. Use of SSL in addition to field
	 * level encryption is recommended.  
     * @param {String} ct Cyphertext (the thing to be decrypted
     * @param {String} iv Initialisation Vector (the iv used to encypt)
     * @param {String} [key] AES key used - optional (will default to the session token)
     * @return {Object}
     */
    encrypt: function(data, iv, key) {
        var lKey = (key)?key:sails.config.chromis.aeskey;
        lKey = CryptoJS.enc.Hex.parse(lKey); 	// Hexify the key
        var lIv	 = (iv)?iv:this.generateIV();		// Derive an Initialisation Vector
        lIv  = CryptoJS.enc.Hex.parse(lIv);		// Hexify IV
        // Encrypt
        var encrypted = CryptoJS.AES.encrypt(data, lKey, {format: this.JsonFormatter, iv: lIv});
        return JSON.parse(encrypted.toString());
    },
    
    /**
     * @name         service.Crypto.decrypt
     * @method
     * @description  Decrypt an encrypted string
     * @param {String} ct Cyphertext (the thing to be decrypted
     * @param {String} iv Initialisation Vector (the iv used to encypt)
     * @param {String} [key] AES key used - optional (will default to the session token)
     * @return {String}
     */
    decrypt: function(ct, iv, key) {
        var lKey=(key)?key:sails.config.chromis.aeskey;
        // Hexify the initialisation vector and key
        lKey = CryptoJS.enc.Hex.parse(lKey);  // Hexify the key
		lIv  = CryptoJS.enc.Hex.parse(iv);    // Hexify IV 
        // Base64 decode the cypher text
        var hex = CryptoJS.enc.Base64.parse(ct).toString();
        // Convert to WordArray
        var data = CryptoJS.enc.Hex.parse(hex);      
        // Build the JSON formatted encryption object
        var e = {};
        e.key=lKey;
        e.iv=iv;
        e.ciphertext = data;
        // decrypt
        return CryptoJS.AES.decrypt(e, lKey, { iv: lIv }).toString(CryptoJS.enc.Utf8);
    },
    
    /**
     * @name         service.Crypto.generateKey
     * @method
     * @description  Generate an AES key
     * @return {String}    
     */
    generateKey: function(){
        //var r_pass_base64 = r_pass.toString("base64"); 
        // Make it always the same for the time being until we have sorted sessions by tab out
        //////////////r_pass = "ReNais5anceAe5Ky";
        r_pass = randomstring.generate(16);
        r_pass = Utility.toHex(r_pass);
        
        return r_pass;
    },
    
    /**
     * @name         service.Crypto.generateIV
     * @method
     * @description  Generate an initialisation vector
     * @return {String}    
     */
    generateIV: function(){
        for(var c = ''; c.length < 32;) c += Math.random().toString(36).substr(2, 1);
        return c;
    },
    
    /** 
     * @name        service.Crypto.isEncryptionJson    
     * @method
     * @description Returns true if the string passed in actually represents an encrypted json in the form 
     * {"ct":<encryptedtext>,"iv":<initialisation vector>}
     * @param {String} value The string value to check    
     * @return {Boolean}
     */
    isEncryptionJson: function(value) {
        var res=false;
        // Find the first non-blank character
        if (value && value.length>0 && typeof value=="string") {
            for (var a=0;a<value.length;a++) {
                var ch=value.substr(a,1);
                if (trim(ch).length==1) {
                    // Is it a "{" ?
                    if (ch=="{") {
                        try{
                            var json=JSON.parse(value);
                            if (json.ct && json.iv) 
                                res=true;
                        }
                        catch(e){}
                    }
                    // Break the loop
                    a=value.length;
                }
            }
        }
        return res;
    }
     
};