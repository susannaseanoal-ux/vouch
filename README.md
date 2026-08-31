# Vouch - MERN edition

A rebuild of the Vouch site on the MERN stack (MongoDB, Express,
React, Node), carrying over the lead capture, the public lead-lookup page
with its milestone journey, and the admin dashboard.

Theme: white and light blue.

---

## What is here

```
logo/          drop your company logo in here (see logo/README.md)
server/        Express API + MongoDB models
client/        React front end (Vite)
```

## Requirements

- Node 18 or newer (you have Node 26 - fine)
- A MongoDB database. There is no MongoDB on this machine, so use a free
  MongoDB Atlas cluster: https://www.mongodb.com/atlas - create a cluster,
  add a database user, allow your IP, then copy the connection string.

## Getting it running

Everything is driven from **this folder** - you do not need to cd into
`server/` or `client/`.

```bash
npm run setup     # installs both halves, creates server/.env
```

Then paste your MongoDB connection string after `MONGODB_URI=` in
`server/.env`, and:

```bash
npm run seed      # creates your first admin account
npm run dev       # API on :4000 and website on :5173, together
```

Open http://localhost:5173 for the site and
http://localhost:5173/admin for the dashboard.

### Just want to look at the website?

The front end runs on its own with no database at all:

```bash
npm run dev:client
```

The pages render and the design is all there; the quote form and the
lookup page will error, because there is no API behind them.

### Every command

| Command | What it does |
|---|---|
| `npm run setup` | Install both halves and create `server/.env` |
| `npm run dev` | Run the API and the website together |
| `npm run dev:client` | Website only - no database needed |
| `npm run dev:server` | API only |
| `npm run seed` | Create the first admin account |
| `npm run build` | Build the website for production |

## The lead journey

The distinctive part of this app. Each lead follows a plan of milestones
chosen by its type:

- **Coverage request** - 8 steps, ending at Policy issued
- **Group interview** - 7 steps, ending at Welcome aboard

An admin walks a lead forward one approval at a time from the dashboard,
and the lead's status follows along. A **callback** is special: it can be
added any number of times and sits wherever its timestamp places it, so
the journey reads in true chronological order.

Every time shown to a customer is a real recorded time. A step that is
known to have been reached but was never timed says so, rather than
being given a plausible-looking date.

## Environment variables

See `server/.env.example`. Nothing secret is committed.
