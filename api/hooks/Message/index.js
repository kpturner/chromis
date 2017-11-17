//********************************************************************/        
//*   @Description : Chromis Message Services  
//*   @Author      : Kevin Turner                                            
//*   @Date        : Feb 2016                                                  
//*                                                                                    
//********************************************************************/           
//*                                                                                    
//*  Modification log                                                                  
//*  ================                                                                  
//*                                                                                    
//*  Inits  Date    Modification                                                       
//*  =====  ====    ============                                                       
//*                               
//*******************************


module.exports = function Message(sails) {
    
    /**
     * Globals
     */
    

    /**
     * @class   hook.Message
     * @author  Kevin Turner
     * @description Chromis Message Services  
     */
    function Message() {
        this.errors=[];
        this.infos=[];
    }

    /**
     * Private hook globals
     */
     
    
   /**
    * Private hook functions
    */ 
    
    // Prototype methods for class
    Message.prototype={
        /**
         * @name                hook.Message.initialise
         * @method
         * @description         Message handling initialisation
         */
        initialise: function(){
           
            this.errors=[];
            this.infos=[];

        }, 
    
    
       /**
        * @name                hook.Message.error
        * @method
        * @description         Define an error message for response
        * @param {String}      code    Message code
        * @param {Array}       [fields]  Fields in error (can be a string)
        * @param {Array}       [rplvars] Replacement variables (can be a string_)  
        */
        error: function(code,fields,rplvars){
        
            this.errors.push({
                code:   code,
                ref: ((typeof fields=="string")?[fields]:fields),
                rplvars: ((typeof rplvars=="string")?[rplvars]:rplvars),
            })

        }, 
        
        /**
        * @name                hook.Message.info
        * @method
        * @description         Define an info message for response
        * @param {String}      code    Message code
        * @param {Array}       [fields]  Fields in error (can be a string)
        * @param {Array}       [rplvars] Replacement variables (can be a string_)  
        */
        info: function(code,fields,rplvars){
        
            this.msgq.push({
                code:   code,
                ref: ((typeof fields=="string")?[fields]:fields),
                rplvars: ((typeof rplvars=="string")?[rplvars]:rplvars),
            })

        }, 
        
        
        /**
        * @name                hook.Message.errorCount
        * @method
        * @description         Return the number of messages stored this far
        * @return {Integer}     
        */
        errorCount: function(){
        
            return this.errors.length;

        }, 
    
        /**
        * @name                hook.Message.infoCount
        * @method
        * @description         Return the number of messages stored this far
        * @return {Integer}     
        */
        infoCount: function(){
        
            return this.infos.length;

        }, 
   
    }
    
    
    // Expose hook public methods
    return {

        Message: Message, 

    };

};