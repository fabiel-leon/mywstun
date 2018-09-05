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

(function () {

    var WebSocketClient, bindSockets, net, wst_client;

    WebSocketClient = require('./wsclient');
    net = require("net");
    bindSockets = require("./bindSockets");

    module.exports = wst_client = (function () {

        function wst_client() {
            console.log("[SYSTEM] - " + (new Date()) + " - WS Tunnel Client starting...");
            this.tcpServer = net.createServer();

        }

        wst_client.prototype.start = function (localPort, wsHostUrl, remoteAddr, prox) {

            console.log("[SYSTEM] - " + (new Date()) + " --> client started.");

            var proto = wsHostUrl.split(":")[0];
            if (proto == "wss")
//         require("../lib/https_override");

                this.tcpServer.listen(localPort);

            console.log("[SYSTEM] - " + (new Date()) + " --> WS tunnel established. Waiting for incoming connections...");

            return this.tcpServer.on("connection", (function (_this) {

                return function (tcpConn) {

                    var url, wsClient;
                    console.log("[SYSTEM] - " + (new Date()) + " - New connection...");

                    wsClient = new WebSocketClient();

                    wsClient.on('connectFailed', function (error) {
                        console.log("[SYSTEM] - " + (new Date()) + " --> WS connect error: " + error.toString());
                        return tcpConn.destroy();
                    });

                    wsClient.on('connect', function (wsConn) {
                        console.log("[SYSTEM] - " + (new Date()) + " --> WS connected.");
                        return bindSockets(wsConn, tcpConn);
                    });

                    if (remoteAddr) {
                        url = "" + wsHostUrl + "/?dst=" + remoteAddr;
                    } else {
                        url = "" + wsHostUrl;
                    }

                    var extraRequestOptions;
                    if (prox) {
                        var sslConfig = require('ssl-config')('modern');
                        var tunnelagent = require('tunnel-agent');
                        var parse = require('url').parse(prox);
                        var proxx = tunnelagent.httpsOverHttp({
                            'proxy': {
                                hostname: parse.hostname, //proxy 
                                port: parse.port, //port
                                headers: {
                                    "User-Agent": "Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/64.0.3282.167 Chrome/64.0.3282.167 Safari/537.36"
                                },
                            },
                            //este es el que sirve
                            ciphers: sslConfig.ciphers ,
                            honorCipherOrder: true,
                            secureOptions: sslConfig.minimumTLSVersion
                        });
                        extraRequestOptions={agent: proxx}
                    }

                    return wsClient.connect(url, 'tunnel-protocol',void 0,void 0,extraRequestOptions);
                };

            })(this));

        };

        return wst_client;

    })();

}).call(this);