FROM node:6-onbuild

ARG APP_ENV=development
ENV NODE_ENV ${APP_ENV}

CMD ["npm", "start"]
