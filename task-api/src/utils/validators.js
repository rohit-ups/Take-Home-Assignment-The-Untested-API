const VALID_STATUSES = ['todo', 'in_progress', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

const validateCreateTask = (body) => {
  const keyArray = Object.keys(body);
  let error = "";
  keyArray.forEach(element => {
    if(element!=="title" && element!=="status" && element!=="priority" && element!=="dueDate") {
      error = "body must contain only required fields";
      return error;
    }
  });

  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    return 'title is required and must be a non-empty string';
  }
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return `priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
  }
  if (body.dueDate && isNaN(Date.parse(body.dueDate))) {
    return 'dueDate must be a valid ISO date string';
  }
  return null;
};

const validateUpdateTask = (body) => {
  const keyArray = Object.keys(body);
  let error = "";
  keyArray.forEach(element => {
    if(element!=="title" || element!=="status" || element!=="priority" || element!=="dueDate") {
      error = "body must contain only required fields";
      return error;
    }
  });

  if (!body.title && (typeof body.title !== 'string' || body.title.trim() === '')) {
    return 'title must be a non-empty string';
  }
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return `priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
  }
  if (body.dueDate && isNaN(Date.parse(body.dueDate))) {
    return 'dueDate must be a valid ISO date string';
  }
  return null;
};

const validateTaskAssignment = (body) => {
  const keyArray = Object.keys(body);
  let error = "";
  keyArray.forEach(element => {
    if(element!=="assignee") {
      error = "body must contain only assignee";
      return error;
    }
  });

  if(!body.assignee || body.assignee==="") {
    return "empty assignee assigned."
  }

  return null;
};

module.exports = { validateCreateTask, validateUpdateTask, validateTaskAssignment };
