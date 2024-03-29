const tunnel = require('hagent').agent;
const LRU = require('lru-cache');
const { parse: parseUrl } = require('url');
const { createServer, isIP } = require('net');

let curPort = 39003;
const LOCAL_ADDRESS = '127.0.0.1';
const IDLE_TIMEOUT = 1000 * 60 * 3;
const agents = new LRU({ max: 360 });
const noop = () => {};
const HTTP_REQ_FLAG = Symbol('#HTTP_REQ_FLAG');

exports.noop = noop;
exports.HTTP_REQ_FLAG = HTTP_REQ_FLAG;

const removeIPV6Prefix = (ip) => {
  if (typeof ip !== 'string') {
    return '';
  }
  return ip.indexOf('::ffff:') === 0 ? ip.substring(7) : ip;
};

const getClientIp = ({ headers }) => {
  let val = headers && headers['x-forwarded-for'];
  if (!val || typeof val !== 'string') {
    return '';
  }
  const index = val.indexOf(',');
  if (index !== -1) {
    val = val.substring(0, index);
  }
  val = removeIPV6Prefix(val.trim());
  return isIP(val) ? val : '';
};

const getCacheKey = (options) => {
  const {
    isHttps,
    host,
    port,
  } = options;
  return [isHttps ? 'https' : 'http', host, port, getClientIp(options)].join(':');
};

const freeSocketErrorListener = () => {
  const socket = this;
  socket.destroy();
  socket.emit('agentRemove');
  socket.removeListener('error', freeSocketErrorListener);
};

const preventThrowOutError = (socket) => {
  socket.removeListener('error', freeSocketErrorListener);
  socket.on('error', freeSocketErrorListener);
};

const toNumber = x => {
  x = Number(x);
  return x >= 0 ? x : false;
};

const isPipeName = (s) => {
  return typeof s === 'string' && toNumber(s) === false;
};
// 暂时不支持 IPv6，尽量使用域名
const getHost = ({ [HTTP_REQ_FLAG]: isHttp, port, path, host, hostname, headers }) => {
  if (!isHttp) {
    return isPipeName(path) ? path : `${host}${port ? `:${port}` : ''}`;
  }
  if (/^https?:\/\/[^/]/.test(path)) {
    return parseUrl(path).host;
  }
  host = headers && headers.host;
  if (host) {
    return host;
  }
  host = hostname || host;
  if (!host || !port || host.includes(':')) {
    return host || 'localhost';
  }
  return `${host}:${port}`;
};

const getServername = (options) => {
  return options.servername || getHost(options).split(':', 1)[0];
};

exports.getHost = getHost;

exports.getAgent = (options, reqOpts) => {
  const key = getCacheKey(options);
  let agent = agents.get(key);
  if (reqOpts) {
    reqOpts._tunnelProxyHeaders = Object.assign({}, options.headers, { 'x-whistle-policy': 'intercept' });
  }
  if (!agent) {
    const type = options.isHttps ? 'httpsOverHttp' : 'httpOverHttp';
    agent = new tunnel[type]({
      proxy: options,
      rejectUnauthorized: false,
      servername: options.servername || getServername(reqOpts),

    });
    agents.set(key, agent);
    agent.on('free', preventThrowOutError);
    const { createSocket } = agent;
    agent.createSocket = function(opts, cb) {
      createSocket.call(this, opts, (socket) => {
        socket.setTimeout(IDLE_TIMEOUT, () => {
          socket.destroy();
        });
        cb(socket);
      });
    };
  }
  return agent;
};

const getPort = (handler, callback) => {
  const server = createServer({ pauseOnConnect: true });
  server.once('error', () => {
    if (++curPort % 5 === 0) {
      ++curPort;
    }
    getPort(handler, callback);
  });
  server.listen({
    port: curPort,
    host: LOCAL_ADDRESS,
    exclusive: true,
  }, () => {
    server.on('connection', handler);
    callback(curPort);
  });
};

exports.LOCAL_ADDRESS = LOCAL_ADDRESS;
exports.getPort = getPort;

const normalizeArgs = (args) => {
  let arr;

  if (args.length === 0) {
    arr = [{}, null];
    return arr;
  }
  const arg0 = args[0];
  if (Array.isArray(arg0)) {
    return arg0;
  }
  let options = {};
  if (typeof arg0 === 'object' && arg0 !== null) {
    // (options[...][, cb])
    options = arg0;
  } else if (isPipeName(arg0)) {
    // (path[...][, cb])
    options.path = arg0;
  } else {
    // ([port][, host][...][, cb])
    options.port = arg0;
    if (args.length > 1 && typeof args[1] === 'string') {
      options.host = args[1];
    }
  }

  const cb = args[args.length - 1];
  if (typeof cb !== 'function') { arr = [options, null]; } else { arr = [options, cb]; }

  return arr;
};

exports.normalizeArgs = normalizeArgs;


exports.formatPatterns = (list) => {
  if (list && typeof list === 'string') {
    list = list.split(/[\s,\s]/);
  } else if (!Array.isArray(list)) {
    return;
  }
  let result;
  list.forEach((domain) => {
    if (typeof domain !== 'string') {
      return;
    }
    domain = domain.trim();
    if (/^[*.\w-]+(:\d+)?$/.test(domain)) {
      if (!RegExp.$1) {
        domain = `${domain}(?::\\d+)?`;
      }
      domain = domain.replace(/\./g, '\\$&')
        .replace(/\*+/, stars => `[${stars === '*' ? '' : '.'}\\da-z_-]*`);
      result = result || [];
      if (result.indexOf(domain) === -1) {
        result.push(domain);
      }
    }
  });
  return result && new RegExp(`^(?:${result.join('|')})$`, 'i');
};

exports.checkPatterns = (host, { allowlist, blocklist }) => {
  if (!host) {
    return !allowlist;
  }
  if (allowlist) {
    return allowlist.test(host) && (!blocklist || !blocklist.test(host));
  }
  return !blocklist || !blocklist.test(host);
};
