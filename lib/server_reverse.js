//###############################################################################
//##
//# Copyright (C) 2014-2015 Andrea Rocco Lotronto, 2017 Nicola Peditto
//##
//# Licensed under the Apache License, Version 2.0 (the "License");
//# you may not use this file except in compliance with the License.
//# You may obtain a copy of the License at
//##
//# http://www.apache.org/licenses/LICENSE-2.0
//##
//# Unless required by applicable law or agreed to in writing, software
//# distributed under the License is distributed on an "AS IS" BASIS,
//# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//# See the License for the specific language governing permissions and
//# limitations under the License.
//##
//###############################################################################
  
var WebSocketServer, bindSockets, http, net, url, wst_server_reverse;

WebSocketServer = require('websocket').server;
http = require('http');
url = require("url");
net = require("net");
bindSockets = require("./bindSockets_reverse");

uuid = require('node-uuid');


https_flag = null;

var eventEmitter = require('events').EventEmitter;
eventEmitter.prototype._maxListeners = 1000;

var newWSTCP_DATA = new eventEmitter();

wst_server_reverse = function(options) {

  if(options != undefined) {

    console.log("[SYSTEM] - " + (new Date()) + " - WS Reverse Tunnel Server starting with these paramters:\n" + JSON.stringify(options, null, "\t"));
    this.dstHost = options.dstHost;
    this.dstPort = options.dstPort;

    https_flag = options.ssl;

  }
  else
    console.log("[SYSTEM] - " + (new Date()) + " - WS Reverse Tunnel Server starting...");


  if(https_flag == "true"){
    
    //HTTPS
    console.log("[SYSTEM] - " + (new Date()) + " WS Reverse Tunnel Server over HTTPS.");
    var https = require('https');
    var fs = require('fs');

//    require("../lib/https_override"); //add parameters overriding each https request
    
    https_flag = options.ssl;

    try{
      // certificates loading from file
      this.s4t_key = fs.readFileSync(options.key, 'utf8');
      this.s4t_cert = fs.readFileSync(options.cert, 'utf8');
      
    }catch (err) {
      // handle the error safely
      console.log("[SYSTEM] - " + (new Date()) + " --> ERROR: " + err);
      process.exit(1);

    }

    var credentials = {
      key: this.s4t_key,
      cert: this.s4t_cert
    };

    this.httpServer = https.createServer(credentials, function(request, response) {
        console.log(request, response);
    });
    

  }else{
    
    //HTTP
    console.log("[SYSTEM] - " + (new Date()) + " WS Reverse Tunnel Server over HTTP.");
    this.httpServer = http.createServer(function(request, response) {
        console.log(request, response);
    });
    
  }

  //create websocket
  this.wsServerForControll = new WebSocketServer({
    httpServer: this.httpServer,
    autoAcceptConnections: false
  });

};

wst_server_reverse.prototype.start = function(port) {

  if (https_flag == "true")
    console.log("[SYSTEM] - " + (new Date()) + " WS Reverse Tunnel Server starting on: wss://localhost:" + port + " - CERT: \n" + this.s4t_cert);
  else
    console.log("[SYSTEM] - " + (new Date()) + " WS Reverse Tunnel Server starting on: ws://localhost:" + port);

  //Activate HTTP/S server
  this.httpServer.listen(port, function() {
    console.log("[SYSTEM] - " + (new Date()) + " WS Reverse Tunnel Server is listening...");
  });


  this.wsServerForControll.on('request', (function(_this){
    return function(request){

      //Create one TCP server for each client WebSocketRequest
      request.tcpServer = new net.createServer();

      var uri = url.parse(request.httpRequest.url, true);

      var src_address = request.httpRequest.client._peername.address.split(":")[3];

      if (uri.query.dst != undefined){

        var remoteAddr = uri.query.dst;
        ref1 = remoteAddr.split(":");
        var portTcp = ref1[1];

        console.log("[SYSTEM] - " + (new Date()) + " WebSocket creation towards " + src_address + " on port " + portTcp );
     
        request.tcpServer.listen(portTcp);
        console.log("[SYSTEM] - " + (new Date()) + " --> TCP server is listening on port" + portTcp);
        
        request.wsConnectionForControll = request.accept('tunnel-protocol', request.origin);
        console.log("[SYSTEM] - " + (new Date()) + " --> WS connection created");

        request.wsConnectionForControll.on('close', function(reasonCode, description) {
          console.log('[SYSTEM] - ' + (new Date()) + ' WebSocket Controll Peer ' + request.wsConnectionForControll.remoteAddress.split(":")[3] + ' disconnected reason: \"'+description+'\"');
          console.log("[SYSTEM] - " + (new Date()) + " Close TCP server on port" + portTcp);
          request.tcpServer.close();
        });

      }
      else{
        //REQUEST FOR WS USED FOR DATA
        console.log("[SYSTEM] - " + (new Date()) + " --> WebSocket Request for Data");
        newWSTCP_DATA.emit('created', request);
      }

      //Manage TCP Connection
      request.tcpServer.on('connection', (function(_this){
        
        return function(tcpConn){
          
          tcpConn.wsConnection;
          
          //Putting in pause the tcp connection waiting the new socket WS Socket for data
          tcpConn.pause();
          var idConnection = uuid.v4();
          var msgForNewConnection = "NC:"+idConnection;
          
          request.wsConnectionForControll.sendUTF(msgForNewConnection);
  
          newWSTCP_DATA.on('created',(function(_this){

            return function(request){

              try{

                var uri = url.parse(request.httpRequest.url, true);

                if(idConnection == uri.query.id){

                  //tcpConn.wsConnection = wsTCP;
                  tcpConn.wsConnection = request.accept('tunnel-protocol', request.origin);
                  bindSockets(tcpConn.wsConnection, tcpConn);
                  //DEBUG console.log("Bind ws tcp");

                  //Resuming of the tcp connection after WS Socket is just created
                  tcpConn.resume();
                  //DEBUG console.log("TCP RESUME");

                }

              }catch (err) {
                // handle the error
                console.log("[SYSTEM] - " + (new Date()) + " --> ERROR: " + err);
                request.tcpServer.close();

              }

            }

          })(this));

        }
        
      })(_this));

    }
  })(this));
};


module.exports = wst_server_reverse;