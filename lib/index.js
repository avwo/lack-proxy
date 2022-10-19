const http = require('http');
const https = require('https');
const { parse: urlParse } = require('url');
const util = require('util');
const { setUrl, getHeaders, setHeaders, removeHeaders } = require('./socket'); // 初始化socket
const { getAgent, HTTP_REQ_FLAG } = require('./util');
const { getProxy, setProxy, removeProxy, hasProxy } = require('./proxy');

const { ClientRequest } = http;
const CONNECT_RE = /^\s*connect\s*$/i;
const URL_KEYS = ['href', 'origin', 'protocol', 'username', 'password', 'host', 'hostname', 'port', 'pathname', 'search', 'searchParams', 'hash'];

const checkMethod = (opts) => {
  return opts && CONNECT_RE.test(opts.method);
};

const uriToObj = (uri) => {
  if (!uri || typeof URL === 'undefined' || !(uri instanceof URL)) {
    return uri;
  }
  const opts = {};
  URL_KEYS.forEach((key) => {
    const val = uri[key];
    if (val !== undefined) {
      opts[key] = val;
    }
  });
  return opts;
};

function ClientRequestProxy(uri, options, cb, isHttps) {
  if (typeof uri === 'string') {
    uri = urlParse(uri);
  } else {
    uri = uriToObj(uri);
  }
  if (typeof options === 'function') {
    cb = options;
    options = Object.assign({}, uri);
  } else {
    options = uriToObj(options);
    options = Object.assign({}, uri, options);
  }
  options[HTTP_REQ_FLAG] = true;
  options.isSocket = 0;
  if (isHttps) {
    options._defaultAgent = https.globalAgent;
  }

  const proxy = !checkMethod(uri) && !checkMethod(options) && getProxy(options, isHttps);
  if (proxy && (!proxy.filterRequest || proxy.filterRequest(options))) {
    proxy.isHttps = isHttps;
    options.agent = getAgent(proxy, options);
  }
  ClientRequest.call(this, options, cb);
}

util.inherits(ClientRequestProxy, ClientRequest);

http.ClientRequest = ClientRequestProxy;
http.request = function(url, options, cb) {
  return new ClientRequestProxy(url, options, cb);
};
http.get = function get(url, options, cb) {
  const req = new ClientRequestProxy(url, options, cb);
  req.end();
  return req;
};

https.request = function(url, options, cb) {
  return new ClientRequestProxy(url, options, cb, true);
};
https.get = function get(url, options, cb) {
  const req = new ClientRequestProxy(url, options, cb, true);
  req.end();
  return req;
};

exports.socket = {
  setUrl,
  getHeaders,
  setHeaders,
  removeHeaders,
};
exports.getProxy = getProxy;
exports.setProxy = setProxy;
exports.proxy = setProxy;
exports.removeProxy = removeProxy;
exports.hasProxy = hasProxy;
