/**
 * Default model configuration
 * (sails.config.models)
 *
 * Unless you override them, the following properties will be included
 * in each of your models.
 *
 * For more info on Sails models, see:
 * http://sailsjs.org/#!/documentation/concepts/ORM
 */

module.exports.models = {

  /***************************************************************************
  *                                                                          *
  * Your app's default connection. i.e. the name of one of your app's        *
  * connections (see `config/connections.js`)                                *
  *                                                                          *
  ***************************************************************************/
  // connection: 'redisDb',

  /***************************************************************************
  *                                                                          *
  * How and whether Sails will attempt to automatically rebuild the          *
  * tables/collections/etc. in your schema.                                  *
  *                                                                          *
  * See http://sailsjs.org/#!/documentation/concepts/ORM/model-settings.html  *
  *                                                                          *
  ***************************************************************************/
  // migrate: 'alter'
  
    // Define indexes that need to exist. These are composite keys that Waterline
    // doesn't support
    indexes: {
        xpassport_profile:    { 
            table:      "xpassport",
            columns:    ["profile"]
        }, 
        
        xpr_key:    { 
            table:      "xpr",
            columns:    ["app","func","table","type","attrib"]
        },
        
        xprvalue_key:   {
            table:      "xprvalue",
            columns:    ["pr","seq"]
        },
        
        xtrans_key:   {
            table:      "xtrans",
            columns:    ["locale", "pr"]
        }, 
        
        xtransvalue_key:   {
            table:      "xtransvalue",
            columns:    ["locale", "pr", "seq"]
        }, 

        xwprefs_key: {
            table:      "xwprefs",
            columns:    ["xwpuser","xwpwidg"]
        },   
        
        xfuncd_key:   {
            table:      "xfuncd",
            columns:    ["xfdcode", "xfdlocale"]
        }, 
         
        xrfunc_key:   {
            table:      "xrfunc",
            columns:    ["xrfrole", "xrffunc"]
        },  
          
        xurole_key:   {
            table:      "xurole",
            columns:    ["xuruser", "xurrole"]
        },   
        
        xlock_key:   {
            table:      "xlock",
            columns:    ["xslenviron", "xslentity", "xslentkey"]
        },   
        
        xlock_session:   {
            table:      "xlock",
            columns:    ["xslsession", "xslenviron", "xslentity", "xslentkey"]
        },
        
         xlock_pid: {
            table:      "xlock",
            columns:    ["xslpid"]
        }  
    },


};
