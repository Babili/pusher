# Changelog

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
