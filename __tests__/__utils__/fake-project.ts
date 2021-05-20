import type { DirJSON } from 'fixturify';
import Project from 'fixturify-project';
import { TodoConfig } from '../../src';

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

  writeTodoConfig(todoConfig: TodoConfig["daysToDecay"]): void {
    this.pkg = Object.assign({}, this.pkg, {
      lintTodo: {
        daysToDecay: todoConfig,
      },
    });

    this.writeSync();
  }
}
