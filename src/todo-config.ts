import { join } from 'path';
import { DaysToDecay, TodoConfig } from './types';

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
 * @param customDaysToDecay - The optional custom days to decay configuration.
 * @returns - The todo config object.
 */
export function getTodoConfig(
  baseDir: string,
  customDaysToDecay: DaysToDecay = {}
): DaysToDecay | undefined {
  const todoConfig = getFromConfigFile(baseDir);
  const daysToDecayEnvVars = getFromEnvVars();
  let mergedConfig = Object.assign(
    {},
    todoConfig?.daysToDecay,
    daysToDecayEnvVars,
    customDaysToDecay
  );

  // we set a default config if the mergedConfig is an empty object, meaning either or both warn and error aren't
  // defined and the package.json doesn't explicitly define an empty config (they're opting out of defining a todoConfig)
  if (Object.keys(mergedConfig).length === 0 && typeof todoConfig === 'undefined') {
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

function getFromConfigFile(basePath: string): TodoConfig | undefined {
  const pkg = requireFile(basePath, 'package.json');
  const lintTodorc = requireFile(basePath, '.lint-todorc.js');

  if (pkg?.lintTodo && lintTodorc) {
    throw new Error(
      'You cannot have todo configuratons in both package.json and .lint-todorc.js. Please move the configurations from the package.json to the .lint-todorc.js'
    );
  }

  return lintTodorc ?? pkg?.lintTodo;
}

function requireFile(basePath: string, fileName: string) {
  try {
    return require(join(basePath, fileName));
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
