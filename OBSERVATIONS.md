# MANUAL TESTING AND CODE LOOK-THROUGH

## GET /

- pagination does not equal first page (skipping the first few data) when the page query is equal to 0 or 1
- returns tasks with status "todo" despite query value being set to "tod" due to using .includes
- findbyId was used in one of the services, however it is not used directly in one of the routes as a service despite being exported along with other routes (unsure if this was intentional, but useful if it was an intended service).
- entering an invalid status returns an empty array (better if error is thrown)

## POST /

- was able to enter 123/"123" for due date (probably not valid/weird date formatting), probably because of parse
- can be able to pass "" for status, duedate and priority since its falsy and bypasses validation most likely

## PUT /

- same problem as post in validation

## DELETE /

- works, returns 204

## PATCH /

- status always changed to medium, saw it was hardcoded
