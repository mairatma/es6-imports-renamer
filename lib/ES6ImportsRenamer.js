var fs = require('fs');
var path = require('path');
var Promise = require('promise');
var recast = require('recast');
var System = require('systemjs');

var n = recast.types.namedTypes;

/**
 * Class responsible for renaming import paths present in both the
 * given source files and their dependencies, according to the
 * current SystemJS configuration.
 * @param {{sources: !Array<{ast: !Object, path: string}>, basePath: ?string}} config
 * @param {function} callback Function to be called when the renaming
 *   is done.
 * @constructor
 */
function ES6ImportsRenamer(config, callback) {
	config = config || {};

	this._basePath = config.basePath;
	this._callback = callback;
	this._addedMap = {};
	this._initStack(config.sources || []);
	this._renameNextAst();
};

/**
 * Adds a dependency to the stack, unless it has already been added.
 * @param {string} normalizedName The normalized name of the dependency.
 * @param {string} filePath The file system path to the dependency.
 * @protected
 */
ES6ImportsRenamer.prototype._addDependencyToStack = function(normalizedName, filePath) {
	if (this._addedMap[filePath]) {
		return;
	}
	this._addedMap[filePath] = true;

	var ast = recast.parse(fs.readFileSync(filePath, 'utf8'));
	this._stack.push({
		ast: ast,
		name: normalizedName,
		path: filePath
	});
};

/**
 * Initializes the stack with all the source asts.
 * @protected
 */
ES6ImportsRenamer.prototype._initStack = function(sources) {
	this._stack = [];
	for (var i = 0; i < sources.length; i++) {
		this._stack.push(sources[i]);
	}
	this._stackNextIndex = 0;
};

/**
 * Maps the given import declaration source to its path in the file system.
 * @param {ImportDeclaration} node
 * @param {string} parentName
 * @return {Promise}
 * @protected
 */
ES6ImportsRenamer.prototype._mapImport = function(node, parentName) {
	var self = this;
	return new Promise(function(resolve, reject) {
		System.normalize(node.source.value, parentName).then(function(normalized) {
			System.locate({name: normalized}).then(function(filePath) {
				// Removes `file:` prefix.
				filePath = filePath.substr(5);
				node.source.value = self._normalizePathForImport(filePath);
				self._addDependencyToStack(normalized, filePath);
				resolve();
			});
		});
	});
};

/**
 * Normalizes the given path to be used inside an import declaration, making it
 * relative to the base path, if one was given, and removing its `.js` extension.
 * @param  {string} filePath
 * @return {string}
 */
ES6ImportsRenamer.prototype._normalizePathForImport = function(filePath) {
	if (this._basePath) {
		filePath = path.relative(this._basePath, filePath);
	}
	return filePath.substr(0, filePath.length - 3)
}

/**
 * Renames the next ast on the stack.
 * @protected
 */
ES6ImportsRenamer.prototype._renameNextAst = function() {
	var current = this._stack[this._stackNextIndex++];
	if (!current) {
		this._callback && this._callback(this._stack);
		return;
	}

	var importPromises = [];
	var body = current.ast.program.body;
	for (var i = 0; i < body.length; i++) {
		if (n.ImportDeclaration.check(body[i]) ||
			(n.ExportDeclaration.check(body[i]) && body[i].source)) {
			importPromises.push(this._mapImport(body[i], current.name || current.path));
		}
	}

	var self = this;
	Promise.all(importPromises).then(function() {
		self._renameNextAst();
	});
};

module.exports = ES6ImportsRenamer;