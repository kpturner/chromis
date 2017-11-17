/**
 * Bootstrap
 * (sails.config.bootstrap)
 *
 * An asynchronous bootstrap function that runs before your Sails app gets lifted.
 * This gives you an opportunity to set up your data model, run jobs, or perform some special logic.
 *
 * For more information on bootstrapping your app, check out:
 * {@link http://sailsjs.org/#!/documentation/reference/sails.config/sails.config.bootstrap.html}
 */

module.exports.bootstrap = function(cb) {  
    
    // Generate docs in DEV mode
    if (sails.config.environment==="development" && sails.config.rns.generateDocs) {
        
        execf=require('child_process').exec;
        var scr=require("path").join(sails.config.appPath,'createdocs.sh');
        execf(scr,[],function(err,stdout,stderr){
            if (err) {
                sails.log.error(err)
            }
            else {
                sails.log.debug("Docs generated in /assets/docs");
                sails.log.debug(stdout)
            }
        });
        
    }

    // Load the passport strategies
    sails.services.passport.loadStrategies();
    
    sails.on('lifted', function() {   
        
        // Memory leak testing?
        if (sails.config.rns.heapdumpInterval) {
            Utility.memoryLeakCheck();
        }
        
        // Test harness?
        if (sails.config.rns.bootstrapTestHarness) {
            sails.config.rns.bootstrapTestHarness();
        }

        // Release locks
        Lock.releaseAllLocks();  
        
        // Tidy up throroughly before kick-off
        Bus.initialise(sails.config.rns.busProvider,function(){
            Utility.deleteRedisKeys([sails.config.mutex.prefix+"*","rns:pr:*"],function(){
                if (sails.config.session.clearonlift) {
                    Utility.deleteRedisKeys(sails.config.session.namespace+":*",function(){
                        CFG.initialise(Q.startServerManagers); 
                    })
                }
                else {
                    CFG.initialise(Q.startServerManagers); 
                }     
            })
        })
        
          
    }); 
    
    // It's very important to trigger this callback method when you are finished
    // with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
    cb();
};
