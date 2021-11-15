# Single File Storage

The current implementation of linting todos stores files under a directory, one directory for each filePath, and one file under a filePaths' directory corresponding to each linting result converted into a todo.

Example:

```bash
.lint-todo
├── 004cd2f9b085f4c9db1664af6858d99e3464c97e
│   └── a08dedcd.json
├── 009af62711dd1bc4af069947245e02e2fe164442
│   ├── 48f6fc43.json
│   ├── 54dcf7c0.json
│   ├── 6cf70bf7.json
│   └── ba085f80.json
├── 00fb122e1ab3e107d53708aea7e47d17e3cb3a16
│   └── 53558e31.json
├── 01e92d66ba69e66073ba82e4a79afb7c6f61881c
│   ├── 00d85c5b.json
│   ├── 0297af6a.json
│   ├── 0405378a.json
│   ├── 0453bb81.json
```

This design was put in place in an attempt to minimize the number of conflicts a user would encounter when working on a large project with lots of todos. To date it's worked fairly well, though does not solve for all conflicts; those have to be handled on a case-by-case basis.

While this method has allowed us to rollout lint todos across a broad range of projects, there are some drawbacks. The most egrigious of these is the fact that any time updates are made to todos, there are numerous files that are changed, and those changes are subsequently staged in version control. This can result in multiple changes in code reviews that are essentially unnecessary to visualize. Said another way, todos should be present, but should be considered metadata, similar to what a .git directory operates like in a repository.

Due to the above, it makes sense to explore single files for todos.

## The Requirements

The current set of requirements are as follows:

- Changes from a multi-file solution to a single-file solution shouldn't cause changes to the todo matching algorithm
- Data stored in the single file should be deterministic across machines
- Conflicts should be kept to a minimum, and should be easily resolveable
- Migration from the existing format to the new format should be as simple as possible, potentially happening automatically (with a message indicating that the structure has changed, since changes will be tracked by VCS)

## The Approach

In order to move from multi-file storage to single-file storage, the following changes are proposed:

- Todos will move from multiple files in multiple directories into a single .lint-todo file
- The new .lint-todo file will utilize a operation-based conflict-free replicated data type ([CRTD](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type#Operation-based_CRDTs)) to model the operations to build up the current set of todos
- Each line in the file will correspond to an operation, which will be limited to
  - add
  - remove
  - update (in future) - will allow for fuzzy matches to be updated on-demand, or convert them into exact matches
- The current set of todos will be "rebuilt" during the read of the .lint-todo file
  - Each line will be read, and will operate on the map of todos
  - Adds will add the todo - multiple adds are safe
  - Removes will remove the todo - multiple removes are safe
- Conflicts will be resolved by taking both "ours" and "theirs" sides of merge conflicts

All other parts of the algorithm for todos, such as the batching and subsequent matching, will stay the same.

### Single file structure

As mentioned, we'll convert to using a single line, special character-delimited form of data storage. In order to avoid issues with conflicting special characters, well choose the following:

1. Explicit `\n` for newlines to denote separation between todo lines
1. The pipe character, or `|`, will delineate todo item properties, which will be positional based and stable

A sample of the file structure is below:

```
add|ember-template-lint|no-redundant-fn|23|12|23|12|61dd34a91c774f5df4f80572ad319205f74c768a|2|1629331200000|1633219200000|1637110800000|addon/templates/components/approval/approval-typeahead.hbs
add|ember-template-lint|no-implicit-this|15|8|15|8|37ea8c8af95d9656d642237fa0556a2c70c78863|2|1629331200000|2493248400000|2493334800000|addon/templates/components/post-page/employment-type.hbs
add|ember-template-lint|no-implicit-this|13|15|13|15|9e9c1a994b167dcc641c8cdbd9ee610cd2faf404|2|1629331200000|2493248400000|2493334800000|addon/templates/components/post-page/employment-type.hbs
add|ember-template-lint|no-implicit-this|8|10|8|10|513f8de9259fe7658fe14d1352c54ccf070e911f|2|1629331200000|2493248400000|2493334800000|addon/templates/components/post-page/employment-type.hbs
add|ember-template-lint|no-action|14|12|14|12|ec0e6178b3c53d1c171088ad2ed6d697c4fef6a7|2|1631664000000|2495581200000|2495667600000|addon/templates/components/post-page/employment-type.hbs
add|ember-template-lint|prettier|157|39|157|39|1ecbbfff64158a0130dce3ddef01a83bfd777c80|2|1631664000000|1635552000000|1639443600000|addon/components/shared/company-email-confirm-modal.hbs
add|ember-template-lint|no-implicit-this|233|17|233|17|bfb289eb00ac359c1e6653978c2b81702e87df43|2|1629331200000|2493248400000|2493334800000|addon/templates/components/enhance-page.hbs
...
```

Todos will be stored in a `Map<FilePath, TodoMatcher>`. The file will be read, line by line, and each operation will either add or remove a todo from the resulting map, culminating in the fully materialized map of todos.

There are some rules to observe when reading the file:

- Add operations will add todos to the map
- Add operations can be done with the same todo multiple times, but will only add it once
- Add operations with the same todo with different date properties will overwrite the existing todo
- Remove operations will remove todos from the map
- Remove operations can be done with the same todo multiple times, but will only remove it once
- The file should be read line by line, and the operations should be applied in the order they are read

Writes back to the file will be in the form of descrete operations for that session, again in the form of adds or removes.

### Compacting the file

The file may be large, and we may want to compact it to save space. This is done by performing a read with all the current operations, generating the fully materialized map of todos, and then writing the file back with only those todos contained in the map as `add` operations. This will result in a file that is much smaller, but still contains all the current todos.
