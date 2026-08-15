# Submission Notes

## What I'd test next if I had more time

The error handler in app.js is basically untested right now — I didn't force an unhandled 
exception to hit it, so that's the obvious gap. Beyond that, I'd want to poke at concurrency: 
the store is just an array in memory, so two requests updating the same task at the same time 
could step on each other, and there's nothing testing that. I'd also add a few more validator 
tests specifically around falsy values (empty string, 0, false) since that's exactly how the 
status/priority bypass bug slipped through — it's the kind of thing you only catch if you're 
deliberately testing "weird" inputs, not just missing ones. And page=0 / negative limit on 
pagination — right now it silently falls back to page 1 instead of telling the client anything 
went wrong, which I think deserves its own test (and honestly its own bug entry).

## Anything that surprised me in the codebase

Took me a minute to actually spot the getByStatus bug — .includes() looked fine at a glance 
since I initially read it as an array check, not a string substring check. Once I tested 
?status=do and got both todo and done back, it clicked. The hardcoded priority: 'medium' in 
completeTask was a different kind of surprise — that's not a typo, someone wrote that on 
purpose at some point, probably copied from elsewhere and never removed. And the validation 
bug (if (body.status) letting "" through) is a good reminder that truthy checks and "is this 
field present" checks are not the same thing, even though they look identical in casual review.

## Questions I'd ask before shipping to production

- Is in-memory storage a deliberate v1 choice or just a placeholder? Everything resets on 
  restart right now and there's no concurrency protection, so I'd want to know the plan there.
- PUT /tasks/:id currently merges fields instead of replacing the whole resource, which is 
  really PATCH behavior. Is that intentional, or should PUT require the full object?
- The update() spread doesn't restrict which fields a client can send — right now it's just 
  id and createdAt that are the obvious problem, but technically any field name gets merged in. 
  Should there be an explicit allow-list?
- Are status transitions supposed to be restricted (e.g. can something go from done back to 
  todo), or is any transition valid?
- For pagination, should page=0 or a negative limit return a 400 instead of silently defaulting? 
  Right now bad input just gets swallowed, which could hide bugs on the client side too.