const net = require('net');

const LACK_PROXY_EXPORTS = Symbol.for('#.LACK_PROXY__EXPORTS___');
let lackProxy = net[LACK_PROXY_EXPORTS];
if (lackProxy) {
  module.exports = lackProxy;
} else {
  lackProxy = require('./lib'); // eslint-disable-line
  net[LACK_PROXY_EXPORTS] = lackProxy;
  module.exports = lackProxy;
}
