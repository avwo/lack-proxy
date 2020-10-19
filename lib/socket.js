const net = require('net');
const LRU = require('lru-cache');
const { getPort, LOCAL_ADDRESS } = require('./util');
const { getProxy, createConnection } = require('./proxy');

const { Socket, _normalizeArgs } = net;
const lru = new LRU({ max: 5120, maxAge: 30000 });
const LACK_PATH = /\.lackproxy$/;
let port;
let promise;
let tempProxyOpts;
const socketProto = Socket.prototype;
const { connect } = socketProto;

const onClose = (req, cb) => {
  req.on('error', cb);
  req.once('close', cb);
};

const handleSocket = (socket) => {
  let destroyed;
  let proxySocks;
  const destroy = () => {
    if (!destroyed) {
      destroyed = true;
      socket.destroy();
      if (proxySocks) {
        proxySocks.destroy();
      }
    }
  };
  onClose(socket, destroy);
  socket.on('error', () => {}); // TODO: xxx hasError
  const key = `${socket.remotePort}:${port}`;
  const opts = lru.peek(key);
  const handleProxy = async (options) => {
    try {
      proxySocks = await createConnection(options);
      onClose(proxySocks, destroy);
      socket.pipe(proxySocks).pipe(socket);
    } catch (e) {
      destroy();
    }
  };
  if (opts) {
    lru.del(key);
    handleProxy(opts);
  } else {
    lru.set(key, handleProxy);
  }
};

const startProxy = (options, callback) => {
  if (options.path || !LACK_PATH.test(options.host)) {
    return callback();
  }
  options.host = options.host.slice(0, -10);
  options.isSocket = true;
  if (!promise) {
    promise = new Promise(resolve => {
      getPort(handleSocket, (curPort) => {
        port = curPort;
        resolve(port);
      });
    });
  }
  promise.then(callback);
};

socketProto.connect = function(...args) {
  args = Array.isArray(args[0]) ? args[0] : _normalizeArgs[args];
  let options = args[0] || {};
  const cb = args[1];
  this.connecting = true;
  startProxy(options, async (tempPort) => {
    const proxyOptions = tempPort && await getProxy(options);
    if (!proxyOptions) {
      return connect.call(this, options, cb);
    }
    tempProxyOpts = tempProxyOpts || {
      host: LOCAL_ADDRESS,
      port: tempPort,
      localAddress: LOCAL_ADDRESS,
    };
    connect.call(this, tempProxyOpts, () => {
      const key = `${this.localPort}:${tempPort}`;
      const handler = lru.get(key);
      options = Object.assign({}, options);
      options.proxy = proxyOptions;
      if (typeof handler === 'function') {
        lru.del(key);
        handler(options);
      } else {
        lru.set(key, options);
      }
      if (typeof cb === 'function') {
        cb.call(this);
      }
    });
  });
  return this;
};

const addLackSuffix = (host) => {
  return LACK_PATH.test(host) ? host : `${host}.lackproxy`;
};

exports.enableProxy = (options) => {
  if (!options || options.path) {
    return options;
  }
  if (typeof options === 'string') {
    return addLackSuffix(options);
  }
  options = Object.assign({}, options);
  options.host = addLackSuffix(options.host);
  return options;
};
