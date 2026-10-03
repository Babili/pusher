# Changelog

## 2.1.1 [2026-10-03]

* Publish Debian hardened (`-hardened`) and distroless (`-distroless`) Docker images
* Move `@sentry/node` to production dependencies, as it is loaded at startup

## 2.1.0 [2026-10-03]

* Reject socket connections when the platform public key cannot be fetched
* Expire user presence in Redis after `PRESENCE_TTL_SECONDS` (60 seconds by default) when it is no longer refreshed, e.g. after a crash
* Send the HSTS header from the first handshake and register its listener once
* Fix the removal of disconnected sockets
* Fix Redis error logging
* Fix graceful shutdown on `SIGINT` and `SIGTERM`, including in Docker containers
* Add unit and integration tests, run in the GitHub Actions workflow
* Replace the `happn` git dependency with `@crepesourcing/happn` `1.0.1` from npm
* Add a GitHub Actions workflow to lint, build and push Docker images
* Stop building `linux/arm/v7` images, as Node.js 24 has no official image for this platform
* Upgrade Node.js from `22.6.0` to `24.21.0`
* Upgrade dependencies:
    * `amqplib` from `0.10.9` to `2.2.0`
    * `engine.io` from `6.6.5` to `6.6.11` (security fixes)
    * `redis` from `5.5.5` to `6.3.0`
    * `socket.io` from `4.8.3` to `4.8.4`
    * `uuid` from `11.1.0` to `14.0.2`
* Upgrade dev dependencies:
    * `@sentry/node` from `9.47.1` to `11.4.0`
    * `eslint` from `9.39.2` to `10.12.0`
    * `eslint-plugin-n` from `17.23.2` to `18.4.1`
    * `eslint-plugin-promise` from `7.2.1` to `7.3.0`
    * `eslint-plugin-unused-imports` from `4.1.4` to `4.4.1`
* Add `@eslint/js` and `socket.io-client` dev dependencies
* Remove unused `eslint-plugin-import` dev dependency

## 2.0.3 [2026-01-15]

* Fix JWT token exchange handshake
* Add configurable JWT verification options (audience and algorithms)
* Remove `socketio-jwt` dependency
* Upgrade dependencies:
    * `amqplib` from `0.10.8` to `0.10.9`
    * `jsonwebtoken` from `9.0.2` to `9.0.3`
    * `socket.io` from `4.8.1` to `4.8.3`
    * `winston` from `3.17.0` to `3.19.0`
* Upgrade dev dependencies:
    * `@sentry/node` from `9.25.1` to `9.47.1`
    * `eslint` from `9.28.0` to `9.39.2`
    * `eslint-plugin-import` from `2.31.0` to `2.32.0`
    * `eslint-plugin-n` from `17.19.0` to `17.23.2`


## 2.0.2 [2025-06-04]

* Upgrade node to `22.6.0`
* Upgrade ESLint to `9.28.0`
* Upgrade dependencies:
    * `amqplib` from `0.10.3` to `0.10.8`
    * `jsonwebtoken` from `9.0.0` to `9.0.2`
    * `node-fetch` from `3.3.1` to `3.3.2`
    * `redis` from `4.6.7` to `5.5.5`
    * `socket.io` from `4.7.0` to `4.8.1`
    * `socket.io` from `4.7.0` to `4.8.1`
    * `uuid` from `9.0.0` to `11.1.0`
    * `winston` from `3.9.0` to `3.17.0`
* Support for Tokens exchanged through the handshake payload (instead of the query parameters)
* Deprecation: Use of query parameters to exchange the handshake token must be replaced with the `auth` attribute.

## 2.0.1 [2023-06-23]

* Parse the event's timestamp to always send an ISO8701 formatted string in `createdAt`
* Upgrade docker to `node:18.13-buster`
* Upgrade dependencies

## 2.0.0 [2023-02-21]

* Rewrite the project with javascript (instead of coffeescript)
* Update dependencies
    * `uuid` to `9.0.0`
    * `jsonwebtoken` to `9.0.0`
    * `amqplib` to `0.10.3`
    * `socket.io` to `4.6.1`
    * `redis` to `4.6.4`
    * `node` to `19.6.1`
* Replace `raven` with `sentry`
* Return Strict-Transport-Security header when the environment variable `HSTS_HEADER` is set

## 1.1.1 [2021-11-07]

* Make AMQP scheme configurable

## 1.1.0 [2021-08-04]

* Upgrade`socket.io` to `4.1.3`.
