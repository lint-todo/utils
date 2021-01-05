# @ember-template-lint/todo-utils

![CI Build](https://github.com/ember-template-lint/ember-template-lint-todo-utils/workflows/CI%20Build/badge.svg)
[![npm version](https://badge.fury.io/js/%40ember-template-lint%2Ftodo-utils.svg)](https://badge.fury.io/js/%40ember-template-lint%2Ftodo-utils)
[![License](https://img.shields.io/npm/l/@checkup/cli.svg)](https://github.com/checkupjs/checkup/blob/master/package.json)
![Dependabot](https://badgen.net/badge/icon/dependabot?icon=dependabot&label)
![Volta Managed](https://img.shields.io/static/v1?label=volta&message=managed&color=yellow&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QAeQC6AMEpK7AhAAAACXBIWXMAAAsSAAALEgHS3X78AAAAB3RJTUUH5AMGFS07qAYEaAAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAFmSURBVDjLY2CgB/g/j0H5/2wGW2xyTAQ1r2DQYOBgm8nwh+EY6TYvZtD7f9rn5e81fAGka17GYPL/esObP+dyj5Cs+edqZsv/V8o//H+z7P+XHarW+NSyoAv8WsFszyKTtoVBM5Tn7/Xys+zf7v76vYrJlPEvAwPjH0YGxp//3jGl/L8LU8+IrPnPUkY3ZomoDQwOpZwMv14zMHy8yMDwh4mB4Q8jA8OTgwz/L299wMDyx4Mp9f9NDAP+bWVwY3jGsJpB3JaDQVCEgYHlLwPDfwYWRqVQJgZmHoZ/+3PPfWP+68Mb/Pw5sqUoLni9ipuRnekrAwMjA8Ofb6K8/PKBF5nU7RX+Hize8Y2DOZTP7+kXogPy1zrH+f/vT/j/Z5nUvGcr5VhJioUf88UC/59L+/97gUgDyVH4YzqXxL8dOs/+zuFLJivd/53HseLPPHZPsjT/nsHi93cqozHZue7rLDYhUvUAADjCgneouzo/AAAAAElFTkSuQmCC&link=https://volta.sh)
![TypeScript](https://badgen.net/badge/icon/typescript?icon=typescript&label)
[![Code Style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](#badge)

A collection of utilities to generate and store lint item metadata.

Those utilities are:

<!--DOCS_START-->

## Functions

<dl>
<dt><a href="#buildTodoData">buildTodoData(baseDir, lintResults, todoConfig)</a> ⇒</dt>
<dd><p>Adapts a list of <a href="LintResult">LintResult</a> to a map of <a href="FilePath">FilePath</a>, <a href="TodoData">TodoData</a>.</p>
</dd>
<dt><a href="#_buildTodoDatum">_buildTodoDatum(lintResult, lintMessage, todoConfig)</a> ⇒</dt>
<dd><p>Adapts an <a href="LintResult">LintResult</a> to a <a href="TodoData">TodoData</a>. FilePaths are absolute
when received from a lint result, so they&#39;re converted to relative paths for stability in
serializing the contents to disc.</p>
</dd>
<dt><a href="#todoStorageDirExists">todoStorageDirExists(baseDir)</a> ⇒</dt>
<dd><p>Determines if the .lint-todo storage directory exists.</p>
</dd>
<dt><a href="#ensureTodoStorageDirSync">ensureTodoStorageDirSync(baseDir)</a> ⇒</dt>
<dd><p>Creates, or ensures the creation of, the .lint-todo directory.</p>
</dd>
<dt><a href="#ensureTodoStorageDir">ensureTodoStorageDir(baseDir)</a> ⇒</dt>
<dd><p>Creates, or ensures the creation of, the .lint-todo directory.</p>
</dd>
<dt><a href="#getTodoStorageDirPath">getTodoStorageDirPath(baseDir)</a> ⇒</dt>
<dd></dd>
<dt><a href="#todoFilePathFor">todoFilePathFor(baseDir, todoData)</a> ⇒</dt>
<dd><p>Creates a file path from the linting data. Excludes extension.</p>
</dd>
<dt><a href="#todoDirFor">todoDirFor(filePath)</a> ⇒</dt>
<dd><p>Creates a short hash for the todo&#39;s file path.</p>
</dd>
<dt><a href="#todoFileNameFor">todoFileNameFor(todoData)</a> ⇒</dt>
<dd><p>Generates a unique filename for a todo lint data.</p>
</dd>
<dt><a href="#writeTodosSync">writeTodosSync(baseDir, lintResults, filePath, todoConfig)</a> ⇒</dt>
<dd><p>Writes files for todo lint violations. One file is generated for each violation, using a generated
hash to identify each.</p>
<p>Given a list of todo lint violations, this function will also delete existing files that no longer
have a todo lint violation.</p>
</dd>
<dt><a href="#writeTodos">writeTodos(baseDir, lintResults, filePath, todoConfig)</a> ⇒</dt>
<dd><p>Writes files for todo lint violations. One file is generated for each violation, using a generated
hash to identify each.</p>
<p>Given a list of todo lint violations, this function will also delete existing files that no longer
have a todo lint violation.</p>
</dd>
<dt><a href="#readTodosSync">readTodosSync(baseDir)</a> ⇒</dt>
<dd><p>Reads all todo files in the .lint-todo directory.</p>
</dd>
<dt><a href="#readTodos">readTodos(baseDir)</a> ⇒</dt>
<dd><p>Reads all todo files in the .lint-todo directory.</p>
</dd>
<dt><a href="#readTodosForFilePathSync">readTodosForFilePathSync(todoStorageDir, filePath)</a> ⇒</dt>
<dd><p>Reads todo files in the .lint-todo directory for a specific filePath.</p>
</dd>
<dt><a href="#readTodosForFilePath">readTodosForFilePath(todoStorageDir, filePath)</a> ⇒</dt>
<dd><p>Reads todo files in the .lint-todo directory for a specific filePath.</p>
</dd>
<dt><a href="#getTodoBatchesSync">getTodoBatchesSync(lintResults, existing)</a> ⇒</dt>
<dd><p>Gets 3 maps containing todo items to add, remove, or those that are stable (not to be modified).</p>
</dd>
<dt><a href="#getTodoBatches">getTodoBatches(lintResults, existing)</a> ⇒</dt>
<dd><p>Gets 3 maps containing todo items to add, remove, or those that are stable (not to be modified).</p>
</dd>
<dt><a href="#applyTodoChangesSync">applyTodoChangesSync(todoStorageDir, add, remove)</a></dt>
<dd><p>Applies todo changes, either adding or removing, based on batches from <code>getTodoBatches</code>.</p>
</dd>
<dt><a href="#applyTodoChanges">applyTodoChanges(todoStorageDir, add, remove)</a></dt>
<dd><p>Applies todo changes, either adding or removing, based on batches from <code>getTodoBatches</code>.</p>
</dd>
<dt><a href="#getTodoConfig">getTodoConfig(baseDir, todoConfig)</a> ⇒</dt>
<dd><p>Gets the todo configuration.
Config values can be present in</p>
<p>The package.json</p>
</dd>
</dl>

<a name="buildTodoData"></a>

## buildTodoData(baseDir, lintResults, todoConfig) ⇒
Adapts a list of [LintResult](LintResult) to a map of [FilePath](FilePath), [TodoData](TodoData).

**Kind**: global function  
**Returns**: - A Promise resolving to a [Map](Map) of [FilePath](FilePath)/[TodoData](TodoData).  

| Param | Description |
| --- | --- |
| baseDir | The base directory that contains the .lint-todo storage directory. |
| lintResults | A list of [LintResult](LintResult) objects to convert to [TodoData](TodoData) objects. |
| todoConfig | An object containing the warn or error days, in integers. |

<a name="_buildTodoDatum"></a>

## \_buildTodoDatum(lintResult, lintMessage, todoConfig) ⇒
Adapts an [LintResult](LintResult) to a [TodoData](TodoData). FilePaths are absolute
when received from a lint result, so they're converted to relative paths for stability in
serializing the contents to disc.

**Kind**: global function  
**Returns**: - A [TodoData](TodoData) object.  

| Param | Description |
| --- | --- |
| lintResult | The lint result object. |
| lintMessage | A lint message object representing a specific violation for a file. |
| todoConfig | An object containing the warn or error days, in integers. |

<a name="todoStorageDirExists"></a>

## todoStorageDirExists(baseDir) ⇒
Determines if the .lint-todo storage directory exists.

**Kind**: global function  
**Returns**: - true if the todo storage directory exists, otherwise false.  

| Param | Description |
| --- | --- |
| baseDir | The base directory that contains the .lint-todo storage directory. |

<a name="ensureTodoStorageDirSync"></a>

## ensureTodoStorageDirSync(baseDir) ⇒
Creates, or ensures the creation of, the .lint-todo directory.

**Kind**: global function  
**Returns**: - The todo storage directory path.  

| Param | Description |
| --- | --- |
| baseDir | The base directory that contains the .lint-todo storage directory. |

<a name="ensureTodoStorageDir"></a>

## ensureTodoStorageDir(baseDir) ⇒
Creates, or ensures the creation of, the .lint-todo directory.

**Kind**: global function  
**Returns**: - A promise that resolves to the todo storage directory path.  

| Param | Description |
| --- | --- |
| baseDir | The base directory that contains the .lint-todo storage directory. |

<a name="getTodoStorageDirPath"></a>

## getTodoStorageDirPath(baseDir) ⇒
**Kind**: global function  
**Returns**: - The todo storage directory path.  

| Param | Description |
| --- | --- |
| baseDir | The base directory that contains the .lint-todo storage directory. |

<a name="todoFilePathFor"></a>

## todoFilePathFor(baseDir, todoData) ⇒
Creates a file path from the linting data. Excludes extension.

**Kind**: global function  
**Returns**: - The todo file path for a [TodoData](TodoData) object.  

| Param | Description |
| --- | --- |
| baseDir | The base directory that contains the .lint-todo storage directory. |
| todoData | The linting data for an individual violation. |

**Example**  
```js
42b8532cff6da75c5e5895a6f33522bf37418d0c/6e3be839
```
<a name="todoDirFor"></a>

## todoDirFor(filePath) ⇒
Creates a short hash for the todo's file path.

**Kind**: global function  
**Returns**: - The todo directory for a specific filepath.  

| Param | Description |
| --- | --- |
| filePath | The filePath from linting data for an individual violation. |

<a name="todoFileNameFor"></a>

## todoFileNameFor(todoData) ⇒
Generates a unique filename for a todo lint data.

**Kind**: global function  
**Returns**: - The todo file name for a [TodoData](TodoData) object.  

| Param | Description |
| --- | --- |
| todoData | The linting data for an individual violation. |

<a name="writeTodosSync"></a>

## writeTodosSync(baseDir, lintResults, filePath, todoConfig) ⇒
Writes files for todo lint violations. One file is generated for each violation, using a generated
hash to identify each.

Given a list of todo lint violations, this function will also delete existing files that no longer
have a todo lint violation.

**Kind**: global function  
**Returns**: - The todo storage directory path.  

| Param | Description |
| --- | --- |
| baseDir | The base directory that contains the .lint-todo storage directory. |
| lintResults | The raw linting data. |
| filePath | The relative file path of the file to update violations for. |
| todoConfig | An object containing the warn or error days, in integers. |

<a name="writeTodos"></a>

## writeTodos(baseDir, lintResults, filePath, todoConfig) ⇒
Writes files for todo lint violations. One file is generated for each violation, using a generated
hash to identify each.

Given a list of todo lint violations, this function will also delete existing files that no longer
have a todo lint violation.

**Kind**: global function  
**Returns**: - A promise that resolves to the todo storage directory path.  

| Param | Description |
| --- | --- |
| baseDir | The base directory that contains the .lint-todo storage directory. |
| lintResults | The raw linting data. |
| filePath | The relative file path of the file to update violations for. |
| todoConfig | An object containing the warn or error days, in integers. |

<a name="readTodosSync"></a>

## readTodosSync(baseDir) ⇒
Reads all todo files in the .lint-todo directory.

**Kind**: global function  
**Returns**: - A [Map](Map) of [FilePath](FilePath)/[TodoData](TodoData).  

| Param | Description |
| --- | --- |
| baseDir | The base directory that contains the .lint-todo storage directory. |

<a name="readTodos"></a>

## readTodos(baseDir) ⇒
Reads all todo files in the .lint-todo directory.

**Kind**: global function  
**Returns**: - A Promise that resolves to a [Map](Map) of [FilePath](FilePath)/[TodoData](TodoData).  

| Param | Description |
| --- | --- |
| baseDir | The base directory that contains the .lint-todo storage directory. |

<a name="readTodosForFilePathSync"></a>

## readTodosForFilePathSync(todoStorageDir, filePath) ⇒
Reads todo files in the .lint-todo directory for a specific filePath.

**Kind**: global function  
**Returns**: - A [Map](Map) of [FilePath](FilePath)/[TodoData](TodoData).  

| Param | Description |
| --- | --- |
| todoStorageDir | The .lint-todo storage directory. |
| filePath | The relative file path of the file to return todo items for. |

<a name="readTodosForFilePath"></a>

## readTodosForFilePath(todoStorageDir, filePath) ⇒
Reads todo files in the .lint-todo directory for a specific filePath.

**Kind**: global function  
**Returns**: - A Promise that resolves to a [Map](Map) of [FilePath](FilePath)/[TodoData](TodoData).  

| Param | Description |
| --- | --- |
| todoStorageDir | The .lint-todo storage directory. |
| filePath | The relative file path of the file to return todo items for. |

<a name="getTodoBatchesSync"></a>

## getTodoBatchesSync(lintResults, existing) ⇒
Gets 3 maps containing todo items to add, remove, or those that are stable (not to be modified).

**Kind**: global function  
**Returns**: - A [Map](Map) of [FilePath](FilePath)/[TodoData](TodoData).  

| Param | Description |
| --- | --- |
| lintResults | The linting data for all violations. |
| existing | Existing todo lint data. |

<a name="getTodoBatches"></a>

## getTodoBatches(lintResults, existing) ⇒
Gets 3 maps containing todo items to add, remove, or those that are stable (not to be modified).

**Kind**: global function  
**Returns**: - A Promise that resolves to a [Map](Map) of [FilePath](FilePath)/[TodoData](TodoData).  

| Param | Description |
| --- | --- |
| lintResults | The linting data for all violations. |
| existing | Existing todo lint data. |

<a name="applyTodoChangesSync"></a>

## applyTodoChangesSync(todoStorageDir, add, remove)
Applies todo changes, either adding or removing, based on batches from `getTodoBatches`.

**Kind**: global function  

| Param | Description |
| --- | --- |
| todoStorageDir | The .lint-todo storage directory. |
| add | Batch of todos to add. |
| remove | Batch of todos to remove. |

<a name="applyTodoChanges"></a>

## applyTodoChanges(todoStorageDir, add, remove)
Applies todo changes, either adding or removing, based on batches from `getTodoBatches`.

**Kind**: global function  

| Param | Description |
| --- | --- |
| todoStorageDir | The .lint-todo storage directory. |
| add | Batch of todos to add. |
| remove | Batch of todos to remove. |

<a name="getTodoConfig"></a>

## getTodoConfig(baseDir, todoConfig) ⇒
Gets the todo configuration.
Config values can be present in

The package.json

**Kind**: global function  
**Returns**: - The todo config object.  

| Param | Description |
| --- | --- |
| baseDir | The base directory that contains the project's package.json. |
| todoConfig | The optional todo configuration. |

**Example**  
```json
{
  "lintTodo": {
    "daysToDecay": {
      "warn": 5,
			 "error": 10
		 }
  }
}
```

Environment variables (`TODO_DAYS_TO_WARN` or `TODO_DAYS_TO_ERROR`)
	- Env vars override package.json config

Passed in directly, such as from command line options.
	- Passed in options override both env vars and package.json config

<!--DOCS_END-->
