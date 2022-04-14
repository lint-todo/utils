import type { DirJSON } from 'fixturify';
import Project from 'fixturify-project';
import { DaysToDecay, DaysToDecayByRule, TodoConfig, TodoConfigByEngine } from '../../src';

export class FakeProject extends Project {
  constructor(name = 'fake-project', ...args: any[]) {
    super(name, ...args);

    this.pkg = Object.assign({}, this.pkg, {
      license: 'MIT',
      description: 'Fake project',
      repository: 'http://fakerepo.com',
    });
  }

  write(dirJSON: DirJSON): void {
    Object.assign(this.files, dirJSON);
    this.writeSync();
  }

  writeLegacyPackageJsonTodoConfig(
    daysToDecay: DaysToDecay,
    daysToDecayByRule?: DaysToDecayByRule
  ): void {
    const todoConfig: {
      lintTodo: TodoConfig;
    } = {
      lintTodo: {
        daysToDecay,
      },
    };

    if (daysToDecayByRule) {
      todoConfig.lintTodo.daysToDecayByRule = daysToDecayByRule;
    }

    this.pkg = Object.assign({}, this.pkg, todoConfig);

    this.writeSync();
  }

  writePackageJsonTodoConfig(
    engine: string,
    daysToDecay: DaysToDecay,
    daysToDecayByRule?: DaysToDecayByRule
  ): void {
    const todoConfig: {
      lintTodo: TodoConfigByEngine;
    } = {
      lintTodo: {
        [engine]: {
          daysToDecay,
        },
      },
    };

    if (daysToDecayByRule) {
      todoConfig.lintTodo[engine].daysToDecayByRule = daysToDecayByRule;
    }

    this.pkg = Object.assign({}, this.pkg, todoConfig);

    this.writeSync();
  }

  writeLintTodorc(
    engine: string,
    daysToDecay: DaysToDecay,
    daysToDecayByRule?: DaysToDecayByRule
  ): void {
    const todoConfig: TodoConfigByEngine = {
      [engine]: {
        daysToDecay,
      },
    };

    if (daysToDecayByRule) {
      todoConfig[engine].daysToDecayByRule = daysToDecayByRule;
    }

    this.write({
      // eslint-disable-next-line unicorn/no-null
      '.lint-todorc.js': `module.exports = ${JSON.stringify(todoConfig, null, 2)}`,
    });
  }
}
