var assert = require('assert');
var fs = require('fs');
var path = require('path');
var recast = require('recast');
var renamer = require('../index');

module.exports = {
	testRename: function(test) {
		var fooFilePath = 'test/fixtures/src/foo.js';
		var fooAst = recast.parse(fs.readFileSync(fooFilePath, 'utf8'));
		var sources = [{ast: fooAst, path: fooFilePath}];
		renamer({renameFn: simpleRenameFn, sources: sources}, function(err, results) {
			assert.ok(!err);
			assert.strictEqual(1, results.length);
			assert.strictEqual(fooFilePath, results[0].path);

			var importSource = results[0].ast.program.body[0].source.value;
			assert.strictEqual(path.resolve('test/fixtures/src/bar'), importSource);
			importSource = results[0].ast.program.body[1].source.value;
			assert.strictEqual(path.resolve('test/fixtures/deps/dependency1/core'), importSource);

			test.done();
		});
	},

	testRenameLocalWithBasePath: function(test) {
		var fooFilePath = 'test/fixtures/src/foo.js';
		var fooAst = recast.parse(fs.readFileSync(fooFilePath, 'utf8'));
		var sources = [{ast: fooAst, path: fooFilePath}];
		var options = {
			renameFn: simpleRenameFn,
			sources: sources,
			basePath: path.resolve('test/fixtures')
		};
		renamer(options, function(err, results) {
			assert.ok(!err);
			assert.strictEqual(1, results.length);
			assert.strictEqual(fooFilePath, results[0].path);

			assert.strictEqual('src/bar', results[0].ast.program.body[0].source.value);
			assert.strictEqual('deps/dependency1/core', results[0].ast.program.body[1].source.value);

			test.done();
		});
	},

	testRenameDependencies: function(test) {
		var fooFilePath = 'test/fixtures/src/foo.js';
		var fooAst = recast.parse(fs.readFileSync(fooFilePath, 'utf8'));
		var sources = [{ast: fooAst, path: fooFilePath}];
		var options = {
			renameDependencies: true,
			renameFn: simpleRenameFn,
			sources: sources
		};
		renamer(options, function(err, results) {
			assert.ok(!err);
			assert.strictEqual(4, results.length);
			assert.strictEqual(fooFilePath, results[0].path);
			assert.strictEqual(path.resolve('test/fixtures/src/bar.js'), results[1].path);
			assert.strictEqual(path.resolve('test/fixtures/deps/dependency1/core.js'), results[2].path);
			assert.strictEqual(path.resolve('test/fixtures/deps/dependency2/core.js'), results[3].path);

			var importSource = results[0].ast.program.body[0].source.value;
			assert.strictEqual(path.resolve('test/fixtures/src/bar'), importSource);
			importSource = results[0].ast.program.body[1].source.value;
			assert.strictEqual(path.resolve('test/fixtures/deps/dependency1/core'), importSource);
			importSource = results[1].ast.program.body[0].source.value;
			assert.strictEqual(path.resolve('test/fixtures/deps/dependency2/core'), importSource);
			importSource = results[3].ast.program.body[0].source.value;
			assert.strictEqual(path.resolve('test/fixtures/deps/dependency1/core'), importSource);

			test.done();
		});
	},

	testRenameExportWithSource: function(test) {
		var basePath = path.resolve('test/fixtures');

		var exportFilePath = 'test/fixtures/src/export.js';
		var exportAst = recast.parse(fs.readFileSync(exportFilePath, 'utf8'));
		var sources = [{ast: exportAst, path: exportFilePath}];
		var options = {
			basePath: basePath,
			renameFn: simpleRenameFn,
			sources: sources
		};
		renamer(options, function(err, results) {
			assert.ok(!err);
			assert.strictEqual(1, results.length);
			assert.strictEqual(exportFilePath, results[0].path);

			var body = results[0].ast.program.body;
			assert.strictEqual('deps/dependency1/core', body[0].source.value);

			test.done();
		});
	},

	testWithBrokenRenameFn: function(test) {
		var filePath = 'test/fixtures/src/foo.js';
		var ast = recast.parse(fs.readFileSync(filePath, 'utf8'));
		var sources = [{ast: ast, path: filePath}];
		var options = {
			renameDependencies: true,
			renameFn: function() {
				throw new Error();
			},
			sources: sources
		};
		renamer(options, function(err, results) {
			assert.ok(err);
			test.done();
		});
	},

	testWithErrorAwareRenameFn: function(test) {
		var filePath = 'test/fixtures/src/foo.js';
		var ast = recast.parse(fs.readFileSync(filePath, 'utf8'));
		var sources = [{ast: ast, path: filePath}];
		var options = {
			renameDependencies: true,
			renameFn: function(originalPath, parentPath, callback) {
				callback(new Error());
			},
			sources: sources
		};
		renamer(options, function(err, results) {
			assert.ok(err);
			test.done();
		});
	},

	testInvalidPath: function(test) {
		var filePath = 'test/fixtures/src/invalid.js';
		var ast = recast.parse(fs.readFileSync(filePath, 'utf8'));
		var sources = [{ast: ast, path: filePath}];
		var options = {
			renameDependencies: true,
			renameFn: simpleRenameFn,
			sources: sources
		};
		renamer(options, function(err, results) {
			assert.ok(err);

			test.done();
		});
	}
};

function simpleRenameFn(originalPath, parentPath, callback) {
	setTimeout(function() {
		var renamed;
		if (originalPath[0] === '.') {
			renamed = path.resolve(path.dirname(parentPath), originalPath);
		} else {
			renamed = path.resolve('test/fixtures/deps', originalPath);
		}
		callback(null, renamed);
	}, 0);
}
