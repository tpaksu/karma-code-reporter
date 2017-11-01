var fs = require('fs-extra');
var path = require('path');
var _ = require('lodash');
var glob = require('glob');
var util = require('util');

var codeReporter = function (baseReporterDecorator, config, logger, helper, formatError) {
    var failedSpecList = [];
    var basePath = __dirname;
    var createdFiles = [];
    var fileTitles = [];

    this.onRunStart = function(browsersCollection){
        var pathFormatted = path.resolve(config.basePath + path.sep + path.normalize(config.codeReporter.outputPath)) + "/*.*";
        console.log(pathFormatted);
        glob(pathFormatted, function(err, files){
            files.forEach(function(file){
                fs.unlinkSync(file);
            });
        });
    };

    this.onSpecComplete = function (browser, result) {
        if (result.success === false) {
            failedSpecList.push([browser, result]);
        }
    };

    this.onRunComplete = function (browsersCollection, results) {
        if (results.disconnected === false && failedSpecList.length > 0) {
            for (var i = 0; i < failedSpecList.length; i++) {
                var args = this.parseResult(failedSpecList[i][0], failedSpecList[i][1]);
                var outputFilename = path.format({ root: config.basePath, dir: path.normalize(config.codeReporter.outputPath), base: args.id + ".html" });
                if(!fs.existsSync(outputFilename)){
                    var content = this.createContent(config, args);
                    var output = this.formatResult(failedSpecList[i]);
                    var html = this.buildTemplate(content, output);
                    this.createFile(outputFilename, html);
                    createdFiles.push(outputFilename);
                    fileTitles.push(failedSpecList[i][1].description);
                }
            }
        }
        this.createIndexFile();
    };

    this.createIndexFile = function(){
        var html = '<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"> \
        <meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Jasmine Failed Spec Report</title> \
        <link rel="stylesheet" href="https://cdn.rawgit.com/Chalarangelo/mini.css/v2.3.7/dist/mini-default.min.css"></head> \
        <body style="padding: 30px 50px;">\
            <style> \
                h2 { \
                    font-size: 32px; \
                    font-weight: bold; \
                    margin: 20px 0px; \
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
        html += "<div class='col-md-12'><ul class='spec_list_ul'>";
        fileTitles.forEach(function(value,index){
            html += "<li><a href='/"+path.resolve( config.basePath + path.sep + createdFiles[index] )+"'>"+fileTitles[index]+"</a></li>";
        });
        html +="</ul></div></div></div></body></html>";
        fs.writeFileSync(path.format({ root: config.basePath, dir: path.normalize(config.codeReporter.outputPath), base: "index.html" }), html, 'utf8');
    };

    this.formatResult = function(browserResultObject){
        var Browser = browserResultObject[0];
        var Result = browserResultObject[1];
        var output = "<h3>Previously Saved Log:</h3><div class='saved_output'><div><b>Tested on </b>" + Browser.name + "</div>";
        output += "<div><b>Test Case: </b>" + Result.description + "</div>";
        output += "<div><b>Test Suite: </b>" + Result.suite.join(' | ') + "</div>";
        output += "<div><b>Failures:</b><ul>";
        Result.log.forEach(function(log){
            log = log.replace(/\?([a-f0-9]+):([0-9]+):([0-9]+)/g,"\tLine:$2\tOffset:$3");
            output += "<li>"+log.replace(/\n/g,"<br>")+"</li>";
        });
        output += "</ul></div></div>";
        return output;
    };

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

    this.createContent = function (config, args) {
        var content = fs.readFileSync(args.filename, 'utf8').split('\n');
        var bounds = this.findBounds(content);
        var testcode = this.createTest(content, bounds, args.queryArgs.line);
        return testcode;
    };

    this.createTest = function (content, bounds, errorLine) {
        var applied = {
            groups: [],
            cases: [],
            deconst: []
        };

        bounds.groups.forEach(function (bound) {
            if (errorLine < bound[1] && errorLine > bound[0])
                applied.groups.push(bound);
        });

        bounds.cases.forEach(function (bound) {
            if (errorLine < bound[1] && errorLine > bound[0])
                applied.cases.push(bound);
        });

        bounds.deconst.forEach(function (bound) {
            applied.groups.forEach(function (group) {
                if (bound[0] > group[0] && bound[1] < group[1])
                    applied.deconst.push(bound);
            });
        });

        var lines = [];

        applied.groups.forEach(function (group) { lines.push(group[0]); lines.push(group[1]); });
        applied.deconst.forEach(function (deconst) { for (var d = deconst[0]; d <= deconst[1]; d++) lines.push(d); });
        applied.cases.forEach(function (scase) { for (var c = scase[0]; c <= scase[1]; c++) lines.push(c); });

        lines = _.sortBy(_.uniq(lines));

        var result = [];
        lines.forEach(function (line) { result.push(content[line]); });

        return result.join('\n');

    };

    this.buildTemplate = function (content, output) {
        var compiled = _.template(fs.readFileSync(config.codeReporter.template ? path.resolve(config.codeReporter.template) : basePath + path.sep + "template.tmpl"));
        var cssFiles = config.codeReporter.cssFiles || [];
        var jsFiles = _.extend([], _.map(config.files, function (d) { return d.pattern; }) || [], config.codeReporter.jsFiles || []);
        var that = this;

        this.ignoreFiles = [];

        config.codeReporter.testFiles.forEach(function (pattern) {
            _.extend(that.ignoreFiles, glob.sync(pattern, { root: config.basePath }).map(function (fp) {
                return path.resolve(fp.replace(/\\/g, path.sep).replace(/\//g, path.sep));
            }));
        });

        this.jsFiles = _.difference(_.map(jsFiles, function (d) { return path.resolve(d.replace(/\\/g, path.sep).replace(/\//g, path.sep)); }), this.ignoreFiles);
        this.cssFiles = _.difference(_.map(cssFiles, function (d) { return path.resolve(d.replace(/\\/g, path.sep).replace(/\//g, path.sep)); }), this.ignoreFiles);
        var escapedContent =  _.escape(content).replace(/expect\s*\(/g,"<i class='highlight'>expect</i>(");
        var compiledHtml = compiled({
            favicon: basePath + path.sep + "jasmine_favicon.png",
            css: this.cssFiles,
            scripts: this.jsFiles,
            content: content,
            contentEscaped: escapedContent,
            results: output
        });
        //codeStartIndex = compiledHtml.indexOf(escapedContent);
        return compiledHtml;
    }

    this.createFile = function (filename, content) {
        fs.createFileSync(filename);
        fs.writeFileSync(filename, content, { encoding: 'utf8', flag: 'w' });
    };

    this.findBounds = function (content) {
        var bounds = { groups: [], cases: [], deconst: [] };
        for (var i = 0; i < content.length; i++) {
            var regex1 = /describe\s*\(\s*(?:\"|')[^\"']+(?:\"|')\s*,\s*function\s*\(/i;
            var regex2 = /it\s*\(\s*(?:\"|')[^\"']+(?:\"|')\s*,\s*function\s*\(/i;
            var regex3 = /(?:beforeEach|afterEach)\s*\(\s*function\s*\(/i;
            if ((regex1.exec(content[i]) || []).length > 0) {
                bounds.groups.push([i, this.findEndLine(content, i)]);
            }
            else if ((regex2.exec(content[i]) || []).length > 0) {
                bounds.cases.push([i, this.findEndLine(content, i)]);
            }
            else if ((regex3.exec(content[i]) || []).length > 0) {
                bounds.deconst.push([i, this.findEndLine(content, i)]);
            }
        }
        return bounds;
    };

    this.findEndLine = function (content, startLine) {
        var match = /\bfunction\s*\([^)]*\)\s*({)/i.exec(content[startLine]);
        var pos = match[0].length + match.index - 1;
        var $stack = [];
        while (startLine < content.length) {
            while (pos < content[startLine].length) {
                var read = content[startLine][pos];
                if (read == "{") {
                    $stack.push("{");
                } else if (read == "}") {
                    var val = $stack.pop();
                    if (val == "{") {
                        if ($stack.length == 0) {
                            return startLine;
                        }
                    } else {
                        return -1;
                    }
                }
                pos++;
            }
            startLine++;
            pos = 0;
        }
        return -1;
    }
};

module.exports = { 'reporter:code': ['type', codeReporter] };