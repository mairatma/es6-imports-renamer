es6-rename-imports
===================================

Renames paths from es6 import declarations.

## Usage

// TODO

## API

### config

- `sources` {!Array<{ast: !Object, path: string}>} Contains the files that should start the renaming process. Each file should be represented as an object that points to that file's ast and its path.
- `basePath` {?string} Optional base path. If given, import sources will be renamed relative to it. Otherwise they will be renamed to absolute paths.

### callback
Function to be called when the renaming is done.
