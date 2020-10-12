# @ember-template-lint/todo-utils

![CI Build](https://github.com/ember-template-lint/ember-template-lint-todo-utils/workflows/CI%20Build/badge.svg)

A collection of utilities to generate and store lint item metadata.

Those utilities are:

<dl>
<dt><a href="#buildTodoData">buildTodoData(lintResults)</a></dt>
<dd><p>Adapts a list of <a href="https://github.com/DefinitelyTyped/DefinitelyTyped/blob/160f43ae6852c4eefec2641e54cff96dd7b63488/types/eslint/index.d.ts#L640">ESLint.LintResult</a>
or <a href="TemplateLintResult">TemplateLintResult</a> to a map of <a href="FilePath">FilePath</a>, <a href="TodoData">TodoData</a>.</p>
</dd>
<dt><a href="#ensureTodoDir">ensureTodoDir(baseDir)</a></dt>
<dd><p>Creates, or ensures the creation of, the .lint-todo directory.</p>
</dd>
<dt><a href="#getTodoStorageDirPath">getTodoStorageDirPath(baseDir)</a></dt>
<dd></dd>
<dt><a href="#todoFilePathFor">todoFilePathFor(todoData)</a></dt>
<dd><p>Creates a file path from the linting data. Excludes extension.</p>
</dd>
<dt><a href="#todoDirFor">todoDirFor(filePath)</a></dt>
<dd><p>Creates a short hash for the todo&#39;s file path.</p>
</dd>
<dt><a href="#todoFileNameFor">todoFileNameFor(todoData)</a></dt>
<dd><p>Generates a unique filename for a todo lint data.</p>
</dd>
<dt><a href="#writeTodos">writeTodos(baseDir, lintResults, filePath?)</a></dt>
<dd><p>Writes files for todo lint violations. One file is generated for each violation, using a generated
hash to identify each.</p>
<p>Given a list of todo lint violations, this function will also delete existing files that no longer
have a todo lint violation.</p>
</dd>
<dt><a href="#readTodos">readTodos(todoStorageDir, filePath?)</a></dt>
<dd><p>Reads all todo files in the .lint-todo directory.</p>
</dd>
<dt><a href="#getTodoBatches">getTodoBatches(lintResults, existing)</a></dt>
<dd><p>Gets 3 maps containing todo items to add, remove, or those that are stable (not to be modified).</p>
</dd>
</dl>

<a name="buildTodoData"></a>

## buildTodoData(lintResults)

Adapts a list of [ESLint.LintResult](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/160f43ae6852c4eefec2641e54cff96dd7b63488/types/eslint/index.d.ts#L640)
or [TemplateLintResult](TemplateLintResult) to a map of [FilePath](FilePath), [TodoData](TodoData).

**Kind**: global function

| Param       | Type                    | Description                                         |
| ----------- | ----------------------- | --------------------------------------------------- |
| lintResults | <code>LintResult</code> | A list of objects to convert to {TodoData} objects. |

<a name="ensureTodoDir"></a>

## ensureTodoDir(baseDir)

Creates, or ensures the creation of, the .lint-todo directory.

**Kind**: global function

| Param   | Description                                                        |
| ------- | ------------------------------------------------------------------ |
| baseDir | The base directory that contains the .lint-todo storage directory. |

<a name="getTodoStorageDirPath"></a>

## getTodoStorageDirPath(baseDir)

**Kind**: global function

| Param   | Description                                                        |
| ------- | ------------------------------------------------------------------ |
| baseDir | The base directory that contains the .lint-todo storage directory. |

<a name="todoFilePathFor"></a>

## todoFilePathFor(todoData)

Creates a file path from the linting data. Excludes extension.

**Kind**: global function

| Param    | Description                                   |
| -------- | --------------------------------------------- |
| todoData | The linting data for an individual violation. |

**Example**

```js
42b8532cff6da75c5e5895a6f33522bf37418d0c/6e3be839
```

<a name="todoDirFor"></a>

## todoDirFor(filePath)

Creates a short hash for the todo's file path.

**Kind**: global function

| Param    | Description                                                 |
| -------- | ----------------------------------------------------------- |
| filePath | The filePath from linting data for an individual violation. |

<a name="todoFileNameFor"></a>

## todoFileNameFor(todoData)

Generates a unique filename for a todo lint data.

**Kind**: global function

| Param    | Description                                   |
| -------- | --------------------------------------------- |
| todoData | The linting data for an individual violation. |

<a name="writeTodos"></a>

## writeTodos(baseDir, lintResults, filePath?)

Writes files for todo lint violations. One file is generated for each violation, using a generated
hash to identify each.

Given a list of todo lint violations, this function will also delete existing files that no longer
have a todo lint violation.

**Kind**: global function

| Param       | Description                                                        |
| ----------- | ------------------------------------------------------------------ |
| baseDir     | The base directory that contains the .lint-todo storage directory. |
| lintResults | The raw linting data.                                              |
| filePath?   | The absolute file path of the file to update violations for.       |

<a name="readTodos"></a>

## readTodos(todoStorageDir, filePath?)

Reads all todo files in the .lint-todo directory.

**Kind**: global function

| Param          | Description                                                  |
| -------------- | ------------------------------------------------------------ |
| todoStorageDir | The .lint-todo storage directory.                            |
| filePath?      | The absolute file path of the file to return todo items for. |

<a name="getTodoBatches"></a>

## getTodoBatches(lintResults, existing)

Gets 3 maps containing todo items to add, remove, or those that are stable (not to be modified).

**Kind**: global function

| Param       | Description                          |
| ----------- | ------------------------------------ |
| lintResults | The linting data for all violations. |
| existing    | Existing todo lint data.             |
