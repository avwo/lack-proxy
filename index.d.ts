/// <reference types="node" />

export type FilterRequest = (opts?: object, isSocket?: boolean) => boolean;

type ProxyOptions = {
  host: string,
  port: number,
  headers?: object,
  servername?: string,
  filterRequest?: FilterRequest,
  allowlist?: string | string[],
  blocklist?: string | string[],
  socket?: false | {
    host: string,
    port: number,
    headers?: object,
  },
};

type SetProxy = (options: Options) => Result;

export type ProxyFilter = (options: object, isHttps?: boolean) => ProxyOptions;

export type Result = ProxyFilter | ProxyOptions;

export type Options = ProxyOptions | ProxyFilter;

export type ReqOpts = string | {
  host: string,
  [propName: string]: any,
};

export const socket: {
  setUrl: (opts: ReqOpts, url: string) => ReqOpts,
  getHeaders: () => Object,
  setHeaders: (opts: ReqOpts, headers: object) => ReqOpts,
  removeHeaders: (opts: ReqOpts) => void,
};

export const getProxy: (opts?: object, isHttps?: boolean) => Result;
export const setProxy: SetProxy;
export const proxy: SetProxy;
export const removeProxy: () => void;
export const hasProxy: () => Result;
