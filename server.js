
const g_wa_integration_id      = process.env.WA_INTEGRATION_ID;
const g_wa_region              = process.env.WA_REGION;
const g_wa_service_instance_id = process.env.WA_SERVICE_INSTANCE_ID;
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
  g_log.writeLog( "\nServer running" );
  
} );


// Web page with chatbot on it
//
g_app.get( "/chatbot", function( request, response )
{
    g_log.writeLog( "\n/chatbot ..." );
    
    response.render( "pages/chatbot", { "wa_integration_id"      : g_wa_integration_id,
                                        "wa_region"              : g_wa_region,
                                        "wa_service_instance_id" : g_wa_service_instance_id,
                                        "base_url"               : g_base_url } );
    
} );


// Endpoint for Watson Assistant webhook
//
g_app.post( "/asyncwrapper", function( request, response )
{
    g_log.writeLog( "\n/asyncwrapper body:\n" + JSON.stringify( request.body, null, 3 ) );
    
    var str = request.body.str ? request.body.str : "";
    
    // 1. Respond right away so the chatbot can move on
    // 2. Call the async web service
    // 3. After the web service responds, send a message to the chatbot using the chatbot web api
    
    response.status( 200 ).json( { "error_str" : "", "result" : "Success" } );
    
    callAsyncWebService( str, function( error_str, result_data )
    {
        if( error_str )
        {
            sendMessage( { "error_str" : error_str } );
            return;
        }
        
        sendMessage( result_data );
        
    } );
            
} );


function callAsyncWebService( str, callback )
{
    var url  = g_some_async_webservice; // This would be whatever web service you need to call
    var data = { "str" : str };
    
    g_axios.post( url, data ).then( function( result )
    {
        if( 200 !== result.status )
        {
            g_log.writeLog( "callAsyncWebService error: HTTP !== 200" );            
            callback( "Call to async endpoint failed", {} );
            return;
        }
        
        g_log.writeLog( "callAsyncWebService success" );
        callback( "", result.data );
        
    } ).catch( function( error )
    {
        g_log.writeLog( "callAsyncWebService axios error message:\n" + error.message );
        callback( error.message, {} );
        
    } );
    
}


// Use socket.io to send async web service results 
// to the web page where the chatbot is
//
var g_socket_p = null;
const g_io = g_socketio( g_server );
g_io.on( "connection", function( socket )
{
    g_log.writeLog( "\nsocket.io connection" );
    
    g_socket_p = socket;
  
} );

function sendMessage( data )
{
    try
    {
        g_log.writeLog( "sendMessage data:\n" + JSON.stringify( data, null, 3 ) );
        
        g_socket_p.emit( "asyncresult", data );
    }
    catch( e )
    {
        g_log.writeLog( "sendMessage caught an error:\n" + e.message + "\n" + e.stack );
    }
}


// Pretend async endpoint for demo purposes
//
g_app.post( "/asyncendpoint", function( request, response )
{
    g_log.writeLog( "/asyncendpoint body:\n" + JSON.stringify( request.body, null, 3 ) );
    
    var str = request.body.str ? request.body.str : "";
    
    const myTimeout = setTimeout( function()
    {
        // Wait 10 seconds before responding
        
        g_log.writeLog( "/asyncendpoint responds" );
        
        var result = str.split("").reverse().join(""); // Note: Just a random thing to show results. *Only works for ASCII text.
        
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
    g_log.writeLog( "/health ..." );
    
    response.status( 200 ).end( "Success" );
    
} );



