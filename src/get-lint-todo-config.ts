import { join } from 'path';
import { DaysToDecay } from './types';

export function getTodoConfig(
  baseDir: string,
  daysToDecayOptions: DaysToDecay = {}
): DaysToDecay | undefined {
  const daysToDecayPackageConfig = getFromPackageJson(baseDir);
  const daysToDecayEnvVars = getFromEnvVars();
  const lintTodoConfig = Object.assign(
    {},
    daysToDecayPackageConfig,
    daysToDecayEnvVars,
    daysToDecayOptions
  );

  if (
    typeof lintTodoConfig.warn === 'number' &&
    typeof lintTodoConfig.error === 'number' &&
    lintTodoConfig.warn >= lintTodoConfig.error
  ) {
    throw new Error(
      'The `lintTodo` configuration in the package.json contains invalid values. The `warn` value must be less than the `error` value.'
    );
  }

  return lintTodoConfig;
}

function getFromPackageJson(basePath: string): DaysToDecay {
  let pkg;
  const packageJsonPath = join(basePath, 'package.json');

  try {
    pkg = require(packageJsonPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`The ${basePath} directory does not contain a package.json file.`);
    }
  }

  return pkg?.lintTodo?.daysToDecay || {};
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
  if (typeof process.env[name] !== 'undefined' && process.env[name] !== '') {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return Number.parseInt(process.env[name]!, 10);
  }
}
