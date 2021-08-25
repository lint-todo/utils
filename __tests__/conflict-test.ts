describe('merge conflict resolution', () => {
  describe('with 2 existing todos and changes on the upstream branch', () => {
    describe('when merging an upstream branch with empty todos', () => {
      it.todo('results in empty todos');
    });

    describe('merging an upstream branch with the same todos', () => {
      it.todo('results in a noop and results in the same 2 todos');
    });

    describe('merging an upstream branch with 1 new todo', () => {
      it.todo('adds the new todo and results in 3 todos');
    });

    describe('merging an upstream branch that fixes an existing todo', () => {
      it.todo('removes the fixed todo and results in 1 single remaining todo');
    });

    describe('merging an upstream branch that changes an existing todo', () => {
      it.todo('updates the changed todo with the upstream changes and results in 2 todos');
    });
  });

  describe('with changes on both branches', () => {
    describe('updating the same todo on each branch', () => {
      it.todo('merges remote and local changes');
    });

    describe('adding different new todos to each branch', () => {
      it.todo('adds 2 new todos to the existing todos');
    });

    describe('removing different new todos to each branch', () => {
      it.todo('adds 2 new todos to the existing todos');
    });
  });
});
