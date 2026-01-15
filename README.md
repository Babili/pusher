# Babili Pusher <a href="https://travis-ci.org/Babili/pusher">![Build status](https://travis-ci.org/Babili/pusher.svg?branch=master)</a>


Babili is a real-time chat backend built with Ruby, Rails, Node, Socket.io and Docker.

See https://github.com/Babili/babili for the Getting started guide

Clockwork is a small trigger service to replace cron in a Docker environment.

## Environment variables

| Option | Default Value | Type | Required? | Description  | Example |
| ---- | ----- | ------ | ----- | ------ | ----- |
| `PORT` | `""`| String | Required | The websocket port | `"3000"` |
| `NODE_ENV` | `""`| String | Required | The node environment | `"development"` |
| `REDIS_URL` | `""`| String | Required | The websocket port | `"redis://redis/"` |
| `ENGINE_HOST` | `""`| String | Required | The engine (container) hostname | `"3000"` |
| `ENGINE_PORT` | `""`| String | Required | The engine port | `"3000"` |
| `RABBITMQ_SCHEME` | `"amqp"`| String | Required | | `"amqps"` |
| `RABBITMQ_HOST` | `""`| String | Required | | `"rabbitmq"` |
| `RABBITMQ_PORT` | `""`| String | Required | | `"5672"` |
| `RABBITMQ_USER` | `""`| String | Required | | `"root"` |
| `RABBITMQ_PASSWORD` | `""`| String | Required | | `"root"` |
| `RABBITMQ_QUEUE_NAME` | `""`| String | Required | | `"babili-event-pusher"` |
| `JWT_ALGORITHMS` | `"RS256"`| String | Optional |  The list of allowed JWT algorithms for JWT token verification | `"RS256, RS512"` |
| `JWT_AUDIENCE` | `""`| String | Optional | The allowed JWT audience for JWT token verification | `"user"` |

## Contributors

Babili is the product of the Collaboration of the Spin42 team (http://spin42.com) and the Commuty one (https://www.commuty.net).

## Build and deploy

Since Travis is not supported, builds can be deployed with:

```
$ docker login -u="$DOCKER_USERNAME" -p="$DOCKER_PASSWORD";
$ docker build --platform linux/amd64 --pull --build-arg APP_ENV=production -t babili/pusher:production-latest -t babili/pusher:production-`git rev-parse HEAD` . && \
  docker push babili/pusher:production-`git rev-parse HEAD` && \
  docker push babili/pusher:production-latest && \
  docker build --platform linux/amd64 --pull --build-arg APP_ENV=qa -t babili/pusher:qa-latest -t babili/pusher:qa-`git rev-parse HEAD` . && \
  docker push babili/pusher:qa-`git rev-parse HEAD` && \
  docker push babili/pusher:qa-latest && \
  docker build --platform linux/amd64 --pull --build-arg APP_ENV=development -t babili/pusher:development-latest -t babili/pusher:development-`git rev-parse HEAD` . && \
  docker push babili/pusher:development-`git rev-parse HEAD` && \
  docker push babili/pusher:development-latest
```
