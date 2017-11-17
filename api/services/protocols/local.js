 
 

/**
 * @class           service.protocol.local
 * @description     Local Authentication Protocol
 *
 * The most widely used way for websites to authenticate users is via a username
 * and/or email as well as a password. This module provides functions both for
 * registering entirely new users, assigning passwords to already registered
 * users and validating login requesting.
 *
 * For more information on local authentication in Passport.js, check out:
 * {@link http://passportjs.org/guide/username-password/}
 */

/**
 * @name    service.protocol.local.register
 * @method
 * @description   
 * Register a new profile
 *
 * This method creates a new user from a username and password
 * and assign the newly created user a local Passport.
 *
 * @param {Object}   req
 * @param {Object}   res
 * @param {Function} next
 */
exports.register = function (req, res, next) {
  
  this.registerProfile(req.param("profile"),function(err,newProfile){
    if (err) {
        return res.serverError(err);        
    }
    else {
        // Success
        // Mark the session as authenticated to work with default Sails sessionAuth.js policy
        req.login(newProfile, function (err) {
            if (err) {
                return res.serverError(err);
            }
            // Mark the session as authenticated to work with default Sails sessionAuth.js policy
            //req.session.authenticated = true;   
            //req.session.lastRequest=null;                     
            return res.json({
                id:	newProfile.id
            })
        });
      }
  })
  
  

};

/**
 * @name    service.protocol.local.registerProfile
 * @method
 * @description 
 * Register a new profile
 *
 * This method creates a new user from a username and password
 * and assign the newly created user a local Passport.
 *
 * @param {Object}   profile
 * @param {Object}   callback 
 */
exports.registerProfile = function (profile,cb) {
  var err;
  xprofile.findOne({username:profile.username})
    .then(function(existing){
        // We shouldn't have a result
        if (existing) {
            //TODO Handle error where use exists already            
            return null;
        }
        else {
            // Create profile
            var xp={};
            xp.username=profile.username;
            xp.desc=profile.desc;
            xp.lastLoggedIn=new Date().toISOString().slice(0, 19).replace('T', ' ');
            return xprofile.create(xp)
                .then(function(newProfile){
                    return newProfile
                })
                .catch(function(err){ 
                    throw(err)
                })            
        }
    })
    .then(function(newProfile){
        if (newProfile) {  
            // Generate passport            
            return xpassport.create({
                protocol    : 'local'
                , password    : profile.password
                , profile     : newProfile.id 
            })
            .then(function(newPassport){
                return newProfile
            })
            .catch(function(err){
                 newprofile.destroy().exec(function(){
                     throw err
                 });
            })    
        }
        else {
            return null;
        }
    })
    .then(function(newProfile){
        if (newProfile) {
            cb(null,newProfile)
        }
        else {
            var err=new Error("Profile already exists for "+profile.username);
            throw err;
        }
    })
    .catch(function(e){
        cb(e,null)
    })

};

/**
 * @name    service.protocol.local.connect
 * @method
 * @description 
 * Assign local Passport to user
 *
 * This function can be used to assign a local Passport to a user who doesn't
 * have one already. This would be the case if the user registered using a
 * third-party service and therefore never set a password.
 *
 * @param {Object}   req
 * @param {Object}   res
 * @param {Function} next
 */
exports.connect = function (req, res, next) {
  var profile   = req.profile
    , password  = req.param('password');

  xpassport.findOne({
    protocol : 'local'
  , profile  : profile.id
  }, function (err, passport) {
    if (err) {
      return next(err);
    }

    if (!passport) {
      xpassport.create({
        protocol : 'local'
      , password : password
      , profile  : profile.id
      }, function (err, passport) {
        next(err, profile);
      });
    }
    else {
      next(null, profile);
    }
  });
};

/**
 * @name    service.protocol.local.login
 * @method
 * @description 
 * Validate a login request
 *
 * Looks up a user using the supplied identifier (email or username) and then
 * attempts to find a local Passport associated with the user. If a Passport is
 * found, its password is checked against the password supplied in the form.
 *
 * @param {Object}   req
 * @param {string}   identifier
 * @param {string}   password
 * @param {Function} next
 */
exports.login = function (req, identifier, password, next) {
     
  xprofile.findOne({username:identifier}, function (err, profile) {
    if (err) {
      return next(err);
    }

    if (!profile) { 
        var err=new Error("error0015")
        return next(err, false);
    }

    xpassport.findOne({
      protocol : 'local'
    , profile  : profile.id
    }, function (err, passport) {
      if (passport) {
        passport.validatePassword(password, function (err, res) {
          if (err) {           
            return next(err);
          }

          if (!res) {
            var err=new Error("error0015")  
            return next(err, false);
          } else {
            
            var delta={};
            delta.lastLoggedIn=new Date().toISOString().slice(0, 19).replace('T', ' ');
  
           
            xprofile.update(profile.id,delta).exec(
              function(){
                return next(null, profile);                                      
              }
            )      
            
          }
        });
      }
      else {
        var err=new Error("error0015")
        return next(null, false);
      }
    });
  });
};
