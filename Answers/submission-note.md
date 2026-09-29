# submission note


## what i'd test next if i had more time

- the pagination bug is still unfixed, i'd write more tests around different page and limit combos to fully document the broken behavior before fixing it
- i'd also test what happens when u send extra fields that dont exist on the task like `foo: "bar"` in a create or update, the api just stores them silently which prob isnt intentional
- would test concurrent requests on the in memory store, since its just an array theres no locking so simultaneous deletes or updates on the same id could cause issues



## anything that surprised me

- `completeTask` silently resetting priority to medium was the most unexpected thing, looked like a leftover from some business logic that got hardcoded and forgotten
- the `_reset()` function sitting in the service exports at first it looked like a bug exposing an internal method but its actually smart, its the only clean way to reset state between tests without restarting the server
- `uuid` v14 ships as ESM only which breaks jest out of the box, had to downgrade to v9 to get tests running, surprised that wasnt caught before



## questions i'd ask before shipping to production

- is the in-memory store intentional or is a real database coming, bcz right now all data is lost on restart
- whats the expected behavior when completing an already completed task, right now it just runs again and updates completedAt
- should pagination be 0 indexed or 1 indexed, the route and service disagree on this right now and it needs a decision before fixing
- is there any auth planned, right now anyone can delete or update any task
