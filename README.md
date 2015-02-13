es6-imports-renamer
===================================

Renames paths from es6 import declarations.

## Usage

This tool can rename all sources from import declarations, mapping aliases to real file system paths, according to the current [SystemJS](https://github.com/systemjs/systemjs) configuration.

To use it, just pass the asts of the files that should start the renaming process. For example:

```javascript
var fs = require('fs');
var recast = require('recast');
var renamer = require('es6-imports-renamer');
var System = require('systemjs');

// Set SystemJS configuration before running the renamer.
// This can be either set manually like the example below, or run from
// a configuration file, like jspm's `config.js`.
System.config({
	paths: {
	    '*': '*.js',
	    'myapp/*': 'src/*.js',
	    'github:*': 'jspm_packages/github/*.js'
	},
	map: {
		'foobar': 'github:foo/bar@master'
	}
});

var ast = recast.parse(fs.readFileSync('src/main'));
renamer({sources: [{ast: ast, path: 'src/main'}]}, function(resultAsts) {
	// Consume the renamed asts here.
});
```

The renamer will automatically load other needed dependencies and rename them as well.

## API

### config

- `sources` **{!Array<{ast: !Object, path: string}>}** Contains the files that should start the renaming process. Each file should be represented as an object that points to that file's ast and its path.
- `basePath` **{?string}** Optional base path. If given, import sources will be renamed relative to it. Otherwise they will be renamed to absolute paths.

### callback
Function to be called when the renaming is done.
