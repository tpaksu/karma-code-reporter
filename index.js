var babylon = require("babylon");
var fs = require('fs');
var util = require('util');
var path = require('path');
var _ = require('lodash');

var codeReporter = function(baseReporterDecorator, config, logger, helper, formatError) {
    var failedSpecList = [];
    this.onSpecComplete = function(browser, result) {
        if(result.success === false){
            failedSpecList.push([browser, result]);
        }
    };

    this.onRunComplete = function(browsersCollection, results) {
        if(results.disconnected === false && failedSpecList.length > 0){
            for(var i = 0; i < failedSpecList.length; i++){
                var args = this.parseResult(failedSpecList[i][0], failedSpecList[i][1]);
                var outputFilename = path.format({root: config.basePath, dir: path.normalize(config.codeReporter.outputPath), base: args.id + ".html" });
                var content = this.createContent(config, args);
                this.createFile(outputFilename, args);
            }
        }
    };

    this.parseResult = function(browser, result){
        var args = {};
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

    this.createContent = function(config, args){

        var content = fs.readFileSync(args.filename, 'utf8');
        console.log(args.filename, args.queryArgs.line, content.split('\n')[args.queryArgs.line - 1]);
        //fs.writeFileSync("taha.txt", util.inspect(parsed) , 'utf-8');
        return content;
        //babylon.parse(content);
    };

    this.createFile = function(filename, args){

    };

};

module.exports = { 'reporter:code': ['type', codeReporter] };