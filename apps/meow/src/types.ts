import * as Y from 'yjs';

// meow public yDocs (eg. network info is shared among everyone)
export interface MeowPublicYDocs {
  doc: Y.Doc // root y.doc
  networks: Y.Map<unknown>
}

export interface MeowPrivateYDocs {
  doc: Y.Doc // root y.doc
  followingZIds: Y.Map<unknown>
  followingChannels: Y.Map<unknown>
}

export interface TwitterConfig {
  appKey: string,
  appSecret: string,
  accessToken: string,
  accessSecret: string
}

export interface Network {
  address: string,
  signature: string,
  channels: string[]
}

export interface TwitterAuthLink {
  oauth_token: string;
  oauth_token_secret: string;
  oauth_callback_confirmed: string;
  url: string;
}