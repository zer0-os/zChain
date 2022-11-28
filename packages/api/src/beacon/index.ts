import {Api} from "./routes/index.js";

// NOTE: Don't export server here so it's not bundled to all consumers

export * as routes from "./routes/index.js";
export {getClient} from "./client/index.js";
export {Api};

// Declare namespaces for CLI options
export type ApiNamespace = keyof Api;
const allNamespacesObj: {[K in keyof Api]: true} = {
  node: true,
};
export const allNamespaces = Object.keys(allNamespacesObj) as ApiNamespace[];
