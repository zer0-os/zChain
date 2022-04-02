FROM node:current
RUN ["apt-get", "update"]
RUN ["apt-get", "install", "-y", "vim"]

WORKDIR /src/zchain

RUN npm cache clean -f; \
    npm install n -g; \
    n stable; \
    npm update -g; \
    npm install npm@latest -g;

COPY package.json ./
#RUN yarn install
COPY . .
RUN yarn set version 1.22.18
RUN yarn install
RUN yarn build
RUN cd packages/zchain-core && yarn link && cd ../../
RUN cd packages/meow-cli && yarn link && cd ../../
RUN cd apps/meow && yarn link zchain-core && yarn link meow-cli