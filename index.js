var ES6ImportsRenamer = require('./lib/ES6ImportsRenamer');

/**
 * Renames import paths present in both the given source files and
 * their dependencies, according to the current SystemJS configuration.
 * @param {{sources: !Array<{ast: !Object, path: string, basePath: ?string}>}} config
 * @param {function(Error, !Array)} callback Function to be called when the renaming
 *   is done.
 */
module.exports = function(config, callback) {
	new ES6ImportsRenamer(config, callback);
};

