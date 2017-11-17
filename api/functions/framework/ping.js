/**    
 *   @Module        ping                                                    
 *   @Description   Chromis ping function for capacity testing and load balancing                  
 *   @Author        Kevin Turner                                            
 *   @Date          Jan 2016                                                         
 **/
                                                                                     
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
            // Process data model here        
            var dataout={}; 
            //sails.log.debug("Ping received")
            self.model.msg="ack";  
            dataout.model=self.model;
            // Return response 
            cb(dataout);    
        }); 
        
    },
    
    
    initialise: function(cb){
        cb();
    },
    
   
 
};
 

