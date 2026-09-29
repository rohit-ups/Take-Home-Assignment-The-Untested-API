const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

//  POST /tasks 

describe('POST /tasks', () => {
    it('successfully creates a task', async () => {
      const res = await request(app).post('/tasks').send({ title: 'sample task' });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('sample task');
      expect(res.body.id).toBeDefined();
    });
  
    it('returns status 400 via validation when title is missing', async () => {
      const res = await request(app).post('/tasks').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  
    it('returns 400 via validation when title is empty string', async () => {
      const res = await request(app).post('/tasks').send({ title: '' });
      expect(res.status).toBe(400);
    });
  
    it('returns 400 via validation for invalid status', async () => {
      const res = await request(app).post('/tasks').send({ title: 'ok', status: 'invalid' });
      expect(res.status).toBe(400);
    });

    it('returns 400 via validation for empty string status', async () => {
        const res = await request(app).post('/tasks').send({ title: 'ok', status: '' });
        expect(res.status).toBe(400); // Will fail, an empty string passes through validation
    });
  
    it('returns 400 via validation for invalid priority', async () => {
      const res = await request(app).post('/tasks').send({ title: 'ok', priority: 'urgent' });
      expect(res.status).toBe(400);
    });

    it('returns 400 via validation for empty string priority', async () => {
        const res = await request(app).post('/tasks').send({ title: 'ok', status: '' });
        expect(res.status).toBe(400); // Will fail, an empty string passes through validation
    });
  
    it('returns 400 via validation for invalid dueDate', async () => {
      const res = await request(app).post('/tasks').send({ title: 'ok', dueDate: 'not-a-date' });
      expect(res.status).toBe(400);
    });
    
    it('returns 400 via validation for empty string dueDate', async () => {
        const res = await request(app).post('/tasks').send({ title: 'ok', status: '' });
        expect(res.status).toBe(400); // Will fail, an empty string passes through validation
    });
  

  });

// GET /tasks
describe('GET /tasks', () => {
  it('returns empty array if theres no tasks', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all tasks', async () => {
    await request(app).post('/tasks').send({ title: 'a' });
    await request(app).post('/tasks').send({ title: 'b' });

    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

//  GET /tasks/stats

describe('GET /tasks/stats', () => {
    it('returns counts for all status', async () => {
      await request(app).post('/tasks').send({ title: 'a', status: 'todo' });
      await request(app).post('/tasks').send({ title: 'b', status: 'done' });
  
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body.todo).toBe(1);
      expect(res.body.done).toBe(1);
      expect(res.body.in_progress).toBe(0);
    });
  
    it('returns count for overdue tasks', async () => {
      await request(app).post('/tasks').send({ title: 'overdue', dueDate: '2022-11-11' });
      const res = await request(app).get('/tasks/stats');
      expect(res.body.overdue).toBe(1);
    });
  });

// GET /tasks?status= 

describe('GET /tasks?status=', () => {
  it('filters tasks by status', async () => {
    await request(app).post('/tasks').send({ title: 'todo sample task', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'done sample task', status: 'done' });

    const res = await request(app).get('/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('todo sample task');
  });

  it('returns empty array for invalid status', async () => {
    await request(app).post('/tasks').send({ title: 'sample task' });
    const res = await request(app).get('/tasks?status=randomstat');
    expect(res.status).not.toBe(200); //Fixed - Shouldnt work but currently it returns an empty array because of missing checks
  });

  it('partial status string still matches to other valid status', async () => {
    await request(app).post('/tasks').send({ title: 'a task', status: 'todo' });
    const res = await request(app).get('/tasks?status=tod');
    expect(res.status).toBe(400); //Fixed - Shouldnt work neither but currently does because the usage of includes() in the service
  });
});

// ─── GET /tasks?page=&limit= 

describe('GET /tasks?page=&limit=', () => {
  beforeEach(async () => {
    for (let i = 1; i <= 5; i++) {
      await request(app).post('/tasks').send({ title: `${i}` });
    }
  });

  it('page 1 skips first results instead of returning them', async () => {
    const res = await request(app).get('/tasks?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body[0].title).toBe('1'); //Fixed as part of task B
  });
});

//  PUT /tasks/:id 

describe('PUT /tasks/:id', () => {
  it('updates task and returns updated task', async () => {
    const created = await request(app).post('/tasks').send({ title: 'a' });

    const res = await request(app).put(`/tasks/${created.body.id}`).send({ title: 'b' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('b');
  });

  it('returns 404 for invalid id', async () => {
    const res = await request(app).put('/tasks/fake-id').send({ title: 'sample task' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid status in update', async () => {
    const created = await request(app).post('/tasks').send({ title: 'task' });
    const res = await request(app).put(`/tasks/${created.body.id}`).send({ status: 'bad' });
    expect(res.status).toBe(400);
  });

  it('does not affect fields that are not sent', async () => {
    const created = await request(app).post('/tasks').send({ title: 'task', priority: 'high' });
    const res = await request(app).put(`/tasks/${created.body.id}`).send({ title: 'updated' });
    expect(res.body.priority).toBe('high');
  });
});

//  DELETE /tasks/:id

describe('DELETE /tasks/:id', () => {

  it('returns 404 for invalid id', async () => {
    const res = await request(app).delete('/tasks/rand');
    expect(res.status).toBe(404);
  });

  it('deletes task', async () => {
    const created = await request(app).post('/tasks').send({ title: 'sample task' });
    await request(app).delete(`/tasks/${created.body.id}`);

    const all = await request(app).get('/tasks');
    expect(all.body).toHaveLength(0);
  });
});

//  PATCH /tasks/:id/complete

describe('PATCH /tasks/:id/complete', () => {
  it('changes task status to done', async () => {
    const created = await request(app).post('/tasks').send({ title: 'sample task' });
    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
  });

  it('returns 404 for invalid id', async () => {
    const res = await request(app).patch('/tasks/random/complete');
    expect(res.status).toBe(404);
  });

  it('completing a task does not affect the priority field', async () => {
    const created = await request(app).post('/tasks').send({ title: 'urgent', priority: 'high' });
    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);
    expect(res.body.priority).toBe('high'); //Fixed - Fails, it is currently hardcoded
  });
});

describe('PATCH /tasks/:id/assign', () => {
  it('assigns a task to an assignee', async () => {
    const created = await request(app).post('/tasks').send({ title: 'sample task' });
    const res = await request(app).patch(`/tasks/${created.body.id}/assign`).send({ assignee: 'John Doe' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('John Doe');
  });

  it('returns 404 for invalid id', async () => {
    const res = await request(app).patch('/tasks/random/assign').send({ assignee: 'John Doe' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for missing assignee', async () => {
    const created = await request(app).post('/tasks').send({ title: 'sample task' });
    const res = await request(app).patch(`/tasks/${created.body.id}/assign`).send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty string assignee', async () => {
    const created = await request(app).post('/tasks').send({ title: 'sample task' });
    const res = await request(app).patch(`/tasks/${created.body.id}/assign`).send({ assignee: '' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when trying to assign a completed task', async () => {
    const created = await request(app).post('/tasks').send({ title: 'sample task' });
    await request(app).patch(`/tasks/${created.body.id}/complete`);
    const res = await request(app).patch(`/tasks/${created.body.id}/assign`).send({ assignee: 'John Doe' });
    expect(res.status).toBe(404);
  });
});