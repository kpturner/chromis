/**
 * @class service.protocol.bearer 
 * @description  
 * Bearer Authentication Protocol
 *
 * Bearer Authentication is for authorizing API requests. Once
 * a user is created, a token is also generated for that user
 * in its passport. This token can be used to authenticate
 * API requests.
 *
 */

/**
 * @name    service.protocol.bearer.authorize
 * @method
 * @description   
 * Authorize a request that bears a authentication token
 *
 * @param {String}   token  Encrypted token
 * @param {Function} done   Function to call after protocol completes
 */
exports.authorize = function(token, done) {
    
    // Examine the token. If it is an encryption string then decrypt it
    if (typeof token=="string") {
        if (token.substr(0,6)=='{"ct":') {
            var enc=JSON.parse(token.replace(RegExp("\\^","g"),"\+"));
            token=Crypto.decrypt(enc.ct,enc.iv)
        }
    }
  
    xpassport.findOne({ accessToken: token }, function(err, passport) {
        if (err) { return done(err); }
        if (!passport) { return done(null, false); }
        xprofile.findOneById(passport.profile, function(err, profile) {
            if (err) { return done(err); }
            if (!profile) { return done(null, false); }
            return done(null, profile, { scope: 'all' });
        });
    });
  
};
