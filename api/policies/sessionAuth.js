/** 
 * @class           policy.sessionAuth
 * @description     Simple policy to allow any authenticated user
 *                  Assumes that your login action in one of your controllers sets `req.session.authenticated = true;`
 * @docs            http://sailsjs.org/#!/documentation/concepts/Policies
 *
 */


module.exports = function(req, res, next) {
    
    var SES=new sails.hooks.ses.SES();      
    var action=req.param("action"); 
    
    var payload=Utility.getStuffFromReq(req);
    var rmr=payload.rmr;
    // If we have a base_token then we have arrived here via a bearer request.  These are requests that carry an access_token from 
    // an authenticated user, and the base_token gives us access to the session that fired off the request.  One example of this
    // would be where the user has clicked the "Add Session" button at the top of the screen.
    if (!action && (payload.base_token || req.query.base_token)) {
        var jwt=(payload.base_token || req.query.base_token)
        JWT.verify(jwt,function(err,token){
            if (err) {
                // Base token no good
                return res.login(-900);
            }
            // Create a new session
            SES.createSession(req,true,function(){
                SES.duplicate(token.sessionToken,function(err,resp){
                    SES.set({
                        jwt:            req.options.token,
                        expired:        false,
                        lastRequest:    new Date().getTime(),
                        
                    },function(){
                      return next();       
                    })                       
                })                
            });            
        })    
    }
    else {
        // For authenticated sessions, check for expiry.   This obviously should not apply to initialisation requests
        if (sails.config.chromis.sessionBypass.indexOf(payload.func)>=0) {
            // These requests are allowed on to the next policy
            // However, they still may require a temporary session to house
            // information that can be shared between the main server and
            // the back-end servers.  There may or may not be a token
            // in the request. If there is not then create it (and the temp session)
            if (!payload.token) {
                // Not a biggie, unless we are trying to log in - in that case we need the session
                if (payload.func=="xm0000") {
                    return SES.createSession(req,true,next);
                }
                else {
                    return next();
                }
            }
            else {
                // Verify the token
                //sails.log.debug("Request token "+payload.token)            
                JWT.verify(payload.token,function(err,token){
                    // If we have an error, then the token has expired.  Since we are
                    // dealing with a request that does not need authentication, this is
                    // is not a big deal. We can issue a new one.
                    // NB:  Currently JWT do not expire! Only sessions expire.
                    if (err) {
                        // Usually means it is expired
                        sails.log.verbose("JWT error: "+err); // Entirely expected on the login screen for lazyloads etc
                        return SES.createSession(req,true,next);
                    }
                    // See if the actual session has expired.
                    // We can do this simply by trying to retrieve the JWT from the session. No data - no session!
                    //sails.log.debug("Request session token "+token.sessionToken);
                    SES.initialise(true,function(){
                        SES.setToken(token.sessionToken);
                        SES.getAll(function(err,s){
                            //sails.log.debug(err)
                            var jwt, expired;
                            if (s) {
                                jwt     = s.jwt;
                                expired = s.expired;
                                if (!expired && s.lastRequest) {
                                    if ((new Date().getTime()-s.lastRequest)/1000>sails.config.session.sessionExpiry) {
                                        expired=true;                           
                                    }
                                } 
                            }
                            else {
                                expired=true;
                            } 
                            /////expired=true; // TESTING
                            if (!jwt) {
                                //sails.log.debug("No JWT found in session")
                                // Expired or logged off. Create a new one if we are hitting the login server
                                if (payload.func=="xm0000") {
                                    return SES.createSession(req,true,next);    
                                }
                                else {
                                    return next();
                                }                                                    
                            }
                            else {
                                //sails.log.debug("JWT found in session")
                                // Make sure the session has not expired                             
                                if (expired && payload.func=="xm0000") {
                                    //SES.set({
                                    //    authenticated:  false,
                                    //    expired:        false,
                                    //    lastRequest:    0,
                                    //})
                                    SES.kill(function(){
                                         return res.login(-900);      
                                    });                                                               
                                }
                                else {
                                    req.options.token=payload.token;
                                    return next();      
                                }                                                       
                            }
                        });                    
                    });                
                })
                
            }        
        }
        else {
            // Verify the token - compulsory at this point
            JWT.verify(payload.token,function(err,token){
                if (err) {
                    // Usually means it is expired
                    // NB:  Currently JWTs do not expire! Only sessions expire.
                    return res.login(-900);
                } 
                // If payload has a session id, does it match the JWT?
                if (rmr && rmr.sessionid && rmr.sessionid!="NOSESSION") {
                    if (rmr.sessionid!=token.sessionToken) {
                        // Err - no!
                        sails.log.error("Session id: "+rmr.sessionid+" mismatch with web token");
                        return res.badRequest();    
                    }
                } 
                // See if the actual session has expired.
                // We can do this simply by trying to retrieve the JWT from the session. No data - no session!
                SES.initialise(true,function(){
                    SES.setToken(token.sessionToken);
                    SES.getAll(function(err,s){
                        var authenticated, expired;
                        if (s) {
                            authenticated   = s.authenticated;
                            expired         = s.expired;
                        }
                        else {
                            expired=true;
                        }
                        //sails.log.debug(err)
                        //sails.log.debug(authenticated)
                        if (!authenticated) {
                            // Expired, force the user to log in again
                            SES.kill(function(){
                                return res.login(-900);
                            })        
                        }
                        else {
                            if (expired) {
                                // Expired, force the user to log in again
                                SES.kill(function(){
                                    return res.login(-900);
                                })                                
                            }
                            else {
                                req.options.token=payload.token;
                                // Update the last used timestamp if the request
                                // is not silent                                
                                var silent=false;
                                if (rmr) {
                                    silent=rmr.silent
                                }
                                // Check time since last request
                                var thisRequest=new Date().getTime();
                                if (s.lastRequest) {
                                    if ((thisRequest-s.lastRequest)/1000>sails.config.session.sessionExpiry) {
                                        // Expired!
                                        //SES.set({
                                        //    authenticated:  false,
                                        //    expired:        true,
                                        //    lastRequest:    0,
                                        //}) 
                                        SES.kill(function(){
                                            return res.login(-900);   
                                        });                                  
                                    }
                                }
                                if (!silent) {
                                    SES.set("lastRequest",thisRequest,function(){
                                        return next();   
                                    })
                                }
                                else {
                                    return next();        
                                }                             
                            }                        
                        }
                    });
                }); 
            })
            
        }    
    }
};
