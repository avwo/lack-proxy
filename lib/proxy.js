const assert = require('assert');
const net = require('net');
const { request } = require('http');
const { HTTP_REQ_FLAG, formatPatterns, checkPatterns, getHost } = require('./util');

const HOST_RE = /^\s*[\w.-]+\s*$/;
let globalProxy;

const checkHost = host => HOST_RE.test(host);
const checkPort = port => port > 0 && port <= 65535;

const formatProxy = (proxy) => {
  if (!proxy || typeof proxy === 'function') {
    return proxy;
  }
  let { host, port, socket, headers, filterRequest, allowlist, blocklist } = proxy;
  assert(checkHost(host), 'Enter the correct host.');
  assert(checkPort(port), 'Enter the correct port.');
  filterRequest = typeof filterRequest === 'function' ? filterRequest : undefined;
  allowlist = formatPatterns(allowlist);
  blocklist = formatPatterns(blocklist);
  proxy = { host, port, headers, filterRequest, allowlist, blocklist };
  if (socket === false) {
    proxy.socket = false;
  } else if (socket && (socket.host || socket.port)) {
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
  if (!globalProxy || !options) {
    return globalProxy;
  }
  let proxy;
  if (typeof globalProxy === 'function') {
    proxy = globalProxy(Object.keys({}, options), isHttps);
    if (!proxy || typeof proxy === 'function') {
      return;
    }
    proxy = formatProxy(proxy);
  } else {
    proxy = Object.assign({}, globalProxy);
  }

  let host = getHost(options);
  if (!checkPatterns(host, proxy)) {
    return;
  }
  proxy.headers = proxy.headers || {};
  if (!proxy.headers.host && /^([.\w-]+)(?::(\d+))?$/.test(host)) {
    if (!RegExp.$2) {
      host = `${RegExp.$1}:${options.port || (isHttps ? 443 : 80)}`;
    }
    proxy.headers.host = host;
  }
  return proxy;
};

exports.setProxy = (proxy) => {
  globalProxy = formatProxy(proxy);
  return globalProxy;
};

exports.getProxy = getProxy;


exports.hasProxy = () => globalProxy;

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

  const headers = Object.assign({}, options.proxy && options.proxy.headers, options.headers);
  const path = options.url || `${options.host}:${options.port}`;
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
