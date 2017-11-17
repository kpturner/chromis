/**
 *   @Class         controller.AuthController         
 *   @Description   Chromis Authentication Controller             
 *   @Author        Kevin Turner                                            
 *   @Date          Feb 2016                                                         
 *   @help          See {@link http://sailsjs.org/#!/documentation/concepts/Controllers}                                                                                 
 */

//********************************************************************/           
//*                                                                                    
//*  Modification log                                                                  
//*  ================                                                                  
//*                                                                                    
//*  Inits  Date    Modification                                                       
//*  =====  ====    ============                                                       
//*                               
//********************************************************************/
module.exports = {  
      
  /**
   * @name  controller.resetAuth
   * @method
   * @description
   * Reset authentication.  Basically removes any additional user information
   * that req.logout() does not cater for
   * @param {Object} req
   * @param {Object} res
   */
   resetAuth: function(req, res) {
      // Mark the user as logged out for auth purposes
      //req.session.authenticated = false;
      
      // Clear remember me cookie if we are going straight to the homepage, otherwise
      // the remember-me strategy will override any attempt to log back on with a 
      // passport instead of a local user.
      res.clearCookie('remember_me');
   },
 
 
  /**
   * @name controller.provider
   * @method
   * @description
   * Create a third-party authentication endpoint
   *
   * @param {Object} req
   * @param {Object} res
   */
  provider: function (req, res) {
    passport.endpoint(req, res);
  },

  /**
   * @name controller.callback
   * @method
   * @description
   * Create a authentication callback endpoint
   *
   * This endpoint handles everything related to creating and verifying Pass-
   * ports and users, both locally and from third-aprty providers.
   *
   * Passport exposes a login() function on req (also aliased as logIn()) that
   * can be used to establish a login session. When the login operation
   * completes, user will be assigned to req.user.
   *
   * For more information on logging in users in Passport.js, check out:
   * http://passportjs.org/guide/login/
   *
   * @param {Object} req
   * @param {Object} res
   */
  callback: function (req, res) {
    
    function tryAgain (err) {
      //TODO  Handle authentication failure
    }

    passport.callback(req, res, function (err, profile, challenges, statuses) {
      //console.log("I am in passport.callback")
      if (err || !profile) {
        return tryAgain(challenges);
      }

      req.login(profile, function (err) {
        if (err) {
          return tryAgain(err);
        }
        
        // Mark the session as authenticated to work with default Sails sessionAuth.js policy
        //req.session.authenticated = true;
        //req.session.lastRequest=null;
        
        if (profile.authProvider!="local") {
            var delta={};
            delta.lastLoggedIn=new Date().toISOString().slice(0, 19).replace('T', ' ');
            xprofile.update(profile.id,delta).exec(function(){});  
            // Direct the user to the default landing page after authentication
            res.landingPage();
        }           
        else {
            // Logging in locally (i.e. not using a passport)     
            // Was "Remember me" selected?
            if (req.param("rememberme")) {
                var crypto    = require('crypto');
                // Destroy existing tokens for user
                xtoken.destroy({profile:profile.id},function(){
                var token = crypto.randomBytes(64).toString('base64'); 
                    xtoken.create({token:token, profile: profile.id }, function(err) {
                        if (err) { return next(err); }
                        res.cookie('remember_me', token, { path: '/', httpOnly: true, maxAge: sails.config.passport.rememberme.maxAge }); // 7 days
                        // Upon successful login, return successful login response
                        res.loginSuccess();
                    });
                });            
            }
            else {// Upon successful login, return successful login response
                res.loginSuccess();
            }
        }   
                
        
      });
    });
  },

  /**
   * @name controller.disconnect
   * @method
   * @description
   * Disconnect a passport from a user
   *
   * @param {Object} req
   * @param {Object} res
   */
  disconnect: function (req, res) {
    passport.disconnect(req, res);
  },
  
   
   
  
  /**
   * @name controller.updateProfile
   * @method
   * @description
	 * Update profile
   *
   * @param {Object} req
   * @param {Object} res
	*/
	updateProfile: function (req, res) {
	 	
	   
	},
  
  
 
    
};
 
