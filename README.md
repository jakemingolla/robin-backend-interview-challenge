# robin-backend-interview-challenge

This repository contains my solution to the [backend interview challenge](
  https://github.com/robinpowered/backend-interview-challenge
) to provide availability windows for requested users.

## Installation
### Prerequisites
- [`nvm`](https://github.com/nvm-sh/nvm)
- [`docker`](https://docs.docker.com/get-docker/)
- [`docker-compose`](https://docs.docker.com/compose/install/)

### Running API server locally
The API server for serving end-user requests is run locally via 
`docker-compose`. The docker container must first be built.

```
nvm use
npm run build
```

Once the API server is built, run it locally via:
```
npm run dev
```
Changes to local source files are propagated into the running
server via a combination of docker-compose volumes and `nodemon`.
The local server is reachable at port `13778`:
```
curl --silent -G \
  -d "user_ids=1" \
  -d "user_ids=2" \
  -d "user_ids=3" \
  -d "start=2019-01-01T15:15:00-0500" \
  -d "end=2019-01-01T16:00:00-0500" \
  "http://localhost:13778/v1/availabilities" | jq

{
  "availabilities": [
    {
      "attendees": [
        1,
        2,
        3
      ],
      "startedAt": "2019-01-01T20:45:00.000Z",
      "endedAt": "2019-01-01T21:00:00.000Z"
    },
    {
      "attendees": [
        1,
        2
      ],
      "startedAt": "2019-01-01T20:30:00.000Z",
      "endedAt": "2019-01-01T20:45:00.000Z"
    },
    {
      "attendees": [
        2
      ],
      "startedAt": "2019-01-01T20:15:00.000Z",
      "endedAt": "2019-01-01T20:30:00.000Z"
    }
  ]
}
```
Note: Users must be first added to the database via the `PUT /v1/users/:userId:` endpoint.

### Running tests against the local API server
```
npm test
```
Runs the following:
- Linting check (via Prettier)
- Unit tests
- Integration tests

The intergration tests include scenarios for each 'challenge' specified
in the base repository.

## My Solution
When reading through the different challenges, I noticed a relatively
iterative approach to how each challenge was worded. For example,
an API that can provide availabilities of different users while accounting
for their working hours also has the side effect of working
for the first challenge. Likewise, a response that generates 15 minute
'blocks' of time also has the advantage of providing a usable response
body for the first two challenges. Thus, I based my solution around
the 3rd challenge in particular and let the first two be solved as a result.

I defined a new API object callend an 'availability window' in order to provide
usable responses for each challenge. An 'availability window' has the following properties:
```
{
  attendees - An array of user IDs that have availability during the window.
  startedAt - An ISO-8601 timestamp of the start of the window
  endedAt - An ISO-8601 timestamp of the end of the window
}
```

An availability window is calculated as follows, based on the request parameters:

- Enumerated via every `interval` minute window from the `start`
  to the `end` timestamps.
- A user cannot be an attendee of an availability window if they have
  an event at the same time (accounting for time zone normalization to UTC).
- A user cannot be an attendee of an availability window if it is
  outside of their defined working hours.
- An availability window with fewer than the requested minimum attendees
  is discarded.

All availability windows are sorted by the number of attendees, limited
to the requested number of entries (using a default value if not specified),
then returned to the user.

The algorithm chosen is O(n * (p + q)), where:
  - n is (start - end) / interval, i.e. the number of potential windows
  - p is the number of users
  - q is the total number of events for all users

Each availability window candidate is potentially tested against
each user and each event to determine validity.

## Challenges
From an implementation perspective, one hurdle relates to dealing with working
hour calculations for users. The dependency I used to handle most of the timezone
manipulation and unification (`moment`) into UTC can handle _dates_ really well,
but not _time ranges_ at all. For example, the range `09:00` to `17:00`
in a given time zone is not able to be compared to a specific date with
any out-of-the box functions. I wrote my own function for this
and broke it out into a unit-testable helper to help make sure it was valid.

Additionally, I added a `minimum_attendees` request parameter to help
mitigate a few different scenarios I imagined. There is no defined behavior
if a requested `user_id` does not match any known user. Instead of
rejecting requests with erroneous requested user IDs, which could
potentially happen if any client was out of sync with changes in user base,
the `minimum_attendees` allows for a client to specify how 'full' they
want the resulting availability windows to be. For example,
to specify that all availability windows must include _ALL_ attendees,
set it equal to the number of requested users. While results are always
sorted by number of attendees, this allows for differentiated client
behavior without making assumptions about data from the API server.

One improvement I thought of rather later in the solution relates to the
working hours calculations. If you can force full attendance of users,
the working hours of _ALL_ users could be combined into a single range
of possible windows during a pre-processing stage. This could reduce
the number of comparisons to a constant value rather than scaling
on a per-user basis when calculating availability window attendance.

In addition, one potential speed-up at a cost of returning
potentailly unoptimal results could be to change the algorithm
to be greedy. Rather than enumerate all possible availabilities and
select the top n best ones, we could instead just return the first n
availability windows we find. This could potentially be configurable
via a querystring parameter to provide client choice, especially
when paired with the `minimum_attendees` parameter.

Also, I _believe_ the example provided in challenge 3 of the
parent repository is incorrect. User 3 cannot work at 9 AM eastern
as it is outside of their working hours.

## TO-DOs
- [ ] Generate OpenAPI routes and schemas via [an auto-generate tool](
        https://github.com/bee-travels/openapi-comment-parser
      )
- [ ] Add request parameter and user data validation (see TODOs in code)
- [ ] Improve unit testing coverage beyond the one function covered
