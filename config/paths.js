/**
 * Path mapping
 * (sails.config.paths)
 *
 * This tells Sails where to load assets from.  Typically Grunt is used to 
 * copy and (optionally) uglify assets into the /.tmp folder and then 
 * serve assets from /.tmp
 * 
 * In Reniassance we don't currently want to do that, so we will serve
 * assets directly from the /assets folder.  The Grunt tasks are all still 
 * configured for future reference, but crucially Grunt has been disabled
 * by adding "hooks": { "grunt": false } to .sailsrc
 */


module.exports.paths = {

  /***************************************************************************
  *                                                                          *
  * Default to the original assets folder                                    *                                                                *
  *                                                                          *
  ***************************************************************************/
    
    public: __dirname+"/../assets" 
    
};
