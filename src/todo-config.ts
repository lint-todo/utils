import { join } from 'path';
import { TodoConfig, DaysToDecay } from './types';
import { readFileSync, writeFileSync } from 'fs-extra';

const DETECT_TRAILING_WHITESPACE = /\s+$/;

/**
 * Gets the todo configuration.
 * Config values can be present in
 *
 * The package.json
 *
 * @example
 * ```json
 * {
 *   "lintTodo": {
 *     "daysToDecay": {
 *       "warn": 5,
 *       "error": 10
 *     }
 *   }
 * }
 * ```
 *
 * Or .lint-todorc.js
 *
 * @example
 * ```js
 * module.export = {
 *   "ember-template-lint": {
 *     daysToDecay: {
 *       "warn": 10,
 *       "error": 20
 *     },
 *     daysToDecayByRule: {
 *       "no-nested-interactive": { warn: 5, error: 10 },
 *       "no-invalid-interactive": { warn: 3, error: 6 }
 *     }
 *   }
 * };
 * ```
 *
 * Environment variables (`TODO_DAYS_TO_WARN` or `TODO_DAYS_TO_ERROR`)
 * 	- Env vars override package.json config
 *
 * Passed in directly, such as from command line options.
 * 	- Passed in options override both env vars and package.json config
 *
 * @param baseDir - The base directory that contains the project's lint config (either package.json or .lint-todorc.js).
 * @param todoConfig - The optional todo configuration.
 * @returns - The todo config object.
 */

// are we changing this to be get DaysToDecay since we're just trying to set default daysToDecay and don't care about per-rule settings
export function getTodoConfig(
  baseDir: string,
  todoConfig: TodoConfig["daysToDecay"] = {}
): TodoConfig | undefined {
  const daysToDecayPackageConfig = getFromPackageJson(baseDir);
  const daysToDecayEnvVars = getFromEnvVars();
  const daysToDecayLintTodoConfig = getFromTodoConfigFile(baseDir);

  if (daysToDecayPackageConfig && daysToDecayLintTodoConfig) {
    throw new Error(`Todo configuration should either exist in package.json or .lint-todorc.js, but not both.` );
  }

  let mergedConfig = Object.assign({}, daysToDecayPackageConfig, daysToDecayLintTodoConfig, daysToDecayEnvVars, todoConfig);

  // we set a default config if the mergedConfig is an empty object, meaning either or both warn and error aren't
  // defined and the package.json doesn't explicitly define an empty config (they're opting out of defining a todoConfig(now daysToDecay))
  if (Object.keys(mergedConfig).length === 0 && typeof daysToDecayPackageConfig === 'undefined' && typeof daysToDecayLintTodoConfig === 'undefined') {
    mergedConfig = {
      warn: 30,
      error: 60,
    };
  }

  if (
    typeof mergedConfig.warn === 'number' &&
    typeof mergedConfig.error === 'number' &&
    mergedConfig.warn >= mergedConfig.error
  ) {
    throw new Error(
      `The provided todo configuration contains invalid values. The \`warn\` value (${mergedConfig.warn}) must be less than the \`error\` value (${mergedConfig.error}).`
    );
  }

  return mergedConfig;
}

/**
 * Writes a todo config to the package.json located at the provided baseDir.
 *
 * @param baseDir - The base directory that contains the project's package.json or .lint-todorc.js.
 * @param todoConfig - The todo configuration to write to the package.json or .lint-todorc.js.
 */
export function writeTodoConfig(baseDir: string, todoConfig: TodoConfig): boolean {
  const packageJsonPath = join(baseDir, 'package.json');
  const contents = readFileSync(packageJsonPath, { encoding: 'utf8' });
  const pkg = JSON.parse(contents);

  const todoConfigFile = join(baseDir, '.lint-todorc.js');
  const todoConfigContents = readFileSync(todoConfigFile, { encoding: 'utf8' });
  const ruleConfig = JSON.parse(todoConfigContents);

  const trailingWhitespace = DETECT_TRAILING_WHITESPACE.exec(contents);

  // if a .lint-todorc.js file exists, or a lintTodo config exists in package.json, we don't need to write a config
  if (todoConfigFile || pkg.lintTodo) {
    return false;
  }
  // otherwise, configure daysToDecay
  pkg.lintTodo = {
    daysToDecay: todoConfig,
  };

  let updatedContents = JSON.stringify(pkg, undefined, 2);

  if (trailingWhitespace) {
    updatedContents += trailingWhitespace[0];
  }

  writeFileSync(packageJsonPath, updatedContents, { encoding: 'utf8' });

  return true;
}

// if package.json has lintTodo config, return those values
function getFromPackageJson(basePath: string): TodoConfig | undefined {
  let pkg;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    pkg = require(join(basePath, 'package.json'));
  } catch {}

  return pkg?.lintTodo?.daysToDecay;
}

// if .lint-todorc.js exists, return the values for daysToDecay
function getFromTodoConfigFile(basePath: string): DaysToDecay | undefined {
  let todoDaysToDecayDefaultConfig;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    todoDaysToDecayDefaultConfig = require(join(basePath, '.lint-todorc.js'));
  } catch {}

  // this won't be `lintTodo` because that won't be in the .lint-todorc.js file
  // but how do we abstract "whatever the name of the engine is" into syntax that will be accepted?
  return todoDaysToDecayDefaultConfig?.lintTodo?.daysToDecay;
}

// what is the syntax here?
function getFromEnvVars(): TodoConfig {
  const config: TodoConfig = {};

  const warn = getEnvVar('TODO_DAYS_TO_WARN');
  const error = getEnvVar('TODO_DAYS_TO_ERROR');

  if (Number.isInteger(warn)) {
    config.warn = warn;
  }

  if (Number.isInteger(error)) {
    config.error = error;
  }

  return config;
}

function getEnvVar(name: string) {
  if (process.env[name]) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return Number.parseInt(process.env[name]!, 10);
  }
}
