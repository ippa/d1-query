import {D1Query} from "./d1-query";

export class User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}
export class Shader {
  id: number;
  user_id?: number;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  shaderengine: {
    shaders: Shader;
    users: User;
  };
}

const d1 = new D1Query<Database["shaderengine"]>();

test("d1 sql", async () => {
  // d1.sql<User>("SELECT * FROM users");
});

test("d1 sql", async () => {
  // d1.sqlFirst<User>("SELECT * FROM users LIMIT 1");
});

test("multiple orderBy", () => {
  const shaders = d1.from("shaders").orderBy("id DESC").orderBy("title DESC");
  expect(shaders.toSQL()).toBe("SELECT * FROM shaders ORDER BY ?, ?");
});

test("leftJoin On", () => {
  const shaders = d1
    .from("shaders")
    .select("shaders.*, users.name as user_name")
    .leftJoin("users")
    .on("shaders.user_id", "=", "users.id")
    .orderBy("id DESC");

  expect(shaders.toSQL()).toBe(
    "SELECT shaders.*, users.name as user_name FROM shaders LEFT JOIN users ON shaders.user_id = users.id ORDER BY ?"
  );
});

test("class User should contain updated_at-property", () => {
  const user = new User();
  expect("updated_at" in user).toBe(true);
});

test("users", () => {
  const users = d1.from("users");
  expect(users.where("id", "=", 1).toSQL()).toBe("SELECT * FROM users WHERE id = ?");
  expect(users.where("id", "=", 2).toSQL()).toBe("SELECT * FROM users WHERE id = ?");
});

test("where", () => {
  const q = d1.from("users").where("id", "=", 1);
  expect(q.toSQL()).toBe("SELECT * FROM users WHERE id = ?");
});

test("where unary operators", () => {
  const q = d1.from("users").where("email", "IS NOT NULL");
  expect(q.toSQL()).toBe("SELECT * FROM users WHERE email IS NOT NULL");
});

test("select default", () => {
  const q = d1.from("users");
  expect(q.toSQL()).toBe("SELECT * FROM users");
});

test("select id,title", () => {
  const q = d1.select("id,title").from("users");
  expect(q.toSQL()).toBe("SELECT id,title FROM users");
});

test("limit", () => {
  const q = d1.from("users").limit(10);
  expect(q.toSQL()).toBe("SELECT * FROM users LIMIT ?");
});

test("where", () => {
  const q = d1.from("users").where("name", "=", "John");
  expect(q.toSQL()).toBe("SELECT * FROM users WHERE name = ?");
});

test("where + or", () => {
  const q = d1.from("users").where("id", "=", 1).or("id", "=", 2);
  expect(q.toSQL()).toBe("SELECT * FROM users WHERE id = ? OR id = ?");
});

test("where + and", () => {
  const q = d1
    .from("users")
    .where("id", "=", 1)
    .and("name", "=", "John")
    .and("email", "=", "john@gmail.com");

  expect(q.toSQL()).toBe("SELECT * FROM users WHERE id = ? AND name = ? AND email = ?");
});

test("delete without where() and force() should throw", () => {
  const q = d1.deleteFrom("users");
  expect(q.validate).toThrow();
});

test("delete without where() with force()", () => {
  const q = d1.deleteFrom("users").force();
  expect(q.validate);
});

test("count() + where()", () => {
  const q = d1.select("COUNT(*)").from("users").where("id", ">", 10);
  expect(q.toSQL()).toBe("SELECT COUNT(*) FROM users WHERE id > ?");
});

// test("update", () => {
//   const q = d1.update("users", {name: "John"}).where("id", "=", 1);
//   expect(q.toSQL()).toBe("UPDATE users SET name = ? WHERE id = ?");
// });

test("update", () => {
  const q = d1.update("users").set({name: "foo"}).where("id", "=", 1);
  expect(q.toSQL()).toBe("UPDATE users SET name = ? WHERE id = ?");
});

test("update without set", () => {
  const q = d1.update("users");
  expect(q.validate).toThrow();
});

test("insert", () => {
  const q = d1.insertInto("shaders", {title: "bar"});
  expect(q.toSQL()).toBe("INSERT INTO shaders (title) VALUES (?)");
});

test("delete", () => {
  const q = d1.deleteFrom("users").where("id", ">", 1);
  expect(q.toSQL()).toBe("DELETE FROM users WHERE id > ?");
});

// Class pattern

class ShaderTable extends D1Query<Database["shaderengine"], "shaders"> {
  async latestShaders(limit = 10) {
    return this.select("*, users.name as user_name")
      .leftJoin("users")
      .on("shaders.user_id", "=", "users.id")
      .orderBy("created_at DESC")
      .limit(limit);
  }
}
const shaderTable = new ShaderTable({table: "shaders"});

test("latestShaders", async () => {
  const q = await shaderTable.latestShaders();
  expect(q.toSQL()).toBe(
    "SELECT *, users.name as user_name FROM shaders LEFT JOIN users ON shaders.user_id = users.id ORDER BY ? LIMIT ?"
  );
});
