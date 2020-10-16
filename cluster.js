const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork().on('online', function () {
      console.log('worker online', this.id);
    });
  }
  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`, 'code:', code, 'signal', signal);
    cluster.fork().on('online', () => {
      console.log('worker online');
    });
  });
} else {
  // change this line to Your Node.js app entry point.
  require('./bin/www');
}
