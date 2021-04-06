const net = require('net');
const LRU = require('lru-cache');
const { getPort, noop, LOCAL_ADDRESS, HTTP_REQ_FLAG, normalizeArgs } = require('./util');
const { getProxy, createConnection } = require('./proxy');

const { Socket } = net;
const dataCache = new LRU({ max: 1024, maxAge: 60000 });
const lru = new LRU({ max: 5120, maxAge: 30000 });
let port;
let promise;
let tempProxyOpts;
const socketProto = Socket.prototype;
const { connect, destroy: originalDestroy } = socketProto;
const CACHE_KEY_RE = /\.lack-proxy\d+$/;
let index = 0;

// 避免第三方模块没处理好异常导致程序crash
if (originalDestroy.toString().indexOf('estroy.call(this, err)') === -1) {
  socketProto.destroy = function (err) {
    if (this.destroyed) {
      return;
    }
    if (err && !this.listenerCount('error')) {
      this.on('error', noop);
    }
    return originalDestroy.call(this, err);
  };
}

const getIndex = () => {
  if (index >= Number.MAX_SAFE_INTEGER) {
    index = 0;
  }
  return index++;
};

const getCacheKey = (options, keyOnly) => {
  const host = options.host || options;
  if (CACHE_KEY_RE.test(host)) {
    const key = RegExp['$&'];
    return keyOnly ? key : { options, key };
  }
  if (keyOnly) {
    return;
  }
  const key = `.lack-proxy${getIndex()}`;
  if (options.host) {
    options = Object.assign({}, options);
    options.host = `${host}${key}`;
  } else {
    options = `${host}${key}`;
  }
  return { options, key };
};

const getDataOnce = (key) => {
  const data = dataCache.get(key);
  dataCache.del(key);
  return data;
};

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
  if (options[HTTP_REQ_FLAG] || options.path || options.method) {
    return callback();
  }
  const { ALPNProtocols: alpn } = options;
  options.isSocket = alpn && alpn[0] === 'h2' ? 2 : 1;
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
  args = Array.isArray(args[0]) ? args[0] : normalizeArgs(args);
  let options = args[0] || {};
  const cb = args[1];
  this.connecting = true;
  startProxy(options, (tempPort) => {
    const { host } = options;
    if (CACHE_KEY_RE.test(host)) {
      const key = RegExp['$&'];
      options.host = host.slice(0, -key.length);
      options.attachHeaders = getDataOnce(key);
      options.attachData = getDataOnce(`${key}.`);
    }
    const proxyOptions = tempPort && getProxy(options);
    if (!proxyOptions || !proxyOptions.socket
        || (proxyOptions.filterRequest && !proxyOptions.filterRequest(options, true))) {
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
      options.proxy = proxyOptions.socket;
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

const attachData = (options, data, headers) => {
  if (data === undefined && (!headers || typeof headers !== 'object')) {
    return options;
  }
  const { options: result, key } = getCacheKey(options);
  if (data != null) {
    dataCache.set(`${key}.`, data);
  }
  if (headers) {
    dataCache.set(key, headers);
  }
  return result;
};

exports.attachData = (options, data, headers) => attachData(options, data, headers);
exports.attachHeaders = (options, headers) => attachData(options, null, headers);
