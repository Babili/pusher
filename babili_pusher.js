require('coffee-script').register();
var raven = require("raven");
var path  = require("path");
var App   = require("./app/app");

var configPath = path.join(__dirname, "config", "config");
var env        = process.env.NODE_ENV || "development";
var config     = require(configPath)[env];
var ravenClient = new raven.Client(config.sentryDsn);
// ravenClient.patchGlobal();

var app        = new App(config, ravenClient);

app.start(function(err) {
  if (err) throw err;
});
