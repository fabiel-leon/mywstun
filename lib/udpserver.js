const dgram = require('dgram');

const server = dgram.createSocket('udp4');

// server.on('error', (err) => {
//   console.log(`server error:\n` + err.stack+``);
//   server.close();
// });

// server.on('message', (msg, rinfo) => {
//   console.log('detected UDP message, the VPN you are connecting uses UDP and this software works with TCP');
//   console.log(`server got: ` + msg} from ` + rinfo.address+`:` + rinfo.port}`);
// });

server.on('listening', () => {
  const address = server.address();
  console.log('UDP server listening ' + address.address + ':' + address.port + ' to detect UDP connecttions ');
});

module.exports = (port) => { server.bind(port); return server; };
