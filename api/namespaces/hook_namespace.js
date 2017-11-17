/**
 * @namespace hook
 * @description {@link http://sailsjs.org/documentation/concepts/extending-sails/hooks}
 * 
 * In Chromis these are rather like services in that they are globally available 
 * to all server side functions, but invariably whereas a normal service provides simple
 * static help methods in a singleton to do stuff, those created as hooks are real
 * instantiatable objects.  This is essential for services that persist across these
 * duration of a request but that may be called/used via an asynchronous callback. We
 * need to be sure that the information stored within the hook/service cannot be 
 * contaminated when node loops back round and picks up the next request while the 
 * previous one is performing some sort of asynchronous activity.  A typical
 * example would be a service that stores stuff internally when it is initialised, and
 * the value of that thing is relied upon later in the process. If it is not a 
 * proper class/object then the stored value can be overwritten by a request before
 * the previous one has finished using it.
 * 
 * In Chromis the server process usually creates all the objects and then 
 * passes handles to them (via the Handles class) to your function for it to use (SES, MOD, etc)   
 */