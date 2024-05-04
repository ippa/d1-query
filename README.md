# D1 Query

A simple, partly typesafe library for flexible queries against a Cloudflare D1 database

## Goals

- Stay as true to SQL as possible, don't invent new lingo
- Automatic generation of types from your d1 database-schema
- Typesafe as far as possible without complicating the syntax too much
- Flexible, chain statements in any order, one big query or branching from a base-query

## Warning

This project is in early days. The aim is to help out with simpler, basic SQL-queries. Not all methods have detailed types. Used in prod @ Shadr.net[https://shadr.net/]

## Generate types (depends on bun and wrangler binaries)

```bash
# Execute this in the same directory as wrangler.toml
# Writes to file "d1-query-types.ts"
bun ./node_modules/d1-query/typegen.ts
```

## Usage

### Simple query

```typescript
// The following 2 lines can with advantages be put in a standalone "db.ts" exporting d1
import {Database} from "d1-query-types"; // auto-generated with d1-queries typegen.ts
const d1 = new D1Query<Database["blog"]>(); // create a typed startingpoint for the query

// without explicit select("something") d1-query assumes select("*")
const posts = await d1
  .from("posts")
  .select("id,title,text,created_at")
  .where("public", "=", 1)
  .orderBy("created_at DESC")
  .all();
```

### Flexible branching queries

```typescript
const users = d1
  .from("users")
  .select("id,name,created_at")
  .where("deleted", "=", 0)
  .orderBy("created_at DESC");

const admins = await users.where("role", "=", "admin").all();
const moderators = await users.where("role", "=", "moderator").all();
const developers = await users.where("role", "=", "developer").all();
```

### Class-pattern

Coming from Rails / Active Record this pattern can look familiar:

```typescript
class PostTable extends D1Query<Database["blog"], "posts"> {
  async latestPosts(limit = 10) {
    return this.select("*, users.name as user_name")
      .leftJoin("users")
      .on("posts.user_id", "=", "users.id")
      .orderBy("created_at DESC")
      .limit(limit)
      .all();
  }
}
export const postTable = new PostTable({table: "posts"});
```

### With Remix [https://remix.run/]

```typescript
export async function loader({context}: LoaderFunctionArgs) {
  // "DB" is the binding from wrangler.toml, "Database" is a (by d1-query:s typegen.ts) generated interface
  const d1 = new D1Query<Database["blog"]>({db: context.cloudflare.env.DB});
  const latestPosts = await d1.from("posts").orderBy("created_at DESC").limit(10).all();
  return json({latestPosts});
}
```

## Fallback to SQL

```typescript
const list = await d1.sql<User>("SELECT id,name FROM users", parameters); // returns an array of User
// or
const row = await d1.sqlFirst<User>("SELECT * FROM users WHERE id = ?", parameters); // returns a User
```
