require('coffeescript/register');
var Sentry = require("@sentry/node");
var path   = require("path");
var App    = require("./app/app");

var configPath = path.join(__dirname, "config", "config");
var env        = process.env.NODE_ENV || "development";
var config     = require(configPath)[env];
var app        = new App(config);

if (config.sentryDsn) {
  Sentry.init({
    dsn: config.sentryDsn
  });
}

app.start(function(err) {
  if (err) throw err;
});
