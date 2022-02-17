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

type SetProxy = (options: Options) => Result;

export type ProxyFilter = (options?: object, isHttps?: boolean) => ProxyOptions | undefined | null | void;

export type Result = ProxyFilter | ProxyOptions | undefined | null | void;

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
}

export const getProxy: (opts?: object, isHttps?: boolean) => Result;
export const setProxy: (options: Options) => Result;
export const proxy: SetProxy;
export const removeProxy: () => void;
export const hasProxy: () => Result;
