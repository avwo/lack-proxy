const assert = require('assert');
const net = require('net');
const { request } = require('http');
const { HTTP_REQ_FLAG } = require('./util');

const HOST_RE = /^\s*[\w.-]+\s*$/;
let globalProxy;

const checkHost = host => HOST_RE.test(host);
const checkPort = port => port > 0 && port <= 65535;

const formatProxy = (proxy) => {
  if (!proxy || typeof proxy === 'function') {
    return proxy;
  }
  let { host, port, socket, headers, filterRequest } = proxy;
  assert(checkHost(host), 'Enter the correct host.');
  assert(checkPort(port), 'Enter the correct port.');
  filterRequest = typeof filterRequest === 'function' ? filterRequest : undefined;
  proxy = { host, port, headers, filterRequest };
  if (socket === false) {
    proxy.socket = false;
  } else if (socket) {
    const { host: h, port: p } = socket;
    assert(checkHost(h), 'Enter the correct host.');
    assert(checkPort(p), 'Enter the correct port.');
    proxy.socket = { host: h, port: p, headers: socket.headers || headers };
  } else {
    proxy.socket = { host, port, headers };
  }
  return proxy;
};

const getProxy = (options, isHttps) => {
  if (!globalProxy || !options || typeof globalProxy !== 'function') {
    return globalProxy;
  }
  const proxy = formatProxy(globalProxy(Object.keys({}, options)));
  if (proxy) {
    proxy.headers = proxy.headers || {};
    if (!proxy.headers.host) {
      let { host } = options;
      if (typeof host === 'string') {
        host = host.split(':', 1)[0];
        if (host) {
          proxy.headers.host = `${host}:${options.port || (isHttps ? 443 : 80)}`;
        }
      }
    }
  }
  return proxy;
};

exports.setProxy = (proxy) => {
  globalProxy = formatProxy(proxy);
  return globalProxy;
};

exports.getProxy = getProxy;

exports.removeProxy = () => {
  globalProxy = null;
};

const createConnection = (options) => {
  const { proxy } = options;
  if (!proxy) {
    return new Promise((resolve, reject) => {
      const socket = net.connect(options, () => resolve(socket));
      socket.on('error', reject);
    });
  }

  const headers = options.headers || {};
  const path = `${options.host}:${options.port}`;
  headers.host = path;

  if (!headers['x-whistle-policy']) {
    headers['x-whistle-policy'] = 'tunnel';
  }
  headers['x-whistle-request-tunnel-ack'] = 1;
  if (!headers['x-lack-proxy-proto']) {
    headers['x-lack-proxy-proto'] = options.isSocket === 2 ? 'h2' : 'socket';
  }
  const proxyOpts = {
    [HTTP_REQ_FLAG]: true,
    method: 'CONNECT',
    agent: false,
    host: proxy.host,
    port: proxy.port,
    path,
    headers,
  };
  return new Promise((resolve, reject) => {
    const req = request(proxyOpts);
    req.on('connect', (res, socket) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Tunneling socket could not be established, statusCode=${res.statusCode}`));
      }
      if (res.headers['x-whistle-allow-tunnel-ack']) {
        socket.write('1');
      }
      resolve(socket);
    });
    req.on('error', reject);
    req.end();
  });
};

exports.createConnection = createConnection;
