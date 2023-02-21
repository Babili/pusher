# Changelog

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
