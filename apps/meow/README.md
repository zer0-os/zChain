# Meow

Meow is a twitter like (but peer to peer) application built on top of `zchain`.

## Running

To run the application follow these steps:

1. Go to root, run `npm install`
2. `cd packages/zchain-core`, `npm i && npm run build`
3. Now we need to "link" our local zchain project we just built. In `packages/zchain-core`, run `npm link`.
4. Now go to `apps/meow`, run `npm install`.
5. After installation, run `npm link`/`npm link zchain` to link the zchain project.
6. Now you can execute the application using `npm run dev`, this will run `app.ts` using `ts-node`.