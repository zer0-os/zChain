#!/usr/local/bin/node

yarn install
yarn build

cd packages/cli
chmod +x build/src/cli.js # give necessary permission to the cli file
npm link --force # this links the cli bin directory "globally"
