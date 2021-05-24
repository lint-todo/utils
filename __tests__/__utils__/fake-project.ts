import type { DirJSON } from 'fixturify';
import Project from 'fixturify-project';
import { DaysToDecay, DaysToDecayByRule, TodoConfig } from '../../src';

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

  writeTodoConfig(daysToDecay: DaysToDecay, daysToDecayByRule?: DaysToDecayByRule): void {
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
}
