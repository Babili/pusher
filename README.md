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
| `RABBITMQ_HOST` | `""`| String | Required | | `"rabbitmq"` |
| `RABBITMQ_PORT` | `""`| String | Required | | `"5672"` |
| `RABBITMQ_USER` | `""`| String | Required | | `"root"` |
| `RABBITMQ_PASSWORD` | `""`| String | Required | | `"root"` |
| `RABBITMQ_QUEUE_NAME` | `""`| String | Required | | `"babili-event-pusher"` |

## Contributors

Babili is the product of the Collaboration of the Spin42 team (http://spin42.com) and the Commuty one (https://www.commuty.net).

