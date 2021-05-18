import { join } from 'path';
import { TodoConfig } from './types';
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
export function getTodoConfig(
  baseDir: string,
  todoConfig: TodoConfig["daysToDecay"] = {}
): TodoConfig | undefined {
  const daysToDecayPackageConfig = getFromPackageJson(baseDir);
  const daysToDecayEnvVars = getFromEnvVars();
  const daysToDecayLintTodoConfig = getFromTodoConfigFile(baseDir);

  // this doesn't really work because you will always have a package.json file so it can't just be that, it has to also include the lintTodo config to be invalid.
  if (daysToDecayPackageConfig && daysToDecayLintTodoConfig) {
    throw new Error(`Todo configuration should either exist in package.json or .lint-todorc.js, but not both.` );
  }

  let mergedConfig = Object.assign({}, daysToDecayPackageConfig, daysToDecayLintTodoConfig, daysToDecayEnvVars, todoConfig);

  // we set a default config if the mergedConfig is an empty object, meaning either or both warn and error aren't
  // defined and the package.json doesn't explicitly define an empty config (they're opting out of defining a todoConfig(now daysToDecay))
  if (Object.keys(mergedConfig).length === 0 && typeof daysToDecayPackageConfig === 'undefined') {
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
  const todoConfigFile = join(baseDir, '.lint-todorc.js');
  const contents = readFileSync(packageJsonPath, { encoding: 'utf8' });
  // const todoConfigContents = readFileSync(todoConfigFile, { encoding: 'utf8' });
  const trailingWhitespace = DETECT_TRAILING_WHITESPACE.exec(contents);
  const pkg = JSON.parse(contents);
  // const ruleConfig = JSON.parse(todoConfigContents);

  // if there is a .lint-todorc.js file or a lintTodo config in package.json, we don't need to write a config
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

// if .lint-todorc.js exists, return the values
function getFromTodoConfigFile(basePath: string): TodoConfig | undefined {
  let ruleConfig;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ruleConfig = require(join(basePath, '.lint-todorc.js'));
  } catch {}

  // this won't be lintTodo because that won't be in the .lint-todorc.js file
  return ruleConfig?.lintTodo?.daysToDecay;
}

// what is the syntax here?
function getFromEnvVars(): TodoConfig {
  const config: TodoConfig = { daysToDecay };

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
