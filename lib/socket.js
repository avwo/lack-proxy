const net = require('net');
const LRU = require('lru-cache');
const { getPort, LOCAL_ADDRESS, HTTP_REQ_FLAG } = require('./util');
const { getProxy, createConnection, normalizeArgs } = require('./proxy');

const { Socket } = net;
const lru = new LRU({ max: 5120, maxAge: 30000 });
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
  if (options[HTTP_REQ_FLAG] || options.path) {
    return callback();
  }
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
  args = Array.isArray(args[0]) ? args[0] : normalizeArgs[args];
  let options = args[0] || {};
  const cb = args[1];
  this.connecting = true;
  startProxy(options, (tempPort) => {
    const proxyOptions = tempPort && getProxy(options);
    if (!proxyOptions || (proxyOptions.filterRequest && !proxyOptions.filterRequest(options, true))) {
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
