yarn install
yarn build
cd packages/zchain-core && yarn link && cd ../../
cd packages/meow-cli && yarn link && cd ../../
cd apps/meow && yarn link zchain-core && yarn link meow-cli