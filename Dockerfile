FROM node:6-onbuild

ARG APP_ENV=development
ENV NODE_ENV ${APP_ENV}

VOLUME "/usr/src/app/node_modules"

CMD ["npm", "start"]
