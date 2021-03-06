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
 * @param {function(Error, Array)} callback Function to be called when the renaming
 *   is done.
 * @constructor
 */
function ES6ImportsRenamer(config, callback) {
	config = config || {};

	this._basePath = config.basePath;
	this._renameDependencies = config.renameDependencies;
	this._renameFn = config.renameFn;
	this._callback = callback;
	this._addedMap = {};

	this._initStack(config.sources || []);
	this._renameNextAst();
}

/**
 * Adds a dependency to the stack, unless it has already been added.
 * @param {string} filePath The file system path to the dependency.
 * @protected
 */
ES6ImportsRenamer.prototype._addDependencyToStack = function(filePath) {
	if (!this._renameDependencies) {
		return;
	}

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
		path: readPath
	});
};

/**
 * Handles the given error, passing it to the provided callback if it exists.
 * @param {!Error} error
 * @protected
 */
ES6ImportsRenamer.prototype._handleError = function(error) {
	if (this._callback) {
		this._failed = true;
		this._callback(error);
	} else {
		throw error;
	}
}

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
	return new Promise(function(resolve) {
		if (self._failed) {
			return;
		}
		try {
			self._mapImportRename(node, originalPath, parentName, function() {
				resolve();
			});
		} catch (error) {
			self._handleError(error);
		}
	});
};

/**
 * Calls the rename function and replaces the import node source with the renamed one.
 * @param {ImportDeclaration} node
 * @param {string} originalPath
 * @param {string} parentName
 * @param {!function} callback
 * @protected
 */
ES6ImportsRenamer.prototype._mapImportRename = function(node, originalPath, parentName, callback) {
	var self = this;
	this._renameFn(originalPath, parentName, function(err, renamed) {
		if (self._failed) {
			return;
		}

		if (err) {
			self._handleError(err);
			return;
		}

		try {
			node.source.value = self._normalizePathForImport(renamed);
			self._addDependencyToStack(renamed);
			callback();
		} catch (error) {
			self._handleError(error);
		}
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
	return filePath;
};

/**
 * Renames the next ast on the stack.
 * @protected
 */
ES6ImportsRenamer.prototype._renameNextAst = function() {
	var current = this._stack[this._stackNextIndex++];
	if (!current) {
		this._callback && this._callback(null, this._stack);
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
