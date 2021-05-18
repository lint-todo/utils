import { join } from 'path';
import { TodoConfig } from './types';
import { readFileSync, writeFileSync, readJsonSync } from 'fs-extra';
import { todoStorageDirExists } from './io';

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
 * Environment variables (`TODO_DAYS_TO_WARN` or `TODO_DAYS_TO_ERROR`)
 * 	- Env vars override package.json config
 *
 * Passed in directly, such as from command line options.
 * 	- Passed in options override both env vars and package.json config
 *
 * @param baseDir - The base directory that contains the project's package.json.
 * @param todoConfig - The optional todo configuration.
 * @returns - The todo config object.
 */
export function getTodoConfig(
  baseDir: string,
  todoConfig: TodoConfig = {}
): TodoConfig | undefined {
  const daysToDecayPackageConfig = getFromPackageJson(baseDir);
  const daysToDecayEnvVars = getFromEnvVars();
  const daysToDecayByRuleConfig = getFromTodoConfigFile(baseDir);
  let mergedConfig = Object.assign({}, daysToDecayPackageConfig, daysToDecayByRuleConfig, daysToDecayEnvVars, todoConfig);

  // we set a default config if the mergedConfig is an empty object, meaning either or both warn and error aren't
  // defined and the package.json doesn't explicitly define an empty config (they're opting out of defining a todoConfig)
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
 * Ensures that a valid todo config exists in the project
 * if we're invoking the todos functionality for the first time (there is no .lint-todo directory)
 * - if there is no config in the package.json
 * - if there is no .lint-todorc.js file
 *
 * @param baseDir - The base directory that contains the project's package.json.
 */
export function ensureTodoConfig(baseDir: string): void {
  if (!todoStorageDirExists(baseDir)) {
    const pkg = readJsonSync(join(baseDir, 'package.json'));
    const ruleConfigFile = readJsonSync(join(baseDir, '.lint-todorc.js'));

    if (!ruleConfigFile) {
      if (!pkg.lintTodo) {
        writeTodoConfig(baseDir, {
          warn: 30,
          error: 60,
        });
      }
    }
  }
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
  const todoConfigContents = readFileSync(todoConfigFile, { encoding: 'utf8' });
  const trailingWhitespace = DETECT_TRAILING_WHITESPACE.exec(contents);
  const pkg = JSON.parse(contents);
  const ruleConfig = JSON.parse(todoConfigContents);

  // if there is no lintTodo config in the package.json OR .lint-todorc.js file
  if (pkg.lintTodo || ruleConfig.lintTodo) {
    return false;
  }

  // write the default daysToDecay to the package.json
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

function getFromPackageJson(basePath: string): TodoConfig | undefined {
  let pkg;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    pkg = require(join(basePath, 'package.json'));
  } catch {}

  return pkg?.lintTodo?.daysToDecay;
}

function getFromTodoConfigFile(basePath: string): TodoConfig | undefined {
  let ruleConfig;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ruleConfig = require(join(basePath, '.lint-todorc.js'));
  } catch {}

  return ruleConfig?.lintTodo?.daysToDecay;
}

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
