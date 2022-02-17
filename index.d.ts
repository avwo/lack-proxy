/// <reference types="node" />


type ProxyOptions = {
  host: string,
  port: number,
  headers?: object,
  filterRequest?: (opts?: object, isHttps?: boolean) => boolean,
  allowlist?: string | string[],
  blocklist?: string | string[],
  socket?: false | {
    host: string,
    port: number,
    headers?: object,
  },
};

export type ProxyFilter = (options?: object, isHttps?: boolean) => ProxyOptions | undefined | null | void;

export type Result = ProxyOptions | undefined | null | void | ProxyFilter;

export type Options = ProxyOptions | ProxyFilter;

export type ReqOpts = string | {
  host: string,
  [propName: string]: any,
};

export interface socket {
  setUrl: (opts: ReqOpts, url: string) => ReqOpts,
  getHeaders: () => Object,
  setHeaders: (opts: ReqOpts, headers: object) => ReqOpts,
  removeHeaders: (opts: ReqOpts) => void,
};

export type getProxy = (opts?: object, isHttps?: boolean) => Result;
export type setProxy = (options: Options) => Result;
export type proxy = setProxy;
export type removeProxy = () => void;
export type hasProxy = () => Result;
