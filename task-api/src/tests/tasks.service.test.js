const taskservice = require("../services/taskService")

describe('Task Service',()=>{
    //!BEFORE EACH TEST RESET THE ARRAY SO TESTS DONT AFFECT EACHOTHER
    beforeEach(()=>{
        taskservice._reset();
    });
   test("SHOULD create a new task with default values",()=>{


    const newTask = taskservice.create({title:'test task'});

    expect(newTask.title).toBe('test task');

    expect(newTask.id).toBeDefined();
   });
   test('should create a task with provided custom values',()=>{
    const customTaskData = {
        title: 'Urgent Task',
        description: 'Do it now',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2023-12-31T00:00:00.000Z'
    }
    const newTask = taskservice.create(customTaskData);
    
    //now we check if it accepted out custom values instead of defaults
    expect(newTask.title).toBe('Urgent Task');
    expect(newTask.status).toBe('in_progress');
    expect(newTask.priority).toBe('high');
    expect(newTask.description).toBe('Do it now');
    
   })
    // TODO: Write tests for findById, getByStatus, update, etc
    describe('findbyid()',()=>{
        test('Should find a task by its id',()=>{
          const newtask = taskservice.create({
                title:'task to find'
            });
            const foundTask = taskservice.findById(newtask.id);
            expect(foundTask).toBeDefined();
            expect(foundTask.title).toBe('task to find')
            
        });
        test('should return undefined if the task id does not exist',()=>{
            const foundTask = taskservice.findById('fake-uuid-1234');
            expect(foundTask).toBeUndefined();
        })
    })
   describe('getByStatus()', () => {
    test('Should get task by its status', () => {
        const newtask = taskservice.create({
            title: 'Test status',
            status: 'done'
        });
        
        // getByStatus returns an array.
        const foundTasks = taskservice.getByStatus(newtask.status);
        
        expect(foundTasks).toBeDefined(); 
        expect(foundTasks.length).toBe(1); 
        expect(foundTasks[0].status).toBe('done'); // Access the first item in the array
    })

    test('Should return an empty array if no tasks match the status', () => {
          const foundTasks = taskservice.getByStatus('non_status');
          expect(foundTasks).toBeDefined(); 
          expect(foundTasks.length).toBe(0); // Should be empt
    })
    test('Should not return tasks if the status is only a partial match (The Bug!)', () => {
          // 1. Arrange: Create a task that is 'done'
          taskservice.create({ title: 'Finish homework', status: 'done' });

          // 2. Act: Search for exactly 'do'
          const foundTasks = taskservice.getByStatus('do');
          
          // 3. Assert: It should be empty (0 length) because 'do' is not 'done'
          expect(foundTasks).toBeDefined();
          expect(foundTasks.length).toBe(0);
    })
   })
    describe('Pagination (Bug!)', () => {
        test('Page 1 should return the very first items, not skip them', () => {
            // 1. Arrange: Create 3 separate tasks
            taskservice.create({ title: 'Task A' });
            taskservice.create({ title: 'Task B' });
            taskservice.create({ title: 'Task C' });

            // 2. Act: Ask for Page 1, and limit it to 2 items per page
            const paginatedTasks = taskservice.getPaginated(1, 2);

            // 3. Assert: We should get exactly 2 items back
            expect(paginatedTasks.length).toBe(2);

            // This is where the bug will reveal itself!
            // Because it's Page 1, the very first item should be 'Task A'.
            expect(paginatedTasks[0].title).toBe('Task A');
        });
    });
 
})