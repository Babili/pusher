# Babili Pusher <a href="https://github.com/Babili/pusher/actions/workflows/docker-publish.yml">![Build status](https://github.com/Babili/pusher/actions/workflows/docker-publish.yml/badge.svg?branch=main)</a>


Babili is a real-time chat backend built with Ruby, Rails, Node, Socket.io and Docker.

See https://github.com/Babili/babili for the Getting started guide

Clockwork is a small trigger service to replace cron in a Docker environment.

## Environment variables

| Option | Default Value | Type | Required? | Description  | Example |
| ---- | ----- | ------ | ----- | ------ | ----- |
| `PORT` | `""`| String | Required | The websocket port | `"3000"` |
| `NODE_ENV` | `""`| String | Required | The node environment | `"development"` |
| `REDIS_URL` | `""`| String | Required | The websocket port | `"redis://redis/"` |
| `PRESENCE_TTL_SECONDS` | `60`| Integer | Optional | How long a user stays present in Redis without being refreshed, e.g. after a crash of the pusher | `"60"` |
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

## Docker images

Three variants of the image are published for `linux/amd64` and `linux/arm64`, for each environment (`production`, `qa` and `development`):

| Variant | Dockerfile | Tags | Description |
| ---- | ----- | ------ | ----- |
| Default | `Dockerfile` | `<env>-latest`, `<env>-<sha>` | Full Debian image with development dependencies |
| Debian hardened | `Dockerfile.hardened` | `<env>-latest-hardened`, `<env>-<sha>-hardened` | Slim Debian image with production dependencies only, without npm, Yarn, Corepack and setuid binaries, running as `node` |
| Distroless | `Dockerfile.distroless` | `<env>-latest-distroless`, `<env>-<sha>-distroless` | Distroless image with production dependencies only, without shell nor package manager, running as `nonroot` |

The hardened and distroless images can run with a read-only root filesystem and without capabilities:

```
$ docker run --read-only --cap-drop ALL --security-opt no-new-privileges babili/pusher:production-latest-distroless
```

Their base images are pinned by digest: update the digests when upgrading Node.js.

## Build and deploy

Every push to `main` is linted, built and pushed to Docker Hub by the GitHub Actions workflow `.github/workflows/docker-publish.yml`. It requires the repository secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`.

Builds can also be deployed manually with:

```
$ docker login -u="$DOCKER_USERNAME" -p="$DOCKER_PASSWORD";
$ docker buildx build --platform linux/arm64/v8,linux/amd64 --pull --build-arg APP_ENV=production -t babili/pusher:production-latest -t babili/pusher:production-`git rev-parse HEAD` . && \
  docker push babili/pusher:production-`git rev-parse HEAD` && \
  docker push babili/pusher:production-latest && \
  docker buildx build --platform linux/arm64/v8,linux/amd64 --pull --build-arg APP_ENV=qa -t babili/pusher:qa-latest -t babili/pusher:qa-`git rev-parse HEAD` . && \
  docker push babili/pusher:qa-`git rev-parse HEAD` && \
  docker push babili/pusher:qa-latest && \
  docker buildx build --platform linux/arm64/v8,linux/amd64 --pull --build-arg APP_ENV=development -t babili/pusher:development-latest -t babili/pusher:development-`git rev-parse HEAD` . && \
  docker push babili/pusher:development-`git rev-parse HEAD` && \
  docker push babili/pusher:development-latest
```
