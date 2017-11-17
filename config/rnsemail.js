/**
 * Events Email configuration for api\hooks\events-hook-email
 * (sails.config.rnsemail)
 *
 * Override settings in config/env/development.js or config/end/production.js or in config/locals.js
 * using:
 *   rnsemail:  {}
 * 
 * 
 */

module.exports.rnsemail = {

       /**
        * Custom transporter passed directly to nodemailer.createTransport (overrides service/auth)
        */
        transporter:	{
            host: process.env.SMTP_HOST || '',
            port: process.env.SMTP_PORT || 25,
            tls:{
                rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED?true:false
            },
            auth: (process.env.SMTP_USER)?{
                user: process.env.SMTP_USER || null,
                pass: process.env.SMTP_PASS || null
            }:null
        },
        from:  process.env.SMTP_SENDER || 'Chromis Diagnostics <noreply@renaissanceframework.com>', // sender address
        testMode:  (process.env.SMTP_TESTMODE=='1')?true:false, 
 
 
};