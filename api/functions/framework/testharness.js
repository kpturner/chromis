/**       
 *   @Module        testharness                                                           
 *   @Description   Chromis test harness                   
 *   @Author        Kevin Turner                                            
 *   @Date          Jan 2016                                                         
 */
                                                                                    
/********************************************************************           
/*                                                                                    
/*  Modification log                                                                  
/*  ================                                                                  
/*                                                                                    
/*  Inits  Date    Modification                                                       
/*  =====  ====    ============                                                       
/*                               
/********************************************************************/                   

module.exports =  {
    model: {},
    run: function(datain,MOD,cb) {
        var self=this;
        // Initialise rge function
        this.initialise(function(){
            //sails.log.debug(datain)
            // Process data model here        
            var dataout={};
            self.model.hello="world";
            self.model.instance=datain.model.instance;
            dataout.model=self.model;
            //require("sleep").sleep(1000000) // Force a timeout       
            // Return response 
            cb(dataout);     
        });
       
    },
    
    
    initialise: function(cb){
        cb()
    },
    
   
 
};
 

