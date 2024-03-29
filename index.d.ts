/// <reference types="node" />

export type FilterRequest = (opts?: any, isSocket?: boolean) => boolean;

interface ProxyOptions {
  host: string;
  port: number;
  headers?: any;
  servername?: string;
  filterRequest?: FilterRequest;
  allowlist?: string | string[];
  blocklist?: string | string[];
  socket?: false | {
    host: string;
    port: number;
    headers?: any;
  };
}

type SetProxy = (options: Options) => Result;

export type ProxyFilter = (options: any, isHttps?: boolean) => ProxyOptions;

export type Result = ProxyFilter | ProxyOptions;

export type Options = ProxyOptions | ProxyFilter;

export type ReqOpts = string | {
  host: string;
  [propName: string]: any;
};

export const socket: {
  setUrl(opts: ReqOpts, url: string): ReqOpts;
  getHeaders(): any;
  setHeaders(opts: ReqOpts, headers: any): ReqOpts;
  removeHeaders(opts: ReqOpts): void;
};

export const getProxy: (opts?: any, isHttps?: boolean) => Result;
export const setProxy: SetProxy;
export const proxy: SetProxy;
export const removeProxy: () => void;
export const hasProxy: () => Result;
