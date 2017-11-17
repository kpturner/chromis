/**
 * Landing page after authentication
 *
 * Usage:
 * return res.landingPage();
 * return res.landingPage(model);
 * return res.landingPage(model, 'auth/login');
 *
 * @param  {Object} model
 * @param  {String|Object} options
 *          - pass string to render specified view
 */

module.exports = function sendOK (data, options) {

  // Get access to `req`, `res`, & `sails`
  var req = this.req;
  var res = this.res;
  var sails = req._sails;
  var response={};  
  response.dataout={};
  
  // TODO
  response.model=model;
  
  sails.log.silly('res.landingPage() :: Sending 200 ("landingPage") response');

  // Set status code
  res.status(200);

  // If appropriate, serve data as JSON(P)
  return res.jsonx(response);
  

};