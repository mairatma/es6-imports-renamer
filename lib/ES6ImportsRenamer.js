var fs = require('fs');
var path = require('path');
var Promise = require('promise');
var recast = require('recast');

var n = recast.types.namedTypes;

/**
 * Class responsible for renaming import paths present in both the
 * given source files and their dependencies, according to the
 * given rename function.
 * @param {{sources: !Array<{ast: !Object, path: string}>, basePath: ?string}} config
 * @param {function} callback Function to be called when the renaming
 *   is done.
 * @constructor
 */
function ES6ImportsRenamer(config, callback) {
	config = config || {};

	this._basePath = config.basePath;
	this._normalizeFn = config.normalizeFn;
	this._renameFn = config.renameFn;
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
	var readPath = path.resolve(filePath);
	if (readPath.substr(readPath.length - 3) !== '.js') {
		readPath += '.js';
	}

	if (this._addedMap[readPath]) {
		return;
	}
	this._addedMap[readPath] = true;

	var ast = recast.parse(fs.readFileSync(readPath, 'utf8'));
	this._stack.push({
		ast: ast,
		name: normalizedName,
		path: readPath
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
		this._addedMap[sources[i].path] = true;
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
	var originalPath = node.source.value;
	return new Promise(function(resolve, reject) {
		if (self._normalizeFn) {
			self._normalizeFn(originalPath, parentName, function(normalized) {
				self._mapImportRename(node, originalPath, parentName, normalized, function() {
					resolve();
				});
			});
		} else {
			self._mapImportRename(node, originalPath, parentName, null, function() {
				resolve();
			});
		}
	});
};

/**
 * Calls the rename function and replaces the import node source with the renamed one.
 * @param {ImportDeclaration} node
 * @param {string} originalPath
 * @param {string} parentName
 * @param {?string} normalized
 * @param {!function} callback
 * @protected
 */
ES6ImportsRenamer.prototype._mapImportRename = function(node, originalPath, parentName, normalized, callback) {
	var self = this;
	this._renameFn(normalized, parentName, function(renamed) {
		node.source.value = self._normalizePathForImport(renamed);
		self._addDependencyToStack(normalized, renamed);
		callback();
	});
}

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
	return filePath;
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
