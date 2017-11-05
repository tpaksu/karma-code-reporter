/**
 * karma-code-reporter
 *
 * Copyright 2017 Taha PAKSU
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 *
 */

/* Loading Dependencies */
var fs = require('fs-extra');
var path = require('path');
var _ = require('lodash');
var glob = require('glob');
var util = require('util');
/**
 * Reporter Constructor
 * @param {function} baseReporterDecorator : a function that takes an object and adds to it methods and properties of karma’s basic reporter (following the Decorator pattern).
 * @param {object} config                  : The properties from Karma’s config.
 * @param {object} logger                  : karma’s logger
 * @param {object} helper                  : contains Karma utility functions, you may not need it
 * @param {function} formatError           : a function that takes an error object and returns a string with the error message and stack trace in a readable format.
 */
var codeReporter = function (baseReporterDecorator, config, logger, helper, formatError) {
  /* list of failed specs, containing {browser: object, result: object} : object array. */
  var failedSpecList = [];
  /* base path of this script */
  var basePath = __dirname;
  /* created files array */
  var createdFiles = [];
  /* created file titles array */
  var fileTitles = [];

  /**
   * Event triggered when browsers are ready and execution starts
   * @param {object} browsersCollection : methods colleciton for browsers
   * @returns void
   */
  this.onRunStart = function (browsersCollection) {
    // get the output directory path and resolve existing files
    var pathFormatted = path.resolve(config.basePath + path.sep + path.normalize(config.codeReporter.outputPath)) + "/*.*";
    // resolve wildcards asynchronously
    glob(pathFormatted, function (err, files) {
      // when resolving finished, delete each file in the files array
      files.forEach(function (file) {
        // delete file
        fs.unlinkSync(file);
      });
    });
  };

  /**
   * event triggered when an individiual spec (it block) finishes execution
   * @param {object} browser : browser object which this test ran on
   * @param {object} result  : the spec execution result
   * @returns void
   */
  this.onSpecComplete = function (browser, result) {
    // if the spec failed
    if (result.success === false) {
      // create an object with the information provided from jasmine/karma and push it to the list
      failedSpecList.push({browser: browser, result: result});
    }
  };

  /**
   * event triggered when all tests are executed
   * @param {object} browsersCollection : browsers and their util methods
   * @param {object} results            : all test results
   * @returns void
   */
  this.onRunComplete = function (browsersCollection, results) {
    // if the run isn't terminated and there are failed tests
    if (results.disconnected === false && failedSpecList.length > 0) {
      // for each failed test
      for (var i = 0; i < failedSpecList.length; i++) {
        // create parameters from the failed test members
        var args = this.parseResult(failedSpecList[i].browser, failedSpecList[i].result);
        // define the output filename concatenated with the output path
        var outputFilename = path.format({ root: config.basePath, dir: path.normalize(config.codeReporter.outputPath), base: args.id + ".html" });
        // if the file wasn't created before
        if (!fs.existsSync(outputFilename)) {
          // get the test code for the spec
          var testcode = this.createTestCode(args);
          // create static test result content
          var testresult = this.formatResult(failedSpecList[i]);
          // build template
          var html = this.buildTemplate(testcode, testresult);
          // create file
          this.createFile(outputFilename, html);
          // push the created file path and title to an array for building the index page
          createdFiles.push(outputFilename);
          fileTitles.push(failedSpecList[i].result.description);
        }
      }
      // at last, create the index file
      this.createIndexFile();
    }
  };

  /**
   * Creates the index file of the failed tests, contains links to the failed specs
   * @returns void
   */
  this.createIndexFile = function () {
    // build the index file content
    var html = '<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"> \
        <meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Jasmine Failed Spec Report</title> \
        <link rel="stylesheet" href="https://cdn.rawgit.com/Chalarangelo/mini.css/v2.3.7/dist/mini-default.min.css"></head> \
        <link rel="shortcut icon" type="image/png" href="'+ basePath + path.sep + 'jasmine_favicon.png"> \
        <body>\
            <style> \
              body {  \
                margin: 0; \
                padding: 0; \
                color: #212121; \
                background: aliceblue; \
              } \
              .container-fluid { \
                margin: 40px; \
                padding: 20px; \
                background: white; \
              } \
              h2 { \
                font-size: 32px; \
                font-weight: bold; \
                margin: 0 0 20px 0px; \
                background: rebeccapurple; \
                color: white; \
                padding: 10px; \
              } \
              ul { \
                padding: 0; \
                margin: 0; \
              } \
              .spec_list_ul li { \
                list-style-type: none; \
                margin-bottom: 2px; \
                border-radius: 3px; \
                padding: 5px; \
                font-size: 13px; \
                background: white;\
              }  \
            </style> \
            <div class="container-fluid"> \
              <div class="row"> \
                <div class="col-md-12"> \
                  <h2>Jasmine Failed Spec Report - Index</h2> \
                </div>';
    // append the list
    html += "<div class='col-md-12'><ul class='spec_list_ul'>";
    // for each file created
    fileTitles.forEach(function (value, index) {
      // append the file title and link it to the file path
      html += "<li><a href='/" + path.resolve(config.basePath + path.sep + createdFiles[index]) + "'>" + fileTitles[index] + "</a></li>";
    });
    // close the document
    html += "</ul></div></div></div></body></html>";
    // write the index code to the index file
    this.createFile(path.format({ root: config.basePath, dir: path.normalize(config.codeReporter.outputPath), base: "index.html" }), html);
  };

  /**
   * Creates the result html output from the objects
   * @param {object} browserResultObject : The browser and result object of this spec
   * @returns {string} HTML content
   */
  this.formatResult = function (browserResultObject) {
    var output = "<h3>Previously Saved Log:</h3><div class='saved_output'><div><b>Tested on </b>" + browserResultObject.browser.name + "</div>";
    output += "<div><b>Test Case: </b>" + browserResultObject.result.description + "</div>";
    output += "<div><b>Test Suite: </b>" + browserResultObject.result.suite.join(' | ') + "</div>";
    output += "<div><b>Failures:</b><ul>";
    browserResultObject.result.log.forEach(function (log) {
      log = log.replace(/\?([a-f0-9]+):([0-9]+):([0-9]+)/g, "\tLine:$2\tOffset:$3");
      output += "<li>" + log.replace(/\n/g, "<br>") + "</li>";
    });
    output += "</ul></div></div>";
    return output;
  };

  /**
   * Creates an args array for use in the file building routines
   * @param {object} browser : Browser object of the current spec
   * @param {object} result : Result object of the current spec
   * @returns {object} An object of arguments
   */
  this.parseResult = function (browser, result) {
    var args = {};
    args.id = result.id;
    args.source = result.log[0].split("\n")[1];
    args.filename = args.source.split("?")[0].split("base")[1].substr(1);
    args.query = args.source.split("?")[1];
    args.queryArgs = {};
    args.queryArgs.line = args.query.split(":")[1];
    args.queryArgs.id = args.query.split(":")[0];
    args.queryArgs.pos = args.query.split(":")[2];
    args.scope = result.suite[0];
    args.name = result.description;
    args.elapsed = result.time;
    return args;
  };

  /**
   * Slices the portion of the spec and it's surroundings
   * @param {object} args : the parsed args from the browser and result object
   * @returns {string} : clean javascript code of the related spec without the rest
   */
  this.createTestCode = function (args) {
    // read the test file content
    var content = fs.readFileSync(args.filename, 'utf8').split('\n');
    // calcuate the bounds of the describe, beforeEach, afterEach and it blocks
    var bounds = this.findBounds(content);
    // by using the content and bounds, slice the related code for the test
    var testcode = this.createTest(content, bounds, args.queryArgs.line);
    // return the sliced code portion
    return testcode;
  };

  /**
   * Slices the related test case from the content and re-creates a definition script which only contains the failed test case
   * @param {array}   content   : The test script content splitted by line
   * @param {array}   bounds    : The bounds of the definitions (describe, beforeEach, afterEach, it)
   * @param {integer} errorLine : The failed spec expectation line
   */
  this.createTest = function (content, bounds, errorLine) {
    // code lines/ranges which need to be appended to the new file will be collected in this variable
    var applied = {
      groups: [],
      cases: [],
      deconst: []
    };

    // return groups containing the error line
    bounds.groups.forEach(function (bound) {
      if (errorLine <= bound[1] && errorLine >= bound[0])
        applied.groups.push(bound);
    });

    // return cases containing the error line
    bounds.cases.forEach(function (bound) {
      if (errorLine <= bound[1] && errorLine >= bound[0])
        applied.cases.push(bound);
    });

    // return beforeEach/afterEach methods contained by the found groups
    bounds.deconst.forEach(function (bound) {
      applied.groups.forEach(function (group) {
        if (bound[1] <= group[1] && bound[0] >= group[0])
          applied.deconst.push(bound);
      });
    });

    // prepare the new script line numbers container array
    var lines = [];

    // using the applied array, get the line numbers from the original code and push it to the new script lines array
    applied.groups.forEach(function (group) { lines.push(group[0]); lines.push(group[1]); });
    applied.deconst.forEach(function (deconst) { for (var d = deconst[0]; d <= deconst[1]; d++) lines.push(d); });
    applied.cases.forEach(function (scase) { for (var c = scase[0]; c <= scase[1]; c++) lines.push(c); });

    // remove the duplicate lines and sort the array
    lines = _.sortBy(_.uniq(lines));

    // get the code by utilizing the line numbers with the original content, build the new script
    var result = [];
    lines.forEach(function (line) { result.push(content[line]); });

    // join and return the result code lines array
    return result.join('\n');
  };

  /**
   * Builds the template for one failed spec
   * @param {string} testcode : the code which we'll use to rerun the test, and output to user
   * @param {string} output   : current test results formatted as HTML
   * @returns {string} the compiled HTML code
   */
  this.buildTemplate = function (testcode, output) {
    // create a lodash template from the file
    var compiled = _.template(fs.readFileSync(config.codeReporter.template ? path.resolve(config.codeReporter.template) : basePath + path.sep + "template.tmpl"));
    // get the extra css files from the configuration
    var cssFiles = config.codeReporter.cssFiles || [];
    // get the extra js files from the configuration and the test results
    var jsFiles = _.extend([], _.map(config.files, function (d) { return d.pattern; }) || [], config.codeReporter.jsFiles || []);
    // buffer scope
    var that = this;

    // prepare an array for the ignored files
    this.ignoreFiles = [];

    // add the test case files to the ignored files array
    config.codeReporter.testFiles.forEach(function (pattern) {
      _.extend(that.ignoreFiles, glob.sync(pattern, { root: config.basePath }).map(function (fp) {
        return path.resolve(fp.replace(/\\/g, path.sep).replace(/\//g, path.sep));
      }));
    });

    // get the ignore-free version of js files array
    this.jsFiles = _.difference(_.map(jsFiles, function (d) { return path.resolve(d.replace(/\\/g, path.sep).replace(/\//g, path.sep)); }), this.ignoreFiles);
    // get the ignore-free version of css files array
    this.cssFiles = _.difference(_.map(cssFiles, function (d) { return path.resolve(d.replace(/\\/g, path.sep).replace(/\//g, path.sep)); }), this.ignoreFiles);

    // escape the content to show in the user interface
    var escapedContent = _.escape(testcode).replace(/expect\s*\(/g, "<i class='highlight'>expect</i>(");
    // precompile the template
    var compiledHtml = compiled({
      favicon: basePath + path.sep + "jasmine_favicon.png",
      css: this.cssFiles,
      scripts: this.jsFiles,
      content: testcode,
      contentEscaped: escapedContent,
      codeStartIndex: 0,
      results: output
    });
    // get the test code start line from the compiled template
    var codeStartIndex = compiledHtml.slice(0, compiledHtml.indexOf(testcode)).split('\n').length;
    // re compile the template with the code start index (this will be used in code line numbers and failed test lines calculation)
    var compiledHtml = compiled({
      favicon: basePath + path.sep + "jasmine_favicon.png",
      css: this.cssFiles,
      scripts: this.jsFiles,
      content: testcode,
      codeStartIndex: codeStartIndex,
      contentEscaped: escapedContent,
      results: output
    });
    // return the compiled HTML string
    return compiledHtml;
  }

  /**
   * wrapper function for creating a file and appending the content
   * @param {string} filename : the path to the new file
   * @param {string} content  : the content which will be written into the file
   * @returns void
   */
  this.createFile = function (filename, content) {
    // create file synchronously
    fs.createFileSync(filename);
    // write to file synchronously
    fs.writeFileSync(filename, content, { encoding: 'utf8', flag: 'w' });
  };

  /**
   * calculates the jasmine formatted test file method bounds
   * @param {array} content: line by line splitted test code content
   * @returns {array} bounds of the methods separated by groups, specs and de-constructors.
   */
  this.findBounds = function (content) {
    // prepare the output object
    var bounds = { groups: [], cases: [], deconst: [] };
    // loop each line
    for (var i = 0; i < content.length; i++) {
      // prepare regular expressions for describe, it and before/afterEach blocks
      var regex1 = /describe\s*\(\s*(?:\"|')[^\"']+(?:\"|')\s*,\s*function\s*\(/i;
      var regex2 = /it\s*\(\s*(?:\"|')[^\"']+(?:\"|')\s*,\s*function\s*\(/i;
      var regex3 = /(?:beforeEach|afterEach)\s*\(\s*function\s*\(/i;
      // if it's a match for "describe"
      if ((regex1.exec(content[i]) || []).length > 0) {
        // push the bounds for this block
        bounds.groups.push([i, this.findEndLine(content, i)]);
      }
      // if it's a match for "it"
      else if ((regex2.exec(content[i]) || []).length > 0) {
        // push the bounds for this block
        bounds.cases.push([i, this.findEndLine(content, i)]);
      }
      // if it's a match for "beforeEach" or "afterEach"
      else if ((regex3.exec(content[i]) || []).length > 0) {
        // push the bounds for this block
        bounds.deconst.push([i, this.findEndLine(content, i)]);
      }
    }
    // return the calculated bounds
    return bounds;
  };

  /**
   * Finds the end bracket for a given start bracket on the content
   * @param {string} content    : line by line split test code content
   * @param {integer} startLine : the line number containing the start bracket
   */
  this.findEndLine = function (content, startLine) {
    // find the start bracket position
    var match = /\bfunction\s*\([^)]*\)\s*({)/i.exec(content[startLine]);
    var pos = match[0].length + match.index - 1;
    // prepare a stack for the brackets
    var $stack = [];
    // loop each character
    while (startLine < content.length) {
      while (pos < content[startLine].length) {
        // read the char
        var read = content[startLine][pos];
        // if read char is a start bracket
        if (read == "{") {
          // push it to the array
          $stack.push("{");
        } else if (read == "}") {
          // if read char is a closing bracket, read from the stack
          var val = $stack.pop();
          if (val == "{") {
            // if the closing bracket matches with an opening bracket
            if ($stack.length == 0) {
              // if there are no brackets left, return the end line
              return startLine;
            }
          } else {
            // the brackets are not correctly positioned, return error
            return -1;
          }
        }
        // go to the next char
        pos++;
      }
      // go to the next line
      startLine++;
      // reset position
      pos = 0;
    }
    // if this line is reached, there must be an error.
    return -1;
  }
};

// export the module
module.exports = { 'reporter:code': ['type', codeReporter] };