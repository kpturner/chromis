/**
 * Return the user to the login page
 *
 * Usage:
 * return res.login(resultCode);
 *   case -900:  // Expired session
 *   case -910:	 // Timeout
 *   case -920:  // General crash
 *   case -930:	 // Logging out
 *   case -940:	 // Maximum sessions exceeded
 * 
 */

var fs = require("fs");
var path = require("path");

module.exports = function login (resultCode) {

  // Get access to `req`, `res`, & `sails`
  var req = this.req;
  var res = this.res;
  var sails = req._sails;

  var response={};
  response.dataout={};
  //response.dataout.resultcode=resultCode;
  response.resultcode=resultCode;
  
  // Trigger event if session expired
  if (resultCode==-900) {
    // Get number of users online and
    // trigger the usersonline event for websockets
     var SES=new sails.hooks.ses.SES()
     SES.initialise(false,function(){
          // Assumes session has actually been killed
          SES.activeUsers(function(err,users){
            //sails.log.debug("setting useronline to "+((users)?users.length:0).toString())
            var usersonline={usersonline:(users)?users.length:0};
            WS.triggerEvent("usersonline",usersonline);   
          })       
        
     })
       
  }
  
  
  if (req.wantsJSON) {
       return res.jsonx(response);
  }
  else {
      // Return HTML
      var xpath=path.join(sails.config.appPath,"assets","index.html");
      fs.readFile(xpath,function(err,html){
        res.set('Content-Type', 'text/html');
        res.send(new Buffer(html));    
      })
      
  }
 
};

