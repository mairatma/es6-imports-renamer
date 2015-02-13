var assert = require('assert');
var fs = require('fs');
var path = require('path');
var recast = require('recast');
var renamer = require('../index');

module.exports = {
	testRenameLocal: function(test) {
		var fooFilePath = 'test/fixtures/src/foo.js';
		var fooAst = recast.parse(fs.readFileSync(fooFilePath, 'utf8'));
		var sources = [{ast: fooAst, path: fooFilePath}];
		renamer({sources: sources}, function(results) {
			assert.strictEqual(2, results.length);
			assert.strictEqual(fooFilePath, results[0].path);
			assert.strictEqual(path.resolve('test/fixtures/src/bar.js'), results[1].path);

			var importSource = results[0].ast.program.body[0].source.value;
			assert.strictEqual(path.resolve('test/fixtures/src/bar'), importSource);

			test.done();
		});
	},

	testRenameLocalWithBasePath: function(test) {
		var fooFilePath = 'test/fixtures/src/foo.js';
		var fooAst = recast.parse(fs.readFileSync(fooFilePath, 'utf8'));
		var sources = [{ast: fooAst, path: fooFilePath}];
		renamer({sources: sources, basePath: path.resolve('test/fixtures')}, function(results) {
			assert.strictEqual(2, results.length);
			assert.strictEqual(fooFilePath, results[0].path);
			assert.strictEqual(path.resolve('test/fixtures/src/bar.js'), results[1].path);

			assert.strictEqual('src/bar', results[0].ast.program.body[0].source.value);

			test.done();
		});
	},

	testRenameAccordingToConfig: function(test) {
		var basePath = path.resolve('test/fixtures');
		System.baseURL = basePath;
		System.config({
			paths: {
				'*': '*.js',
				'my-fixtures/*': 'src/*.js',
				'deps:*': 'deps/*.js'
			},
			map: {
				'dependency1': 'deps:dependency1'
			}
		});

		var bazFilePath = 'test/fixtures/src/baz.js';
		var bazAst = recast.parse(fs.readFileSync(bazFilePath, 'utf8'));
		var sources = [{ast: bazAst, path: bazFilePath}];
		renamer({sources: sources, basePath: basePath}, function(results) {
			assert.strictEqual(3, results.length);
			assert.strictEqual(bazFilePath, results[0].path);
			assert.strictEqual(path.resolve(basePath, 'src/bar.js'), results[1].path);
			assert.strictEqual(path.resolve(basePath, 'deps/dependency1/core.js'), results[2].path);

			var body = results[0].ast.program.body;
			assert.strictEqual('src/bar', body[0].source.value);
			assert.strictEqual('deps/dependency1/core', body[1].source.value);

			test.done();
		});
	},

	testRenameNestedDependency: function(test) {
		var basePath = path.resolve('test/fixtures');
		System.baseURL = basePath;
		System.config({
			paths: {
				'*': '*.js',
				'deps:*': 'deps/*.js'
			},
			map: {
				'dependency1': 'deps:dependency1',
				'dependency2': 'deps:dependency2',
				'deps:dependency2': {
					'dep1': 'deps:dependency1'
				}
			}
		});

		var bazFilePath = 'test/fixtures/src/baz2.js';
		var bazAst = recast.parse(fs.readFileSync(bazFilePath, 'utf8'));
		var sources = [{ast: bazAst, path: bazFilePath}];
		renamer({sources: sources, basePath: basePath}, function(results) {
			assert.strictEqual(3, results.length);
			assert.strictEqual(bazFilePath, results[0].path);
			assert.strictEqual(path.resolve(basePath, 'deps/dependency1/core.js'), results[1].path);
			assert.strictEqual(path.resolve(basePath, 'deps/dependency2/core.js'), results[2].path);

			var importSource = results[0].ast.program.body[0].source.value;
			assert.strictEqual('deps/dependency1/core', importSource);
			importSource = results[0].ast.program.body[1].source.value;
			assert.strictEqual('deps/dependency2/core', importSource);
			importSource = results[2].ast.program.body[0].source.value;
			assert.strictEqual('deps/dependency1/core', importSource);

			test.done();
		});
	},

	testRenameExportWithSource: function(test) {
		var basePath = path.resolve('test/fixtures');
		System.baseURL = basePath;
		System.config({
			paths: {
				'*': '*.js',
				'deps:*': 'deps/*.js'
			},
			map: {
				'dependency1': 'deps:dependency1'
			}
		});

		var exportFilePath = 'test/fixtures/src/export.js';
		var exportAst = recast.parse(fs.readFileSync(exportFilePath, 'utf8'));
		var sources = [{ast: exportAst, path: exportFilePath}];
		renamer({sources: sources, basePath: basePath}, function(results) {
			assert.strictEqual(2, results.length);
			assert.strictEqual(exportFilePath, results[0].path);
			assert.strictEqual(path.resolve(basePath, 'deps/dependency1/core.js'), results[1].path);

			var body = results[0].ast.program.body;
			assert.strictEqual('deps/dependency1/core', body[0].source.value);

			test.done();
		});
	}
};
