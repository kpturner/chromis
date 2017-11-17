/**
 *   @class         controller.BearerController          
 *   @Description   Chromis Bearer Controller. Access using an token.             
 *   @Author        Kevin Turner                                            
 *   @Date          Jan 2016                                                         
 *   @help          See http://sailsjs.org/#!/documentation/concepts/Controllers                                                                                 
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

var fs = require("fs");
var path = require("path");

module.exports = {     
	
    /**
     * @name             controller.BearerController.handleRequest
     * @method
     * @description      Handle inbound request 
     * @param {Object}   req    Request object   
     * @param {Object}   res    Response object 
     */
    handleRequest: function(req, res) {
        var self=this;           
        var SES=new sails.hooks.ses.SES();
        var action=req.param("action");
        //sails.log.debug(req.options.token)
        JWT.verify(req.options.token,function(err,token){
            SES.initialise(true,function(){
                //sails.log.debug(token)
                SES.setToken(token.sessionToken);
                SES.getAll(function(err,s){
                    switch (action) {
                        case "displaysession":
                            return res.json(s);
                        default:
                            // Return HTML
                            var xpath=path.join(sails.config.appPath,"assets","index.html");
                            fs.readFile(xpath,'utf8',function(err,html){
                                var preloaded={};
                                preloaded.resultcode=0;
                                preloaded.sessionid=token.sessionToken;
                                preloaded.model=s.xm0000_model;
                                preloaded.model.sessionid=token.sessionToken;
                                // Wipe out the session data and let it get recreated
                                _.forEach(s,function(value,key){
                                    if (key.indexOf("_model")>0) {
                                        s[key]=null;
                                    }
                                })
                                SES.setAll(s,function(err,resp){
                                     // Send the response
                                    html=html.replace("var preloadedResponse=null;","var preloadedResponse="+JSON.stringify(preloaded)+";sessionStorage.setItem('RNS.token','"+req.options.token+"');");
                                    res.set('Content-Type', 'text/html');
                                    res.send(new Buffer(html));        
                                })                               
                            })
                            break;            
                    }                    
                });
            })
        }) 
        
    },

};

