var babylon = require("babylon");
var fs = require('fs-extra');
var util = require('util');
var path = require('path');
var _ = require('lodash');

var codeReporter = function(baseReporterDecorator, config, logger, helper, formatError) {
    var failedSpecList = [];

    this.onRunStart = function(browsersCollection){
        console.log("hello world");
    };

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
                this.createFile(outputFilename, content);
            }
        }
    };

    this.parseResult = function(browser, result){
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

    this.createContent = function(config, args){
        var content = fs.readFileSync(args.filename, 'utf8').split('\n');
        var bounds = this.findBounds(content);
        var testcode = this.createTest(content, bounds, args.queryArgs.line);
        console.log(testcode);
        return content;
    };

    this.createTest = function(content, bounds, errorLine) {
        var applied = {
            groups: [],
            cases: [],
            deconst: []
        };

        bounds.groups.forEach(function(bound) {
            if(errorLine < bound[1] && errorLine > bound[0])
                applied.groups.push(bound);
        });

        bounds.cases.forEach(function(bound){
            if(errorLine < bound[1] && errorLine > bound[0])
                applied.cases.push(bound);
        });

        bounds.deconst.forEach(function(bound){
            applied.groups.forEach(function(group){
                if(bound[0] > group[0] && bound[1] < group[1])
                    applied.deconst.push(bound);
            });
        });

        var lines = [];

        applied.groups.forEach(function(group){
            lines.push(group[0]);
            lines.push(group[1]);
        });

        applied.deconst.forEach(function(deconst){
            for(var d=deconst[0]; d<=deconst[1]; d++) lines.push(d);
        });

        applied.cases.forEach(function(scase){
            for(var c=scase[0]; c<=scase[1]; c++) lines.push(c);
        });

            lines.sort()
            lines = _.uniq(lines);

        var result= [];
        lines.forEach(function(line){
            result.push(content[line]);
        });

        return result.join('\n');

    };

    this.createFile = function(filename, content){
        fs.createFileSync(filename);
        fs.writeFileSync(filename, content, { encoding: 'utf8', flag: 'w'});
    };

    this.findBounds = function(content){
        var bounds = { groups: [], cases: [], deconst: [] };
        for(var i = 0; i < content.length; i++){
            var regex1 = /describe\s*\(\s*(?:\"|')[^\"']+(?:\"|')\s*,\s*function\s*\(/i;
            var regex2 = /it\s*\(\s*(?:\"|')[^\"']+(?:\"|')\s*,\s*function\s*\(/i;
            var regex3 = /(?:beforeEach|afterEach)\s*\(\s*function\s*\(/i;
            if((regex1.exec(content[i]) || []).length > 0){
                bounds.groups.push([i,this.findEndLine(content, i)]);
            }
            else if((regex2.exec(content[i]) || []).length > 0){
                bounds.cases.push([i,this.findEndLine(content, i)]);
            }
            else if((regex3.exec(content[i]) || []).length > 0){
                bounds.deconst.push([i,this.findEndLine(content, i)]);
            }
        }
        return bounds;
    };

    this.findEndLine = function(content, startLine){
        var match = /\bfunction\s*\([^)]*\)\s*({)/i.exec(content[startLine]);
        var pos = match[0].length + match.index - 1;
        var $stack = [];
        while(startLine < content.length){
            while(pos < content[startLine].length){
                var read = content[startLine][pos];
                if(read == "{"){
                    $stack.push("{");
                }else if(read == "}"){
                    var val = $stack.pop();
                    if(val == "{"){
                        if($stack.length == 0){
                            return startLine;
                        }
                    }else{
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