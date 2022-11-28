import {IChainForkConfig} from "@lodestar/config";
import {Api} from "../routes/index.js";
import {IHttpClient, HttpClient, HttpClientOptions, HttpClientModules} from "../../utils/client/index.js";

import * as node from "./node.js";

type ClientModules = HttpClientModules & {
  config: IChainForkConfig;
  httpClient?: IHttpClient;
};

/**
 * REST HTTP client for all routes
 */
export function getClient(opts: HttpClientOptions, modules: ClientModules): Api {
  const {config} = modules;
  const httpClient = modules.httpClient ?? new HttpClient(opts, modules);

  return {
    node: node.getClient(config, httpClient)
  };
}
