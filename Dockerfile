FROM node:18.13-buster

RUN mkdir -p /usr/src/app && \
  groupadd -r babili && useradd -r -g babili babili && \
  mkdir -p /home/babili && chown babili:babili /home/babili && \
  chown -R babili:babili /usr/src/app

WORKDIR /usr/src/app
USER babili

COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm i --no-save

COPY app app
COPY config config
COPY babili_pusher.js babili_pusher.js

ARG APP_ENV=development
ENV NODE_ENV ${APP_ENV}

CMD ["npm", "start"]
