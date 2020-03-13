var plugin = {
    ruleId: "MyRule-001",
    name: "Check if the proxy name starts with B2B- or B2C-",
    message: "The proxy name should start with B2B- or B2C-.",
    fatal: false,
    severity: 2, //error
    nodeType: "Bundle",
    enabled: true
  },
  debug = require("debug")("bundlelinter:" + plugin.name);

var onBundle = function(bundle, cb) {
  var hadError = false;
  var proxyName = bundle.getName();

  if (!proxyName.startsWith("B2B-") && !proxyName.startsWith("B2C-")) {
    bundle.addMessage({
      plugin,
      message: "API Proxy name (" + proxyName + ") should start with B2B-* or B2C-*"
    });
    hadError = true;
  }

  if (typeof(cb) == 'function') {
    cb(null, hadError);
  }
  return hadError;
};

module.exports = {
  plugin,
  onBundle
};
