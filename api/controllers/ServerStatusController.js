 /**
  *   @Class         controller.ServerStatusController           
  *   @Description : Chromis Server Status Controller             
  *   @Author      : Kevin Turner                                            
  *   @Date        : Jan 2016                                                         
  *   @help        : See http://sailsjs.org/#!/documentation/concepts/Controllers                                                                                 
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
     * @name         controller.ServerStatusController.initialise
     * @method
     * @description  Initialise status (no servers running yet
     * @param  {Function} callback
     */
    initialise: function(cb){
        xserverstatus.destroy().exec(cb)       
    }, 
    
};

