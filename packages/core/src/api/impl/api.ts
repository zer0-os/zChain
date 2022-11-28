import {Api} from "api"
import {IApiOptions} from "../options.js";
import {ApiModules} from "./types.js";
import {getNodeApi} from "./node/index.js";

export function getApi(opts: IApiOptions, modules: ApiModules): Api {
  return {
    node: getNodeApi(opts, modules)
  };
}
