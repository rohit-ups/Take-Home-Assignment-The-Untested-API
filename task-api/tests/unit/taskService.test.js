const taskService = require("../../src/services/taskService");

beforeEach(() =>{
  taskService._reset();
});

describe('Task Service - Unit Tests' , () =>{
  describe('create()',()=>{
    test('should create task with defaults',()=>{
      const task = taskService.create({ title: 'Test' });
      expect(task).toHaveProperty('id');
      expect(task.status).toBe('todo');
    });
  });
  describe('getPaginated()',()=>{
    test('should return correct page',() =>{
       for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }
       const result = taskService.getPaginated(1, 10);

       expect(result.length).toBe(10); // will FAIL → good

    })
  })
})