#!/usr/bin/env node

// ###############################################################################
// ##
// # Copyright (C) 2014-2015 Andrea Rocco Lotronto, 2017 Nicola Peditto
// ##
// # Licensed under the Apache License, Version 2.0 (the "License");
// # you may not use this file except in compliance with the License.
// # You may obtain a copy of the License at
// ##
// # http://www.apache.org/licenses/LICENSE-2.0
// ##
// # Unless required by applicable law or agreed to in writing, software
// # distributed under the License is distributed on an "AS IS" BASIS,
// # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// # See the License for the specific language governing permissions and
// # limitations under the License.
// ##
// ###############################################################################


let portTunnel;
let argv;
let client;
let host;
let localport;
let optimist;
let port;
let server;
let wsHost;
var _;
let _ref;
let _ref1;

var _ = require('under_score');
// const updserver = require('../lib/udpserver');
// var throng = require("throng");
// var crypto = require("crypto");

optimist = require('optimist').usage('Tunnels and reverse tunnels over WebSocket.\n'
    + '\nUsage: https://github.com/MDSLab/wstun/blob/master/readme.md')
  .string('s').alias('s', 'server')
  .describe('s', 'run as server, specify listening port')
  .string('t')
  .alias('t', 'tunnel')
  .describe('t', 'run as tunnel client, specify localport:host:port')
  .string('p')
  .alias('p', 'proxy')
  .describe('p', '[only with -t], specify proxy http://host:port , without auth')
  .boolean('u')
  .alias('u', 'udp')
  .describe('u', '[only with -t], for udp VPN\'s')
  .boolean('r')
  .alias('r', 'reverse')
  .describe('r', 'run in reverse tunneling mode')
  .string('ssl')
  .describe('ssl', '\"true\" | \"false\" to enable|disable HTTPS communication.')
  .string('key')
  .describe('key', '[only with --ssl="true"] path to private key certificate.')
  .string('cert')
  .describe('cert', '[only with --ssl="true"] path to public key certificate.');

argv = optimist.argv;

// throng(startWorker);

function startWorker(id) {
  // firewall enterprise proxy http
  //    if (argv.p) {
  //        var prox = require('url').parse(argv.p);
  //        console.log("prox", prox);
  // //        globaltunnel.initialize();
  //        var globaltunnel = require("global-tunnel-ng");
  //        globaltunnel.initialize({
  //            host: prox.hostname,
  //            port: parseInt(prox.port),
  //            protocol: prox.protocol,
  // //                proxyAuth: 'userId:password', // optional authentication
  //            sockets: 50 // optional pool size for each http and https
  //        });
  //    }
  const fs = require('fs');
  const https = require('https');
  const tunnelagent = require('tunnel-agent');
  const request = require('request');

  //    .on("socket", function (socket) {
  //        console.log('emited removed');
  // //                socket.emit("agentRemove");
  //    }).on('error', function (e) {
  //        console.error(e);
  //    });
  // req.on("upgrade", function (res, socket, head) {
  //     console.log('upgrade', res, head);
  // });

  function reqq(evt) {
    const r = request.defaults({ proxy: 'http://192.164.1.57:8080', forever: true });

    r({
      uri: 'https://seg1ero.cloudno.de/?dst=google.com:443',
      method: 'GET',
      headers: {
        Upgrade: 'websocket',
        Connection: 'Upgrade',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': this.base64nonce,
        'Sec-WebSocket-Protocol': 'tunnel-protocol',
        'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.98 Mobile Safari/537.36',
      },
    }, (error, response, body) => {
      console.log('stats: ' + response.statusCode);
      console.log('headers: ' + response.headers);
    }).on('response', (response) => {
      console.log(response.statusCode); // 200
      console.log(response.headers['content-type']); // 'image/png'
      console.log((response));
    }).on('socket', (socket) => {
      console.log('emited removed');
      socket.emit('agentRemove');
    }).on('connect', (evt) => {
      console.log('evt', evt);
    })
      .on('end', (evt) => {
        console.log('end', evt);
      })
      .on('upgrade', (res, socket, head) => {
        console.log('upgrade', res, head);
      })
      .pipe(fs.createWriteStream('fsdfsd'));
  }

  const wst = require('../lib/wrapper');
  console.log(argv.p);
  if (argv.s && !argv.r) {
    console.log('WS TUNNEL SERVER SIDE');
    // WS tunnel server side
    if (argv.t) {
      _ref = argv.t.split(':'), host = _ref[0], port = _ref[1];
      server_opts = {
        dstHost,
        dstPort,
        ssl: https_flag,
        key,
        cert,
      };
    } else {
      server_opts = {
        ssl: argv.ssl,
        key: argv.key,
        cert: argv.cert,
      };
    }

    server = new wst.server(server_opts);
    server.start(argv.s);
  } else if (argv.t) {
    console.log('WS TUNNEL CLIENT SIDE'); // se ejecuta en VPN modo cliente
    // WS tunnel client side
    client = new wst.client();

    wsHost = _.last(argv._);
    console.log('wsHost', wsHost);
    _ref1 = argv.t.split(':'), localport = _ref1[0], host = _ref1[1], port = _ref1[2];
    // console.log({
    //   localport, wsHost, host, port, p: argv.p,
    // });
    // updserver(localport);
    if (host && port) {
      client.start(localport, wsHost, host + ':' + port, argv.p, argv.u);
    } else {
      client.start(localport, wsHost, void 0, argv.p, argv.u);
    }
  } else if (argv.r) {
    // WS reverse tunnel

    if (argv.s) {
      console.log('REVERSE TUNNEL SERVER SIDE');
      // Server side
      server_opts = {
        ssl: argv.ssl,
        key: argv.key,
        cert: argv.cert,
      };
      server = new wst.server_reverse(server_opts);
      server.start(argv.s);
    } else {
      console.log('REVERSE TUNNEL CLIENT SIDE');
      // Client side
      client = new wst.client_reverse();
      wsHost = _.last(argv._);
      _ref1 = argv.r.split(':'), portTunnel = _ref1[0], host = _ref1[1], port = _ref1[2];
      client.start(portTunnel, wsHost, host + ':' + port);
    }
  } else {
    // Wrong options
    return console.log(optimist.help());
  }
}
startWorker();
