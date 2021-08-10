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
<dt><a href="#buildTodoDatum">buildTodoDatum(lintResult, lintMessage, todoConfig)</a> ⇒</dt>
<dd><p>Adapts a <a href="https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/lint.ts#L31">LintResult</a> to a <a href="https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/todo.ts#L61">TodoDataV2</a>. FilePaths are absolute
when received from a lint result, so they&#39;re converted to relative paths for stability in
serializing the contents to disc.</p>
</dd>
<dt><a href="#todoStorageDirExists">todoStorageDirExists(baseDir)</a> ⇒</dt>
<dd><p>Determines if the .lint-todo storage directory exists.</p>
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
<dt><a href="#writeTodos">writeTodos(baseDir, maybeTodos, options)</a> ⇒</dt>
<dd><p>Writes files for todo lint violations. One file is generated for each violation, using a generated
hash to identify each.</p>
<p>Given a list of todo lint violations, this function will also delete existing files that no longer
have a todo lint violation.</p>
</dd>
<dt><a href="#readTodos">readTodos(baseDir)</a> ⇒</dt>
<dd><p>Reads all todo files in the .lint-todo directory.</p>
</dd>
<dt><a href="#readTodosForFilePath">readTodosForFilePath(todoStorageDir, filePath)</a> ⇒</dt>
<dd><p>Reads todo files in the .lint-todo directory for a specific filePath.</p>
</dd>
<dt><a href="#readTodoData">readTodoData(baseDir)</a> ⇒</dt>
<dd><p>Reads todo files in the .lint-todo directory and returns Todo data in an array.</p>
</dd>
<dt><a href="#getTodoBatches">getTodoBatches(maybeTodos, existing, options)</a> ⇒</dt>
<dd><p>Gets 4 maps containing todo items to add, remove, those that are expired, or those that are stable (not to be modified).</p>
</dd>
<dt><a href="#applyTodoChanges">applyTodoChanges(todoStorageDir, add, remove)</a></dt>
<dd><p>Applies todo changes, either adding or removing, based on batches from <code>getTodoBatches</code>.</p>
</dd>
<dt><a href="#getTodoConfig">getTodoConfig(baseDir, engine, customDaysToDecay)</a> ⇒</dt>
<dd><p>Gets the todo configuration.
Config values can be present in</p>
<p>The package.json</p>
</dd>
<dt><a href="#validateConfig">validateConfig(baseDir)</a> ⇒</dt>
<dd><p>Validates whether we have a unique config in a single location.</p>
</dd>
<dt><a href="#getSeverity">getSeverity(todo, today)</a> ⇒</dt>
<dd><p>Returns the correct severity level based on the todo data&#39;s decay dates.</p>
</dd>
<dt><a href="#isExpired">isExpired(date, today)</a> ⇒</dt>
<dd><p>Evaluates whether a date is expired (earlier than today)</p>
</dd>
<dt><a href="#getDatePart">getDatePart(date)</a> ⇒</dt>
<dd><p>Converts a date to include year, month, and day values only (time is zeroed out).</p>
</dd>
<dt><a href="#differenceInDays">differenceInDays(startDate, endDate)</a> ⇒</dt>
<dd><p>Returns the difference in days between two dates.</p>
</dd>
<dt><a href="#format">format(date)</a> ⇒</dt>
<dd><p>Formats the date in short form, eg. 2021-01-01</p>
</dd>
</dl>

<a name="buildTodoDatum"></a>

## buildTodoDatum(lintResult, lintMessage, todoConfig) ⇒
Adapts a [LintResult](https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/lint.ts#L31) to a [TodoDataV2](https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/todo.ts#L61). FilePaths are absolute
when received from a lint result, so they're converted to relative paths for stability in
serializing the contents to disc.

**Kind**: global function  
**Returns**: - A [TodoDataV2](https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/todo.ts#L61) object.  

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

<a name="ensureTodoStorageDir"></a>

## ensureTodoStorageDir(baseDir) ⇒
Creates, or ensures the creation of, the .lint-todo directory.

**Kind**: global function  
**Returns**: - The todo storage directory path.  

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
**Returns**: - The todo file path for a [TodoDataV2](https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/todo.ts#L61) object.  

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
**Returns**: - The todo file name for a [TodoDataV2](https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/todo.ts#L61) object.  

| Param | Description |
| --- | --- |
| todoData | The linting data for an individual violation. |

<a name="writeTodos"></a>

## writeTodos(baseDir, maybeTodos, options) ⇒
Writes files for todo lint violations. One file is generated for each violation, using a generated
hash to identify each.

Given a list of todo lint violations, this function will also delete existing files that no longer
have a todo lint violation.

**Kind**: global function  
**Returns**: - The counts of added and removed todos.  

| Param | Description |
| --- | --- |
| baseDir | The base directory that contains the .lint-todo storage directory. |
| maybeTodos | The linting data, converted to TodoDataV2 format. |
| options | An object containing write options. |

<a name="readTodos"></a>

## readTodos(baseDir) ⇒
Reads all todo files in the .lint-todo directory.

**Kind**: global function  
**Returns**: - A [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) of [TodoFilePathHash](https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/todo.ts#L26)/[TodoMatcher](https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/todo-matcher.ts#L4).  

| Param | Description |
| --- | --- |
| baseDir | The base directory that contains the .lint-todo storage directory. |

<a name="readTodosForFilePath"></a>

## readTodosForFilePath(todoStorageDir, filePath) ⇒
Reads todo files in the .lint-todo directory for a specific filePath.

**Kind**: global function  
**Returns**: - A [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) of [TodoFilePathHash](https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/todo.ts#L26)/[TodoMatcher](https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/todo-matcher.ts#L4).  

| Param | Description |
| --- | --- |
| todoStorageDir | The .lint-todo storage directory. |
| filePath | The relative file path of the file to return todo items for. |

<a name="readTodoData"></a>

## readTodoData(baseDir) ⇒
Reads todo files in the .lint-todo directory and returns Todo data in an array.

**Kind**: global function  
**Returns**: An array of [TodoDataV2](https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/todo.ts#L61)  

| Param | Description |
| --- | --- |
| baseDir | The base directory that contains the .lint-todo storage directory. |

<a name="getTodoBatches"></a>

## getTodoBatches(maybeTodos, existing, options) ⇒
Gets 4 maps containing todo items to add, remove, those that are expired, or those that are stable (not to be modified).

**Kind**: global function  
**Returns**: - An object of [TodoBatches](https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/todo.ts#L36).  

| Param | Description |
| --- | --- |
| maybeTodos | The linting data for violations. |
| existing | Existing todo lint data. |
| options | An object containing write options. |

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

## getTodoConfig(baseDir, engine, customDaysToDecay) ⇒
Gets the todo configuration.
Config values can be present in

The package.json

**Kind**: global function  
**Returns**: - The todo config object.  

| Param | Description |
| --- | --- |
| baseDir | The base directory that contains the project's package.json. |
| engine | The engine for this configuration, eg. eslint |
| customDaysToDecay | The optional custom days to decay configuration. |

**Example**  
```json
{
  "lintTodo": {
    "some-engine": {
      "daysToDecay": {
        "warn": 5,
        "error": 10
      },
      "daysToDecayByRule": {
        "no-bare-strings": { "warn": 10, "error": 20 }
      }
    }
  }
}
```

A .lint-todorc.js file
**Example**  
```js
module.exports = {
  "some-engine": {
    "daysToDecay": {
      "warn": 5,
      "error": 10
    },
    "daysToDecayByRule": {
      "no-bare-strings": { "warn": 10, "error": 20 }
    }
  }
}
```

Environment variables (`TODO_DAYS_TO_WARN` or `TODO_DAYS_TO_ERROR`)
	- Env vars override package.json config

Passed in directly, such as from command line options.
	- Passed in options override both env vars and package.json config
<a name="validateConfig"></a>

## validateConfig(baseDir) ⇒
Validates whether we have a unique config in a single location.

**Kind**: global function  
**Returns**: A ConfigValidationResult that indicates whether a config is unique  

| Param | Description |
| --- | --- |
| baseDir | The base directory that contains the project's package.json. |

<a name="getSeverity"></a>

## getSeverity(todo, today) ⇒
Returns the correct severity level based on the todo data's decay dates.

**Kind**: global function  
**Returns**: Severity - the lint severity based on the evaluation of the decay dates.  

| Param | Description |
| --- | --- |
| todo | The todo data. |
| today | A number representing a date (UNIX Epoch - milliseconds) |

<a name="isExpired"></a>

## isExpired(date, today) ⇒
Evaluates whether a date is expired (earlier than today)

**Kind**: global function  
**Returns**: true if the date is earlier than today, otherwise false  

| Param | Description |
| --- | --- |
| date | The date to evaluate |
| today | A number representing a date (UNIX Epoch - milliseconds) |

<a name="getDatePart"></a>

## getDatePart(date) ⇒
Converts a date to include year, month, and day values only (time is zeroed out).

**Kind**: global function  
**Returns**: Date - A date with the time zeroed out eg. '2021-01-01T08:00:00.000Z'  

| Param | Description |
| --- | --- |
| date | The date to convert |

<a name="differenceInDays"></a>

## differenceInDays(startDate, endDate) ⇒
Returns the difference in days between two dates.

**Kind**: global function  
**Returns**: a number representing the days between the dates  

| Param | Description |
| --- | --- |
| startDate | The start date |
| endDate | The end date |

<a name="format"></a>

## format(date) ⇒
Formats the date in short form, eg. 2021-01-01

**Kind**: global function  
**Returns**: A string representing the formatted date  

| Param | Description |
| --- | --- |
| date | The date to format |


<!--DOCS_END-->
