# karma-code-reporter

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Node.js Version][node-version-image]][node-version-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]

Prepares a test report which each failed case has it's own report and inline test case. I tested this with grunt + karma + jasmine configuration and I don't know it works on other test runners like mocha etc. It's open for collaboration.

## Screenshots
![Spec File Preview](/screenshots/screenshot-index.png?raw=true "Index File Preview")
Index File Preview

![Spec File Preview](/screenshots/screenshot-spec.png?raw=true "Spec File Preview")
Spec File Preview

## Installation

There are two installation options:

1. Install using [`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```sh
$ npm install karma-code-reporter --save-dev
```


2. Add `karma-code-reporter` as a `devDependency` inside your `package.json` file

```json
{
    "devDependencies": {
        "karma-code-reporter": "~0.0.1"
    }
}
```

## Options
_\* required_

### outputPath*
`(string)` Defines the path that the output files will be created at. The folder will contain an `index.html` file which contains a list for each failed test, and the `spec*.html` files which contain the live versions of failed tests and the related code portion.

   ```text
    [output folder]
    |--> index.html
    |--> spec1.html
    |--> spec2.html
    .
   ```

### testFiles*
`(array)` The test files which will be ignored during html generation. This is needed because we don't want any other test cases to interfere with the failing spec.

### cssFiles
`(array)` The extra css files which you want to include in the failed spec HTML files.

### jsFiles
`(array)` The extra javascript files which you want to include int the failed spec HTML files.

## Configuration

If you use a `karma.conf.js` file to define karma configuration, you can add this plugin's configuration like this:

```js
// karma.conf.js
module.exports = function(config) {
  config.set({
    reporters: ['code'],
    codeReporter: {
        outputPath: 'tests/output/code',
        testFiles: ['tests/*.test.js'],
        cssFiles: ['build/css/style.min.css'],
        jsFiles: ['build/js/script.min.js']
    }
  });
};
```

Or if you are using `Gruntfile.js` to configure karma, you can use it **like** this:

```js
module.exports = function (grunt) {
    // Project configuration.
    grunt.initConfig({
        karma: {
            dist: {
                options: {
                    files: [],
                    basePath: '',
                    frameworks: ['jasmine'],
                    reporters: ['progress', 'code'],
                    port: 9876,
                    colors: true,
                    browsers: ['PhantomJS'],
                    singleRun: true,
                    codeReporter: {
                        outputPath: 'tests/output/code',
                        testFiles: ['tests/*.test.js'],
                        cssFiles: ['build/css/caleran.min.css']
                    }
                }
            }
        }
    });
```
## Contributing
In lieu of a formal styleguide take care to maintain the existing coding style.

## Release History
* 0.0.1 initial release

* 0.0.2 added screenshots to README, fixed wrong version number in Installation section

* 0.0.3 fixed bound calculation, added report visibility hidden until tests are completed

* 0.0.4 added responsive styles

* 0.0.5 split regexes for correct quote type handling

* 0.0.6 removed 'UserContext' from log.stack parsing regex

## Author

[Taha PAKSU](http://tahapaksu.com)

## License
[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/karma-code-reporter.svg
[npm-url]: https://npmjs.org/package/karma-code-reporter
[node-version-image]: https://img.shields.io/node/v/karma-code-reporter.svg
[node-version-url]: https://nodejs.org/en/download/
[travis-image]: https://img.shields.io/travis/tpaksu/karma-code-reporter/master.svg
[travis-url]: https://travis-ci.org/tpaksu/karma-code-reporter
[coveralls-image]: https://img.shields.io/coveralls/tpaksu/karma-code-reporter/master.svg
[coveralls-url]: https://coveralls.io/r/tpaksu/karma-code-reporter?branch=master
[downloads-image]: https://img.shields.io/npm/dm/karma-code-reporter.svg
[downloads-url]: https://npmjs.org/package/karma-code-reporter
