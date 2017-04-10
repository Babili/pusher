require('coffee-script').register();
var Raven = require("raven");
var path  = require("path");
var App   = require("./app/app");

var configPath = path.join(__dirname, "config", "config");
var env        = process.env.NODE_ENV || "development";
var config     = require(configPath)[env];
var app        = new App(config);

if (config.sentryDsn) {
  Raven.config(config.sentryDsn).install();
}

app.start(function(err) {
  if (err) throw err;
});
