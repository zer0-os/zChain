import {IChainForkConfig} from "@lodestar/config";
import {Api, ReqTypes, routesData, getReturnTypes, getReqSerializers} from "../routes/node.js";
import {ServerRoutes, getGenericJsonServer} from "../../utils/server/index.js";

export function getRoutes(api: Api): ServerRoutes<Api, ReqTypes> {
  // All routes return JSON, use a server auto-generator
  const serverRoutes = getGenericJsonServer<Api, ReqTypes>(
    {routesData, getReturnTypes, getReqSerializers},
    api
  );

  return {
    ...serverRoutes,
  };
}
