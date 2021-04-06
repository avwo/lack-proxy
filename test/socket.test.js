const net = require('net');
const { setProxy, attachData, attachHeaders } = require('../');

const PROXY_OPTIONS = {
  host: '127.0.0.1',
  port: 8899,
  filterRequest: (options) => {
    console.log(options.attachData, options.attachHeaders); // eslint-disable-line
    return true;
  },
};

// 动态设置代理
setProxy((options) => {
  return Object.assign(options, PROXY_OPTIONS);
});

// 设置固定代理
// setProxy(PROXY_OPTIONS);

(async () => {
  const socket = net.connect({
    host: attachData(attachHeaders(attachData('ke.qq.com', { a: 123 }, { test: 234 }), { abbbbbb: 99999 }), { rrrr: 123 }),
    port: 80,
  });
  socket.write([
    'GET / HTTP/1.1',
    'Host: ke.qq.com',
    '\r\n',
  ].join('\r\n'));
  socket.on('error', console.error); // eslint-disable-line
  socket.on('data', (data) => {
    console.log(`${data}`); // eslint-disable-line
  });
})();
