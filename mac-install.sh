#!/usr/local/bin/node

yarn install
yarn build

# register zchain-core, apps/meow & meow-cli packages
cd packages/zchain-core
yarn link
cd ../../

cd apps/meow
yarn link
cd ../../

cd packages/meow-cli
yarn link
sudo npm link --force # this links the cli bin directory "globally"
cd ../../

# link packages/** to meow-app
cd apps/meow
yarn link zchain-core
yarn link meow-cli