- Feature Name: (fill me in with a unique id, my_awesome_feature)
- Start Date: (fill me in with today's date, YYYY-MM-DD)
- RFC PR: (leave this empty)
- Checkup Issue: (leave this empty)

# Summary

[summary]: #summary

This RFC proposes creating a set of functionality to enhance linting such that it allows for new lint rules introduced into
codebases to progress through a "todo" state, allowing for incremental rollouts of new rules across large codebases.

# Motivation

[motivation]: #motivation

Linting is a fundamental tool to help ensure the quality of a codebase. Ensuring there are as few linting errors as
possible (ideally 0), is a useful measure of a baseline of code hygiene.

It's common to leverage linting not just for syntax adherence, but also to direct developers to employ standardized patterns. As
such, it's a fairly routine activity to introduce new lint rules into a codebase. This introduction, while necessary, can cause
unintended friction, such as

- new lint errors being introduced where they previously didn't exist
- causing unintended delays to shipping new fixes and features
- an "all or nothing" approach, where new rules require fixing before rollout.

Having the ability to identify violations as `todo` would allow for this incremental roll out, while providing tools that will allow maintainers to view the full list of todo violations. Todo violations can include a createdDate, allowing thresholds of time to trigger due date violations. This can assist in prioritizing lint rule violation fixes, and can ensure the todo list doesn't remain stagnant.

# Pedagogy

[pedagogy]: #pedagogy

- There will be documentation on how to configure and use the `todo` feature
- The new `todo` feature will integrate seamlessly with existing linting tools
- There will be a common command to list all todo violations
- There will be a common command to list past-due todo violations
- There will be a common command to regenerate the todo violations list

# Details

[details]: #details

## Requirements

- violations added to todo list MUST not fail any existing lint checks (`yarn lint*` or `yarn test`) and result in failed local runs _or_ CI runs
- violations added to todo list MUST fail in the editor (and thus encourage fixing and, ultimately, code quality improvement)
- a file that doesn't contain any violations (but may have todo items generated for this file) will not trigger an error in the editor for that file
- updating `todo` list MUST be automated
- after fixing a `todo` violation, lint checks MUST fail until the `todo` list is regenerated
- `todo` list CAN be regenerated anytime
- running with a `--fix` flag SHOULD cause an update to the `todo` list
- identifying a violation as `todo` SHOULD not require any modifications to the file the violation occurred in
- updating the todo list MUST not result in merge conflicts
- todo list directory MUST not be ignored by version control

## Implementation

### High Level Flow

The implementation of the `todo` feature will extend and enhance existing linting tools.

Upon first generation of the list of todo lint rules, any existing lint violation will be marked as todo by creating a file that includes identifiable details for that specific lint violation (file, line, column). That todo list will be serialized to disc, one file per violation. The respective lint tool can be run, using that list to identify rules that should not be considered `error` severity for certain key situation (a CI system, for instance, where we don't want to block merges).

### Workflows

#### `todo` list doesn't exist

- lint tool run to regenerate todo violation files

#### `todo` violation fixed

- rule violation is fixed in specific file
- lint tool detects violation has been fixed in specific file, errors
- lint tool re-run to regenerate todo violation files

#### `eslint`

**Normal linting workflow:**

- run with custom formatter, eg. `eslint . --format json-with-todo`
- passes results back to custom formatter
- formatter mutates [results array](https://eslint.org/docs/developer-guide/working-with-custom-formatters#the-results-object)
  - swaps severity to 1 (warn) from 2 (error) for all rules identfied as `todo`

**Update todo workflow:**

- run with custom formatter, eg. `UPDATE_TODO=1 eslint . --format json-with-todo`
- lint runs, any errors generated are considered todo
- passes results back to custom formatter
- formatter mutates [results array](https://eslint.org/docs/developer-guide/working-with-custom-formatters#the-results-object)
  - swaps severity to 1 (warning) from 2 (error) for all rules that error
  - decrements `errorCount` and increments `warningCount` for each `todo` violation
  - stores `todo` violation in array
  - writes `todo` violations to disc, one file per violation
  - ensures old `todo` violation files are removed

#### `ember-template-lint`

**Normal linting workflow**

- run `yarn ember-template-lint *`
- any errors generated are considered todo, generate results

**Update todo workflow**

- run `yarn ember-template-lint * --update-todo`
- any errors generated are considered todo, generate results
  - sets `error` violations to `warning`
  - stores `todo` violation in array
  - writes `todo` violations to disc, one file per violation
  - ensures old `todo` violation files are removed

#### Proposed Schema for TODO violation data

```ts
interface TodoData {
  engine: 'eslint' | 'ember-template-lint';
  todoFilePath: string;
  filePath: string;
  ruleId: string;
  line: number;
  column: number;
  created: Date;
  due?: Date;
}
```

# Critique

[critique]: #critique

A few other options were considered:

- Add line specific lint configuration such that specific lines could be identified and annotated. We decided against this due to this
  requiring changing files rather than gathering metadata about the file. Additionally, adding changes to files results in more file
  changes, and subsequently more code reviews (both extraneous line changes in files, and larger reviews due to file modifications)
- Adding the ability to disable rules with a subsequent comment. This was closely related to the above, but again would result in the
  same issues.

# Unresolved questions

[unresolved]: #unresolved-questions

- what is the default directory name to store todo items? eg. `.lint-todo`
