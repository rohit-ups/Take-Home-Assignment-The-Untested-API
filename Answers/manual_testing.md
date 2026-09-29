# api testing
- `/tasks` -  all the method follows after thsi
- `GET     /stats`         -  working  -   returning some state
- `GET     /`              -  working  -   returning all the tasks 
- `POST    /`              -  working  -   it is creating tasks
- `PUT     /:id`           -  working  -   updating tasks
- `DELETE  /:id`           -  working  -   deleting tasks
- `PATCH   /:id/complete`  -  working  -   complete status updates


# future APIs as we have some services unused
- `GET     /:id`             -  find by id
<!-- 1. no the pagination and limit are made need to test this method again -->
<!-- 2. no they are made but need fix and improvements -->
- `GET     /?page=/?limit=`  -  pagination
- `POST    /reset`           -  reset is not implementsed


# validations 
> for now only create and update task validations exists


# observations i made to fix them 
1. the server crashes on any error so we need `try catch` error handling.
2. some controllers does not return which might crash the server if it tries to run or return again.
3. pagination needs fixes and improvements
4. 


# total fields we have 
- `title:` string, none null, empty, also test prompt injection free
- `status:` test random value, numbers, 
- `priotity:` same as status
- `dueDate:` date checks makes sure same format in update and create

