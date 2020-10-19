# lack-proxy
[![NPM version](https://img.shields.io/npm/v/lack-proxy.svg?style=flat-square)](https://npmjs.org/package/lack-proxy)
[![node version](https://img.shields.io/badge/node.js-%3E=_8-green.svg?style=flat-square)](http://nodejs.org/download/)
[![npm download](https://img.shields.io/npm/dm/lack-proxy.svg?style=flat-square)](https://npmjs.org/package/lack-proxy)
[![NPM count](https://img.shields.io/npm/dt/lack-proxy.svg?style=flat-square)](https://www.npmjs.com/package/lack-proxy)
[![License](https://img.shields.io/npm/l/lack-proxy.svg?style=flat-square)](https://www.npmjs.com/package/lack-proxy)

lack-proxy 可以给程序动态设置全局HTTP代理或根据请求参数设置（建议在程序入口设置）。

### 安装
``` sh
npm i -g lack-proxy
```

### 使用
``` js
const lack = require('lack-proxy');
```
1. 设置全局HTTP代理：
    ``` js
    lack.proxy({
        host: '127.0.0.1',
        port: '8899',
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
            // servername, // 可选，参见Node的HTTPS文档，设置SNI
        };
    });
    ```
3. 代理socket请求

    上述只能配置默认只对 http 或 https 请求生效，如果想将普通 TCP/Socket 请求也通过指定代理转发，需需要显式告诉 lack-proxy 可能要代理该 socket 连接，如：
    ``` txt
    // 正常请求
    const socket = net.connect({
        host: '127.0.0.1',
        port: 8080,
    });
    ```
    需要改成：

    ``` 
    const { enableProxy } = require('lack-proxy');

    const socket = net.connect(enableProxy({
        host: '127.0.0.1',
        port: 8080,
    }));

    或
    const socket = net.connect({
        host: enableProxy('127.0.0.1'),
        port: 8080,
    });
    ```
    上述配置如果不设置代理，lack-proxy会自动处理，相当于正常请求.
有关例子可以参见[测试用例](./test)。
