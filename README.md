# lack-proxy
[![NPM version](https://img.shields.io/npm/v/lack-proxy.svg?style=flat-square)](https://npmjs.org/package/lack-proxy)
[![node version](https://img.shields.io/badge/node.js-%3E=_8-green.svg?style=flat-square)](http://nodejs.org/download/)
[![npm download](https://img.shields.io/npm/dm/lack-proxy.svg?style=flat-square)](https://npmjs.org/package/lack-proxy)
[![NPM count](https://img.shields.io/npm/dt/lack-proxy.svg?style=flat-square)](https://www.npmjs.com/package/lack-proxy)
[![License](https://img.shields.io/npm/l/lack-proxy.svg?style=flat-square)](https://www.npmjs.com/package/lack-proxy)

lack-proxy 用于给 Node 程序设置全局 HTTP 代理，可以将 Node 进程里面的指定 TCP 请求代理到 Whistle 等抓包调试代理。

### 安装
``` sh
npm i --save-dev lack-proxy
```

### 使用
> 建议在程序入口设置

``` js
const lack = require('lack-proxy');
```
1. 设置全局HTTP代理：
    ``` js
    lack.proxy({
        host: '127.0.0.1',
        port: '8899',
        // allowlist: ['ke.qq.com', '*.ke.qq.com'],
        // blocklist: ['fudao.qq.com', '*.fudao.qq.com'],
        // filterRequest: (options, isSocket) => {
        //    return true || false;
        // }, // 可选，精确过滤请求
        // servername, // 可选，参见Node的HTTPS文档，设置SNI
        // headers, // 可选，设置代理请求头
    });
    ```
    > 程序里面的所有web请求（HTTP、HTTPS、WebSocket）都会代理到本地的 `8899` 端口的代理服务
2. 根据请求参数动态设置
    ``` js
    lack.proxy((options) => {
        // 根据请求options动态设置代理
        return {
            host: '127.0.0.1',
            port: '8899',
            headers: options.headers,
            // allowlist: ['ke.qq.com', '*.ke.qq.com'],
            // blocklist: ['fudao.qq.com', '*.fudao.qq.com'],
            // filterRequest: (options, isSocket) => {
            //    return true || false;
            // }, // 可选，精确过滤请求
            // servername, // 可选，参见Node的HTTPS文档，设置SNI
        };
    });
    ```
3. 有关例子可以参见[测试用例](./test)。
