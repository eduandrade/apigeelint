# How to develop new plugins for apigeelint

In this step-by-step guide, I'll show how to implement new plugins for apigeelint so you can create your own Apigee coding rules. This can be useful in case you or your company wants to enforce some best practices, like having the same naming convention for all proxies, making sure all proxies have versioning in the base path, to guarantee that the proxies are using some mandatory security policies like access token or API key validation, etc. Apigeelint is even more powerful if you include it as a required step in your CI/CD pipeline.

If you don't know what apigeelint is I strongly recommend that you take a look at the [GitHub](https://github.com/apigee/apigeelint) or [NPM](https://www.npmjs.com/package/apigeelint) pages. Here's a short description from the official docs:

> Static code analysis for Apigee proxy and sharedflow bundles to encourage API developers to use best practices and avoid anti-patterns.

> This utility is intended to capture the best practices knowledge from across Apigee including our Global Support Center team, Customer Success, Engineering, and our product team in a tool that will help developers create more scalable, performant, and stable API bundles using the Apigee DSL.

## What is a plugin?

In the apigeelint structure a plugin is where each rule is implemented. A few examples of existing plugins are:

 - checkFileName.js (*Check that file names correspond to policy display names.*)
 - checkUnattachedPolicies.js (*Unattached policies are dead code. They should be removed from bundles before releasing the bundle to production.*)
 - checkForEmptySteps.js (*Empty steps clutter a bundle. Performance is not degraded.*)

The complete list of all plugins can be accessed [here](https://github.com/apigee/apigeelint#rules).

The main goal of a plugin is to look for problematic patterns or enforcement of conventions. Each plugin should perform its logic using any of the available Apigee entities, like:

 - Proxy Bundle
 - Steps
 - Conditions
 - Proxy Endpoints
 - Target Endpoints
 - Resources
 - Policies
 - Fault Rules
 - Default Fault Rules

For more in-depth technical details check the documentation [here](https://github.com/apigee/apigeelint/blob/master/lib/package/README.md) and [here](https://github.com/apigee/apigeelint/blob/master/lib/package/plugins/README.md).

## Getting the source code

If you plan to create a plugin that can be used by other developers then you are encouraged to fork the repository, clone it, create the new plugin and then open a pull request to incorporate it into the official repository.

- For information about forking a repository: [https://help.github.com/en/github/getting-started-with-github/fork-a-repo](https://help.github.com/en/github/getting-started-with-github/fork-a-repo)

In the case that you need to create a plugin that is only useful for you or your company then you can clone the repository, create the new plugin and then push the changes to your personal or internal repository.

- For information about cloning a repository: [https://help.github.com/en/github/creating-cloning-and-archiving-repositories/cloning-a-repository](https://help.github.com/en/github/creating-cloning-and-archiving-repositories/cloning-a-repository)

For example, to clone the official repository open your Git terminal and type:
```
git clone https://github.com/apigee/apigeelint.git
cd apigeelint
npm install
```

In the directory where the code was cloned you'll see the following structure:
```
.eslintrc.json
.gitignore
.jshintrc
CHANGELOG.md
cli.js
CONTRIBUTING.md
function.js
lib
LICENSE
node_modules
package-lock.json
package.json
README.md
test
```

Apigeelint is a Node.js tool, so you'll need to have at least some basic knowledge of [Node.js](https://nodejs.org/), [NPM](https://docs.npmjs.com/), and [Javascript](https://developer.mozilla.org/en-US/docs/Web/JavaScript).

## Creating a new plugin

Now that you have the source code on your computer it's time to start developing our first plugin. Keep in mind that all plugin files should reside in the `lib\package\plugins` directory and all of them are executed automatically.

### Example 1 - checkProxyNamePrefix.js

Let's say that we want to enforce that all proxy names start with some kind of identifier, for example, `B2B-*` for *Business to Business* proxies and `B2C-*` for *Business to Consumer* proxies. In this case, we are going to create a new plugin called `checkProxyNamePrefix.js`.

Here's the code for `lib\package\plugins\checkProxyNamePrefix.js`:

```javascript
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
```

To test it we can use the sample proxy located in the directory `test\fixtures\resources\sampleProxy\24Solver` using the following command:
```
node cli.js -f table.js -s test\fixtures\resources\sampleProxy\24Solver\apiproxy
```

And we can see the error that our new plugin generated in the output:

```
║ Line     │ Column   │ Type     │ Message                                                │ Rule ID              ║
╟──────────┼──────────┼──────────┼────────────────────────────────────────────────────────┼──────────────────────╢
║ 0        │ 0        │ error    │ API Proxy name (TwentyFour) should start with          │ MyRule-001           ║
║          │          │          │ B2B-* or B2C-*                                         │                      ║
```

### Example 2 - checkPreFlowSpikeArrest.js

In this plugin we want to make sure that all our proxies are using the [Spike Arrest](https://docs.apigee.com/api-platform/reference/policies/spike-arrest-policy) policy in the [PreFlow](https://docs.apigee.com/api-platform/fundamentals/what-are-flows) section.

Here's the code for `lib\package\plugins\checkPreFlowSpikeArrest.js`:

```javascript
var plugin = {
    ruleId: "MyRule-002",
    name: "Check if the Spike Arrest policy is being used in the PreFlow section",
    message: "Spike Arrest policy should be included in the PreFlow section.",
    fatal: false,
    severity: 2, //error
    nodeType: "ProxyEndpoint",
    enabled: true
  },
  debug = require("debug")("bundlelinter:" + plugin.name);

var onProxyEndpoint = function(ep, cb) {
  var hadError = false,
    spikeArrestFound = false;
  
  if (ep.getPreFlow()) {
    var steps = ep.getPreFlow().getFlowRequest().getSteps();
    steps.forEach(function(step) {
      if (step.getName() && ep.getParent().getPolicies()) {
        var p = ep.getParent().getPolicyByName(step.getName());
        if (p.getType() === "SpikeArrest") {
          spikeArrestFound = true;
        }
      }
    });
  }
  
  if (!spikeArrestFound) {
    ep.addMessage({
      plugin,
      message: plugin.message
    });
    hadError = true;
  }

  if (typeof(cb) == 'function') {
    cb(null, hadError);
  }
};

module.exports = {
  plugin,
  onProxyEndpoint
};
```

To test it we can use the same command as before:
```
node cli.js -f table.js -s test\fixtures\resources\sampleProxy\24Solver\apiproxy
```

And we can see the error that our new plugin generated in the output:

```
║ Line     │ Column   │ Type     │ Message                                                │ Rule ID              ║
╟──────────┼──────────┼──────────┼────────────────────────────────────────────────────────┼──────────────────────╢
║ 0        │ 0        │ error    │ Spike Arrest policy should be included in the          │ MyRule-002           ║
║          │          │          │ PreFlow section.                                       │                      ║
```

### Unit test

It's always a best practice to create unit tests for all rules so here's an example of a test for our new plugins:

`test\specs\testMyCustomRules.js`

```javascript
var assert = require("assert"),
  Bundle = require("../../lib/package/Bundle.js"),
  bl = require("../../lib/package/bundleLinter.js");

describe("Check proxy name prefix", function() {
  var pluginFile = "checkProxyNamePrefix.js",
    ruleId = "MyRule-001";

  it("should show error when proxy name don't start with B2B-* or B2C-*", function() {
    var bundle = new Bundle(configuration);
    bl.executePlugin(pluginFile, bundle);
    var report = getReportByRuleId(ruleId, bundle.getReport());
    assert.equal(report[0].message, "API Proxy name (TwentyFour) should start with B2B-* or B2C-*");
    assert.equal(report[0].severity, 2);
  });

  it("shouldn't show error when proxy name starts with B2B-*", function() {
    var bundle = new Bundle(configuration);
    bundle.getName = function() { return "B2B-TEST"; };
    bl.executePlugin(pluginFile, bundle);
    var report = getReportByRuleId(ruleId, bundle.getReport());
    assert.equal(report.length, 0);
  });

  it("shouldn't show error when proxy name starts with B2C-*", function() {
    var bundle = new Bundle(configuration);
    bundle.getName = function() { return "B2C-TEST"; };
    bl.executePlugin(pluginFile, bundle);
    var report = getReportByRuleId(ruleId, bundle.getReport());
    assert.equal(report.length, 0);
  });

});

describe("Check Spike Arrest", function() {
  var pluginFile = "checkPreFlowSpikeArrest.js",
    ruleId = "MyRule-002";

  it("should show error when missing Spike Arrest", function() {
    var bundle = new Bundle(configuration);
    bl.executePlugin(pluginFile, bundle);
    var report = getReportByRuleId(ruleId, bundle.getReport());
    assert.equal(report[0].message, "Spike Arrest policy should be included in the PreFlow section.");
    assert.equal(report[0].severity, 2);
  });

});

function getReportByRuleId(ruleId, bundleReport) {
  var jsimpl = bl.getFormatter("json.js"),
    jsonReport = JSON.parse(jsimpl(bundleReport)),
    reports = [];

  for (let r of jsonReport) {
    for (let m of r.messages) {
      if (m.ruleId === ruleId) {
        reports.push(m);
      }
    }
  }
  return reports;
}
```

To run all tests you can use the following command:

```
npm test
```

We can see the output of our new tests:

```
  Check proxy name prefix
    √ should show error when proxy name don't start with B2B-* or B2C-*
    √ shouldn't show error when proxy name starts with B2B-*
    √ shouldn't show error when proxy name starts with B2C-*

  Check Spike Arrest
    √ should show error when missing Spike Arrest
```

## Conclusion

In this guide I showed how to create 2 simple plugins for Apigeelint, one for checking the proxy name prefix and another to verify that the Spike Arrest policy is being used in the PreFlow. We also learned how to create unit tests for our plugins.

Apigeelint is a powerful tool for everybody working with Apigee proxies, especially if you add it in your [CI/CD pipeline](https://jenkins.io/doc/book/pipeline/). I hope you found this guide useful.

Don't forget to contribute to the [official repository](https://github.com/apigee/apigeelint) if you create something awesome!

You can find all the source code used in this guide in this [GitHub branch](https://github.com/eduandrade/apigeelint/tree/guide-developing-plugin). Feel free to use it!

Thanks,
Eduardo A.
