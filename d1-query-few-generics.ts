import {D1Database} from "@cloudflare/workers-types";
import {Shader} from "./d1-query.test";

type WhereOperator = "<" | ">" | "<=" | ">=" | "=" | "!=" | "LIKE";

type Option = {
  db: D1Database;
  dontUpdateTimestamps?: boolean;
};

// export class D1Query<DB, T extends keyof DB|undefined, T2 = {}> {
export class D1Query<
  DB,
  T extends keyof DB | undefined = undefined,
  T2 extends keyof DB | undefined = undefined,
  C = {}
> {
  static db: D1Database;
  db?: D1Database;
  options?: Option;
  primaryKey: string = "id";
  createdAtColumn: string;
  updatedAtColumn: string;
  #q: Record<string, any> = {};

  constructor(options?: Option, query?: Record<string, any>) {
    this.options = options;
    this.db = options?.db;
    this.#q.whereParameters = [];

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        this.#q[key] = value;
      });
    }
  }

  select(select: string | Array<string>) {
    if (Array.isArray(select)) select = select.join(", ");
    return new D1Query<DB, T>(this.options, {select});
  }

  from<T extends keyof DB>(table: T) {
    return new D1Query<DB, T, T, keyof DB[T]>(this.options, {...this.#q, from: table});
  }

  // leftJoin<K2 extends keyof T>(leftJoin: K2): D1Query<T, C, T[K2]> {
  //   return new D1Query<T, C, T[K2]>(this.options, {leftJoin});
  // }

  leftJoin<T2 extends keyof DB>(leftJoin: T2) {
    return new D1Query<DB, T, T2>(this.options, {leftJoin});
  }

  // on(cmd: string): D1Query<T, C, C2>;
  // on(column: `${keyof C}`, operator?: WhereOperator, column2?: keyof C2): D1Query<T, C, C2>;
  on<T extends keyof DB & string, T2 extends keyof DB>(
    column: `${T}.${keyof DB[T]}`,
    operator?: WhereOperator,
    column2?: `${string & T2}.${keyof DB[T2] & string}`
  ): D1Query<DB, T, T2> {
    if (typeof operator === "undefined" && typeof column2 === "undefined") {
      return new D1Query(this.options, {...this.#q, on: String(column)});
    }
    return new D1Query(this.options, {
      ...this.#q,
      on: `${String(column)} ${operator} ${String(column2)}`,
    });
  }

  // on(on: string): D1Query<T> {
  //   return new D1Query(this.options, {on});
  // }

  where(cmd: string): D1Query<DB, T>;
  where<T extends keyof DB>(
    column: keyof DB[T],
    operator?: WhereOperator,
    value?: any
  ): D1Query<DB, T>;
  where<T extends keyof DB>(
    column: keyof DB[T] | string,
    operator?: WhereOperator,
    value?: any
  ): D1Query<DB, T> {
    if (typeof operator === "undefined" && typeof value === "undefined") {
      return new D1Query(this.options, {...this.#q, where: String(column)});
    }

    return new D1Query(this.options, {
      ...this.#q,
      where: `${String(column)} ${operator} ?`,
      whereParameters: [...this.#q.whereParameters, value],
    });
  }

  and<T extends keyof DB>(column: keyof DB[T], operator: WhereOperator, value: any) {
    if (!this.#q.where) throw "and() must come after where()";

    return new D1Query<DB, T>(this.options, {
      ...this.#q,
      where: `${this.#q.where} AND ${String(column)} ${operator} ?`,
      whereParameters: [...this.#q.whereParameters, value],
    });
  }

  or<T extends keyof DB>(column: keyof DB[T], operator: WhereOperator, value: any) {
    if (!this.#q.where) throw "or() must come after where()";

    return new D1Query<DB, T>(this.options, {
      ...this.#q,
      where: `${this.#q.where} OR ${String(column)} ${operator} ?`,
      whereParameters: [...this.#q.whereParameters, value],
    });
  }

  count(count: string = "*"): D1Query<DB, T> {
    return new D1Query(this.options, {...this.#q, count});
  }

  deleteFrom<T extends keyof DB>(table: T) {
    return new D1Query(this.options, {
      ...this.#q,
      table,
      deleteFrom: `DELETE FROM ${String(table)}`,
    }) as D1Query<DB, T>;
  }

  insertInto<T extends keyof DB>(table: T, data: Partial<DB[T]>) {
    let columnNames = Object.keys(data).join(", ");
    let values = Object.keys(data)
      .map((_x) => "?")
      .join(", ");

    if (this.createdAtColumn && !(this.createdAtColumn in data)) {
      columnNames += ", " + this.createdAtColumn;
      values += ", datetime('now')";
    }

    if (this.updatedAtColumn && !(this.updatedAtColumn in data)) {
      columnNames += ", " + this.updatedAtColumn;
      values += ", datetime('now')";
    }

    const insertInto = `INSERT INTO ${String(table)} (${columnNames}) VALUES (${values})`;

    return new D1Query<DB, T>(this.options, {
      ...this.#q,
      table,
      insertInto,
    });
  }

  update<T extends keyof DB>(table: T, data: Partial<DB[typeof table]>) {
    let set = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(", ");

    if (this.updatedAtColumn && this.updatedAtColumn in data) {
      set += `, ${this.updatedAtColumn} = datetime('now')`;
    }

    const update = `UPDATE ${String(table)} SET ${set}`;
    return new D1Query<DB, T, DB[T]>(this.options, {table, update});
  }

  offset(offset: number): D1Query<DB, T> {
    // if (!this.#q.limit) this.#q.limit = 99999999;
    return new D1Query(this.options, {offset});
  }

  limit(limit: number): D1Query<DB, T, T2> {
    return new D1Query(this.options, {...this.#q, limit});
  }

  orderBy(orderBy: string): D1Query<DB, T> {
    return new D1Query(this.options, {orderBy});
  }

  force(force: boolean = true): D1Query<DB, T> {
    return new D1Query(this.options, {force});
  }

  validate() {
    if (this.#q.select && this.#q.count) {
      throw new Error(`Can't use both select("${this.#q.select}") and count("${this.#q.count}")`);
    }

    if (this.#q.update && !this.#q.where && !this.#q.force) {
      throw "update() without where() is unsafe. Append force() if you really want to do this.";
    }

    if (this.#q.deleteFrom && !this.#q.where && !this.#q.force) {
      throw "deleteFrom() without where() is unsafe. Append force() if you really want to do this.";
    }

    if (this.#q.where) {
      const parameterCount = (this.#q.where.match(/\?/g) || []).length;

      if (parameterCount !== this.#q.whereParameters.length)
        throw new Error(
          `?-parameters vs actual values mismatch: ${parameterCount} != ${
            this.#q.whereParameters.length
          }`
        );
    }
  }

  queryBuilder(): [string, (string | number)[]] {
    let bindlist = [];
    let sql = "";

    // console.log("this.#q", this.#q);

    if (
      this.#q.from &&
      !this.#q.select &&
      !this.#q.insertInto &&
      !this.#q.deleteFrom &&
      !this.#q.update
    ) {
      this.#q.select = "*";
    }

    if (this.#q.select) {
      const select = this.#q.count ? `COUNT(${this.#q.count})` : this.#q.select || "*";
      sql = "SELECT " + select + " FROM " + String(this.#q.from);

      if (this.#q.leftJoin) {
        sql += ` LEFT JOIN ${this.#q.leftJoin} `;
      }
      if (this.#q.on) {
        sql += ` ON ${this.#q.on} `;
      }
    } else if (this.#q.insertInto) {
      sql = this.#q.insertInto;
    } else if (this.#q.deleteFrom) {
      sql = this.#q.deleteFrom;
    } else if (this.#q.update) {
      sql = this.#q.update;
    }

    // prettier-ignore
    {
      if (this.#q.groupBy)          { sql += " GROUP BY"; bindlist.push(this.#q.groupBy) };
      if (this.#q.having)           { sql += " HAVING"; bindlist.push(this.#q.having) }
      if (this.#q.where)            { sql += ` WHERE ${this.#q.where}` }
      if (this.#q.whereParameters)  { bindlist.push(...this.#q.whereParameters) }
      if (this.#q.orderBy)          { sql += " ORDER BY ?"; bindlist.push(this.#q.orderBy) }
      if (this.#q.limit)            { sql += " LIMIT ?"; bindlist.push(this.#q.limit) }
      if (this.#q.offset)           { sql += " OFFSET ?"; bindlist.push(this.#q.offset) }
    }

    return [sql, bindlist];
  }

  toSQL(): string {
    // @ts-ignore
    let [sql, bindlist] = this.queryBuilder();
    return sql;
  }

  parameters(): any[] {
    // @ts-ignore
    const [sql, bindlist] = this.queryBuilder();
    return bindlist;
  }

  async all(): Promise<DB[]> {
    let [sql, bindlist] = this.queryBuilder();
    this.validate();

    if (!this.#q.select) sql += " RETURNING *";

    const db = D1Query.db || this.db;

    const {results, success} = await db
      .prepare(sql)
      .bind(...bindlist)
      .all();

    return results as DB[];
  }

  async first(column?: string): Promise<DB> {
    let [sql, bindlist] = this.queryBuilder();
    this.validate();

    if (!this.#q.select) sql += " RETURNING *";

    const db = D1Query.db || this.db;

    const row = await db
      .prepare(sql)
      .bind(...bindlist)
      .first(column);

    return row as DB;
  }

  async run() {
    const [sql, bindlist] = this.queryBuilder();
    this.validate();

    const db = D1Query.db || this.db;

    const response = await db
      .prepare(sql)
      .bind(...bindlist)
      .run();

    return response;
  }

  async sql<T>(query: string, ...params: unknown[]): Promise<T[]> {
    const db = D1Query.db || this.db;
    const {results, success} = await db
      .prepare(query)
      .bind(...params)
      .all();

    return results as T[];
  }

  async tableInfo(table: string) {
    const sql = `PRAGMA table_info(${table})`;
    const data = await this.db?.prepare(sql).all();
    return data;
  }

  async tableList(showAll = false) {
    const sql = "PRAGMA table_list";
    let data = await this.db?.prepare(sql).all();
    if (!showAll) {
      // filter out special d1 tables
      const specialTables = [
        "sqlite_sequence",
        "d1_migrations",
        "_cf_KV",
        "sqlite_schema",
        "sqlite_temp_schema",
      ];
      // data = data.filter(({name}) => !name.startsWith("d1_"));
    }
    return data;
  }
}

export async function sqlFirst<T>(db: D1Database, query: string, ...params: unknown[]): Promise<T> {
  const row = await db
    .prepare(query)
    .bind(...params)
    .first();

  return row as T;
}
