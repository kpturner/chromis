 /**           
  *   @class        controller.RouteController
  *   @Description  Chromis Route Controller. Basically handles the request routing for 
  *                 all client requests              
  *   @Author       Kevin Turner                                            
  *   @Date         Jan 2016                                                         
  *   @help         See http://sailsjs.org/#!/documentation/concepts/Controllers                                                                                 
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

var uuid=require("uuid");

module.exports = {    
    
    /**
     * @name             controller.RouteController.handleRequest
     * @method
     * @description      Handle inbound request 
     * @param {Object}   req    Request object   
     * @param {Object}   res    Response object
     */
    handleRequest: function(req, res) {
        return this.handle(req, res);          
    },
    
    /**
     * @name             controller.RouteController.handleDownloadRequest
     * @method
     * @description      Handle inbound download request 
     * @param {Object}   req    Request object   
     * @param {Object}   res    Response object 
     */
    handleDownloadRequest: function(req, res) {
        return this.handle(req, res, true);
    },
    
    /**
     * @name             controller.RouteController.handleUploadRequest
     * @method
     * @description      Handle inbound upload request 
     * @param {Object}   req    Request object   
     * @param {Object}   res    Response object 
     */
    handleUploadRequest: function(req, res) {
        var self=this;        
        // Some test code to start with
        req.file('FILETOUP').on('progress', function(event){
            // No need to do anything here as the client will get the progress anyway 
        }).upload({
            maxBytes: req.param("maxbytes")
        }, function whenDone(err, uploadedFiles) { 
            if (err) {
                sails.log.error(err);
                var response={};
                response.dataout={ 
                    err: err.message,
                    timestamp: new Date().toString(),  
                    ipaddress: Utility.getIPAddress(),  
                };
                return self.returnResponse(req,res,response,-920);
            }
            else {                
                req.options.uploadedFiles=uploadedFiles;
                return self.handle(req, res);    
            }           
        });
        
        
        
    },
    
    
    /**
     * @name             controller.RouteController.returnResponse
     * @method
     * @description      Return response with augmentation 
     * @param {req}      req  HTTP request
     * @param {res}      res  HTTP response
     * @param {Object}   response Response
     * @param {Integer}  resultCode Result code 
     * @return {Object}
     */
    returnResponse: function(req,res,response,resultCode) {
        response.servertype="node";
        if (response.dataout && response.dataout.resultCode) {
             delete response.dataout.resultCode;        
        }                
        //response.dataout.resultcode=resultCode;  
        response.resultcode=resultCode;
       
        return res.json(response);
    },
    
    /**
     * @name             controller.RouteController.returnDownload
     * @method
     * @description      Return download response 
     * @param {req}      req  HTTP request
     * @param {res}      res  HTTP response
     * @param {Object}   response Response 
     * @return {Object}
     */
    returnDownload: function(req,res,response) {
        
        var fs=require("fs");
        var path=require("path");
        var model=response.dataout.model;
        
        // Any headers?
        if (model.headers) {
            res.set(model.headers)
        }
        
        // Make sure the file exists before downloading it
        try {
            var fullpath=path.join(model.fileloc, model.filename);
            if (fs.statSync(fullpath).isFile()) {
                return res.download(fullpath, model.filename, function(err){
                    if(err) {
                        sails.log.error(err);
                        return res.notFound();
                    }
                    //delete the file after we are done with it.
                    if (model.dispose) fs.unlink(fullpath);

                });
            }
            else {
                return res.notFound();
            }
        }
        catch(e) {
            return res.notFound();
        }
    },

    /**
     * @name             controller.RouteController.handle
     * @method
     * @description      **INTERNAL** Handle inbound request 
     * @param {Object}   req    Request object   
     * @param {Object}   res    Response object
     * @param {Boolean}  [download] It is a download request  
     */
    handle: function(req, res, download){
        var self=this;           
        // In the normal course of events we will have a function to call
        var reqStuff=Utility.getStuffFromReq(req);
        var func=reqStuff.func; 
        var rmr=reqStuff.rmr;
        var parms={};
        if (rmr) {                  
            parms.datain=rmr; 
        }
        else {            
            parms.datain=req.allParams();                    
        }       
        
        if (typeof parms.datain.model=="string") {
            parms.datain.model=JSON.parse(parms.datain.model);
        }
        
        if (req.options.uploadedFiles) {
            // We have uploaded some files
            parms.datain.model.uploadedFiles=req.options.uploadedFiles;
        }
        
        if (func) { 
            sails.log.verbose("Running function "+func);
            // Move the function to call to the top level of the payload
            delete parms.datain.func;
            parms.func=func;  
            parms.env=req.env;  
            var timeout;
            if (parms.datain.model && parms.datain.model.requesttimeout) {
                timeout=parms.datain.model.requesttimeout;
            } 
           
            var _execute=function(token){
                parms.datain.token=token;
                Q.execute(parms,{
                    onSuccess: function(response){ 
                        response.token=token;
                        var resultCode=response.dataout.resultCode?response.dataout.resultCode:0;
                        if (download) {
                            return self.returnDownload(req,res,response);
                        }
                        else {
                            return self.returnResponse(req,res,response,resultCode);  
                        }                                                 
                    }
                    ,onError: function(response){
                        return self.returnResponse(req,res,response,-920);
                    }
                    ,onTimeout: function(response){                                               
                        return self.returnResponse(req,res,response,-910);
                    }
                },
                timeout)
            }
            
            // Initialise a back-end session store if required
            //sails.log.debug(req.sessionID);
            //sails.log.debug(req.session.sessionToken)
            if (!req.param("token") && !req.options.token && func!="xminit") {               
                 return res.login(-900);    
            }        
            else {
                 // We delete the token from param to not mess with blueprints
                delete req.query.token;
                _execute(req.options.token);                               
            }
        }
        else {
            // Huh!   Don't know what to do
            var response={};
            response.dataout={
                func: "UNKNOWN",
                err: "I cannot tell what to do with this request!",
                timestamp: new Date().toString(),  
                ipaddress: Utility.getIPAddress(),  
            };
            return self.returnResponse(req,res,response,-920);
        }   
    },  
    
};

