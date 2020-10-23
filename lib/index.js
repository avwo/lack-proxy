const http = require('http');
const https = require('https');
const { parse: urlParse } = require('url');
const util = require('util');
require('./socket'); // 初始化socket
const { getAgent, HTTP_REQ_FLAG } = require('./util');
const { getProxy, setProxy, removeProxy } = require('./proxy');

const { ClientRequest } = http;
const CONNECT_RE = /^\s*connect\s*$/i;

const checkMethod = (opts) => {
  return opts && CONNECT_RE.test(opts.method);
};

function ClientRequestProxy(uri, options, cb, isHttps) {
  if (typeof uri === 'string') {
    uri = urlParse(uri);
  }
  if (typeof options === 'function') {
    cb = options;
    options = Object.assign({}, uri);
  } else {
    options = Object.assign({}, uri, options);
  }
  options[HTTP_REQ_FLAG] = true;
  options.isSocket = false;
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

exports.getProxy = getProxy;
exports.setProxy = setProxy;
exports.proxy = setProxy;
exports.removeProxy = removeProxy;
