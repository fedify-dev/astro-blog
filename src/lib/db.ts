import { Database } from "bun:sqlite";

const db = new Database("blog.db");

db.run(`
  CREATE TABLE IF NOT EXISTS key_pairs (
    identifier TEXT NOT NULL,
    algorithm  TEXT NOT NULL,
    private_key BLOB NOT NULL,
    public_key  BLOB NOT NULL,
    PRIMARY KEY (identifier, algorithm)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS followers (
    actor_id  TEXT PRIMARY KEY,
    inbox_url TEXT NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS posts (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    url          TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    published_at TEXT NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS comments (
    id           TEXT PRIMARY KEY,
    post_id      TEXT NOT NULL,
    author_url   TEXT NOT NULL,
    author_name  TEXT NOT NULL,
    content      TEXT NOT NULL,
    published_at TEXT NOT NULL
  )
`);

export default db;
