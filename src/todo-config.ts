import { findUpSync } from 'find-up';
import { DaysToDecay, LintTodoPackageJson, TodoConfig, TodoConfigByEngine } from './types';

type ConfigValidationResult = {
  pkg?: LintTodoPackageJson;
  lintTodorc?: TodoConfig;
  isValid: boolean;
  message?: string;
};

/**
 * Gets the todo configuration from one of a number of locations.
 *
 * @example
 * Using the package.json
 * ```json
 * {
 *   "lintTodo": {
 *     "some-engine": {
 *       "daysToDecay": {
 *         "warn": 5,
 *         "error": 10
 *       },
 *       "daysToDecayByRule": {
 *         "no-bare-strings": { "warn": 10, "error": 20 }
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * Using the .lint-todorc.js file
 * ```js
 * module.exports = {
 *   "some-engine": {
 *     "daysToDecay": {
 *       "warn": 5,
 *       "error": 10
 *     },
 *     "daysToDecayByRule": {
 *       "no-bare-strings": { "warn": 10, "error": 20 }
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * Using environment variables (`TODO_DAYS_TO_WARN` or `TODO_DAYS_TO_ERROR`)
 * 	- Env vars override package.json config
 *
 * @example
 * Passed in directly, such as from command line options.
 * 	- Passed in options override both env vars and package.json config
 *
 * @param baseDir - The base directory that contains the project's package.json.
 * @param engine - The engine for this configuration, eg. eslint
 * @param customDaysToDecay - The optional custom days to decay configuration.
 * @returns - The todo config object.
 */
export function getTodoConfig(
  baseDir: string,
  engine: string,
  customDaysToDecay: DaysToDecay = {}
): TodoConfig {
  let todoConfig = getFromConfigFile(baseDir, engine);
  const daysToDecayEnvVars = getFromEnvVars();
  let mergedDaysToDecay = Object.assign(
    {},
    todoConfig?.daysToDecay,
    daysToDecayEnvVars,
    customDaysToDecay
  );

  // we set a default config if the mergedConfig is an empty object, meaning either or both warn and error aren't
  // defined and the package.json doesn't explicitly define an empty config (they're opting out of defining a todoConfig)
  if (Object.keys(mergedDaysToDecay).length === 0 && typeof todoConfig === 'undefined') {
    mergedDaysToDecay = {
      warn: 30,
      error: 60,
    };
  }

  if (
    typeof mergedDaysToDecay.warn === 'number' &&
    typeof mergedDaysToDecay.error === 'number' &&
    mergedDaysToDecay.warn >= mergedDaysToDecay.error
  ) {
    throw new Error(
      `The provided todo configuration contains invalid values. The \`warn\` value (${mergedDaysToDecay.warn}) must be less than the \`error\` value (${mergedDaysToDecay.error}).`
    );
  }

  if (!todoConfig) {
    todoConfig = {};
  }

  todoConfig.daysToDecay = mergedDaysToDecay;

  return todoConfig;
}

/**
 * Validates whether we have a unique config in a single location.
 *
 * @param baseDir - The base directory that contains the project's package.json.
 * @returns A ConfigValidationResult that indicates whether a config is unique
 */
export function validateConfig(baseDir: string): ConfigValidationResult {
  const pkg = requireFile(baseDir, 'package.json');
  const lintTodorc = requireFile(baseDir, '.lint-todorc.js');
  const validationResult: ConfigValidationResult = {
    pkg,
    lintTodorc,
    isValid: !(pkg?.lintTodo && lintTodorc),
  };

  if (!validationResult.isValid) {
    validationResult.message =
      'You cannot have todo configurations in both package.json and .lint-todorc.js. Please move the configuration from the package.json to the .lint-todorc.js';
  }

  return validationResult;
}

function isTodoConfig(config: TodoConfig | TodoConfigByEngine): config is TodoConfig {
  return (
    Object.keys(config).length === 0 || Object.prototype.hasOwnProperty.call(config, 'daysToDecay')
  );
}

function getFromConfigFile(baseDir: string, engine: string): TodoConfig | undefined {
  const result = validateConfig(baseDir);

  if (!result.isValid) {
    throw new Error(result.message);
  }

  const todoConfig: TodoConfig | TodoConfigByEngine | undefined =
    result.lintTodorc ?? result.pkg?.lintTodo;

  if (todoConfig === undefined) {
    return;
  }

  // either an empty config or a legacy config where the object only had a top-level daysToDecay property
  if (isTodoConfig(todoConfig)) {
    return todoConfig;
  }

  return todoConfig[engine];
}

function requireFile(baseDir: string, fileName: string) {
  try {
    const filePath = findUpSync(fileName, {
      cwd: baseDir,
    });
    return filePath && require(filePath);
  } catch {
    return;
  }
}

function getFromEnvVars(): DaysToDecay {
  const config: DaysToDecay = {};

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
