
const g_wa_integration_id      = process.env.WAINTEGRATIONID;
const g_wa_region              = process.env.WAREGION;
const g_wa_service_instance_id = process.env.WASERVICEINSTANCEID;
const g_base_url               = process.env.BASE_URL;

const g_some_async_webservice = g_base_url + "/asyncendpoint";


const g_http       = require( "http"        );
const g_bodyParser = require( "body-parser" );
const g_express    = require( "express"     );
const g_axios      = require( "axios"       );
const g_socketio   = require( "socket.io"   );

const g_log = require( "./my_log.js"   );


var g_app = g_express();
g_app.use( g_bodyParser.json() );
g_app.use( g_bodyParser.urlencoded( { extended: true } ) );
g_app.set( "view engine", "ejs" );


const g_server = g_http.Server( g_app );
g_server.listen( 8080, function()
{
  console.log( "\nServer running" );
  
} );


// Web page with chatbot on it
//
g_app.get( "/chatbot", function( request, response )
{
    console.log( "\n/chatbot ..." );
    
    response.render( "pages/chatbot", { "wa_integration_id"      : g_wa_integration_id,
                                        "wa_region"              : g_wa_region,
                                        "wa_service_instance_id" : g_wa_service_instance_id } );
    
} );


// Endpoint for Watson Assistant webhook
//
g_app.post( "/asyncwrapper", function( request, response )
{
    g_log.writeLog( "\n[server] /asyncwrapper body:\n" + JSON.stringify( request.body, null, 3 ) );
    
    var str = request.body.str ? request.body.str : "";
    
    g_log.writeLog( "[server] /asyncwrapper str: '" + str + "'" );
    
    // 1. Respond right away so the chatbot can move on
    // 2. Call async webservice
    // 3. After webservice responds, send a message to the chatbot through the web api
    
    response.status( 200 ).json( { "error_str" : "", "result" : "Success" } );
    
    g_axios.post( g_some_async_webservice, { "str" : str } ).then( function( result )
    {
        if( 200 !== result.status )
        {
            g_log.writeLog( "[server] /asyncwrapper sends error message" );            
            sendMessage( { "error_str" : "Call to async endpoint failed" } );
            return;
        }
        
        g_log.writeLog( "[server] /asyncwrapper sends success message" );
        
        sendMessage( result.data );
        
    } ).catch( function( error )
    {
        g_log.writeLog( "[server] /asyncwrapper sends error message:\n" + error.message );
        
        sendMessage( { "error_str" : error.message } );
        
    } );
            
} );


// Use socket.io to send async web service results 
// to the web page where the chatbot is
//
var g_socket_p = null;
const g_io = g_socketio( g_server );
g_io.on( "connection", function( socket )
{
    g_log.writeLog( "\n[server] socket.io connection" );
    
    g_socket_p = socket;
  
} );

function sendMessage( data )
{
    try
    {
        g_log.writeLog( "[server] sendMessage data:\n" + JSON.stringify( data, null, 3 ) );
        
        g_socket_p.emit( "asyncresult", data );
    }
    catch( e )
    {
        g_log.writeLog( "[server] sendMessage caught an error:\n" + e.message + "\n" + e.stack );
    }
}


// Pretend async endpoint for demo purposes
//
g_app.post( "/asyncendpoint", function( request, response )
{
    g_log.writeLog( "[server] /asyncendpoint body:\n" + JSON.stringify( request.body, null, 3 ) );
    
    var str = request.body.str ? request.body.str : "";
    
    const myTimeout = setTimeout( function()
    {
        // Wait 10 seconds before responding
        
        g_log.writeLog( "[server] /asyncendpoint responds" );
        
        var result = str.split("").reverse().join(""); // Note: Only works for ASCII
        
        response.status( 200 ).json( { "error_str" : "", "result" : result } );
        
    }, 10 * 1000 );
    
} );


// Logging for basic troubleshooting
//
g_app.get( "/logs", function( request, response )
{
    g_log.readLog( function( content )
    {
        response.status( 200 ).end( content );
        
    } );
        
} );

g_app.post( "/clearlog", function( request, response )
{
    g_log.clearLog( function( error_str )
    {
        if( error_str )
        {
            response.status( 500 ).json( { error_str : error_str } );
            return;
        }
        
        response.status( 200 ).json( { "result" : "Success" } );
        
    } );
        
} );


// For Code Engine pipeline to check
//
g_app.get( "/health", function( request, response )
{
    g_log.writeLog( "[server] /health ..." );
    
    response.status( 200 ).end( "Success" );
    
} );



