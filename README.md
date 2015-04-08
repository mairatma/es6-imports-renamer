es6-imports-renamer
===================================

Renames paths from es6 import declarations.

## Usage

This tool can rename all sources from import declarations. This can be useful for mapping aliases to real file system paths.

To use it, just pass the asts of the files that should start the renaming process, and the rename function to be called on each import declaration. For example:

```javascript
var fs = require('fs');
var path = require('path');
var recast = require('recast');
var renamer = require('es6-imports-renamer');

function renameFn(originalPath, parentPath, callback) {
	callback(null, path.join(originalPath, 'index'));
}

var ast = recast.parse(fs.readFileSync('src/main'));
var options = {renameFn: renameFn, sources: [{ast: ast, path: 'src/main'}]};
renamer(options, function(error, resultAsts) {
	// Consume the renamed asts here.
});
```

The renamer will automatically load other needed dependencies and rename them as well.

## API

### config

- `basePath` **{string=}** Optional base path. If given, import sources will be renamed relative to it. Otherwise they will be renamed to absolute paths.
- `renameDependencies` **{boolean=}** Optional flag that indicates if dependencies declared on imports but not passed as sources should also be renamed. If so, the resulting asts for these dependencies will also be in the results array passed to `renameFn`.
- `renameFn` **{!function(Error, Array)}** The function to be used for renaming import sources. This function receives an error object as the first argument, or null if none was thrown. The second argument is an array with the resulting asts.
- `sources` **{!Array<{ast: !Object, path: string}>}** Contains the files that should start the renaming process. Each file should be represented as an object that points to that file's ast and its path.

### callback
Function to be called when the renaming is done.
