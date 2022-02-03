FROM node:current
WORKDIR /src/zchain

RUN npm cache clean -f; \
    npm install n -g; \
    n stable; \
    npm update -g; \
    npm install npm@latest -g;

COPY package.json ./
RUN npm install
COPY . .
RUN cd packages/zchain-core && npm install
RUN cd packages/zchain-core && npm run build