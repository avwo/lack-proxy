const http = require('http');
const https = require('https');
const http2 = require('http2');
const { setProxy } = require('../');

const PROXY_OPTIONS = {
  host: '127.0.0.1',
  port: 8899,
};
// 动态设置代理
// setProxy((options) => {
//   return Object.assign(options, PROXY_OPTIONS);
// });

// 设置固定代理
setProxy(PROXY_OPTIONS);
const client = http2.connect('https://ke.qq.com:443');
client.on('error', (err) => console.error(err)); // eslint-disable-line

const req = client.request({ ':path': '/' });

req.on('response', (headers) => {
  Object.keys(headers).forEach(name =>  console.log(`${name}: ${headers[name]}`)); // eslint-disable-line
});

req.setEncoding('utf8');
let data = '';
req.on('data', (chunk) => { data += chunk; });
req.on('end', () => {
  console.log(`\n${data}`); // eslint-disable-line
  client.close();
});
req.end();


const httpClient = http.request('http://ke.qq.com', (res) => {
  console.log(res.statusCode); // eslint-disable-line
});
httpClient.on('error', console.error); // eslint-disable-line
httpClient.end();

const httpsClient = https.request('https://ke.qq.com', (res) => {
  console.log(res.statusCode); // eslint-disable-line
});
httpsClient.on('error', console.error); // eslint-disable-line
httpsClient.end();
