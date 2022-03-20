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
RUN yarn install
RUN yarn build