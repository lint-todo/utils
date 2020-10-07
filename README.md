# @ember-template-lint/todo-utils

![CI Build](https://github.com/ember-template-lint/ember-template-lint-todo-utils/workflows/CI%20Build/badge.svg)

A collection of utilities to generate and store lint item metadata.

Those utilities are:

<dl>
<dt><a href="#buildTodoData">buildTodoData(lintResults)</a></dt>
<dd><p>Adapts a list of {ESLint.LintResult} or {TemplateLintResult} to a map of fileHash, todoDatum.</p>
</dd>
<dt><a href="#ensureTodoDir">ensureTodoDir(baseDir)</a></dt>
<dd><p>Creates, or ensures the creation of, the .lint-todo directory.</p>
</dd>
<dt><a href="#generateFileName">generateFileName(todoData)</a></dt>
<dd><p>Generates a unique filename for a todo lint data.</p>
</dd>
<dt><a href="#generateTodoFiles">generateTodoFiles(baseDir, lintResults, filePath?)</a></dt>
<dd><p>Generates files for todo lint violations. One file is generated for each violation, using a generated
hash to identify each.</p>
<p>Given a list of todo lint violations, this function will also delete existing files that no longer
have a todo lint violation.</p>
</dd>
<dt><a href="#readTodoFiles">readTodoFiles(todoDir, filePath?)</a></dt>
<dd><p>Reads all todo files in the .lint-todo directory.</p>
</dd>
<dt><a href="#getTodoBatches">getTodoBatches(lintResults, existing)</a></dt>
<dd><p>Gets 3 maps containing todo items to add, remove, or those that are stable (not to be modified).</p>
</dd>
</dl>

<a name="buildTodoData"></a>

## buildTodoData(lintResults)

Adapts a list of {ESLint.LintResult} or {TemplateLintResult} to a map of fileHash, todoDatum.

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

<a name="generateFileName"></a>

## generateFileName(todoData)

Generates a unique filename for a todo lint data.

**Kind**: global function

| Param    | Description                                   |
| -------- | --------------------------------------------- |
| todoData | The linting data for an individual violation. |

<a name="generateTodoFiles"></a>

## generateTodoFiles(baseDir, lintResults, filePath?)

Generates files for todo lint violations. One file is generated for each violation, using a generated
hash to identify each.

Given a list of todo lint violations, this function will also delete existing files that no longer
have a todo lint violation.

**Kind**: global function

| Param       | Description                                                        |
| ----------- | ------------------------------------------------------------------ |
| baseDir     | The base directory that contains the .lint-todo storage directory. |
| lintResults | The raw linting data.                                              |
| filePath?   | The absolute file path of the file to update violations for.       |

<a name="readTodoFiles"></a>

## readTodoFiles(todoDir, filePath?)

Reads all todo files in the .lint-todo directory.

**Kind**: global function

| Param     | Description                                                  |
| --------- | ------------------------------------------------------------ |
| todoDir   | The .lint-todo storage directory.                            |
| filePath? | The absolute file path of the file to return todo items for. |

<a name="getTodoBatches"></a>

## getTodoBatches(lintResults, existing)

Gets 3 maps containing todo items to add, remove, or those that are stable (not to be modified).

**Kind**: global function

| Param       | Description                          |
| ----------- | ------------------------------------ |
| lintResults | The linting data for all violations. |
| existing    | Existing todo lint data.             |
