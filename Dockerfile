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
COPY . .
RUN yarn set version 1.22.18
RUN yarn install
RUN yarn build


RUN cd packages/meow-cli && chmod +x build/src/cli.js && npm link --force && cd ../../
