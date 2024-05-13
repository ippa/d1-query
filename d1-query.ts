import {D1Database} from "@cloudflare/workers-types";

type WhereOperator = "<" | ">" | "<=" | ">=" | "=" | "!=" | "LIKE";

// Operators that do not require an additional parameter
type SQLUnaryOperator = "IS NULL" | "IS NOT NULL" | "NOT" | "EXISTS";

// Operators that require one or more additional parameters
type SQLBinaryOperator =
  | "="
  | "!="
  | "<>"
  | ">"
  | "<"
  | ">="
  | "<="
  | "AND"
  | "OR"
  | "BETWEEN"
  | "NOT BETWEEN"
  | "LIKE"
  | "NOT LIKE"
  | "GLOB"
  | "NOT GLOB"
  | "IN"
  | "NOT IN"
  | "IS"
  | "IS NOT";

type Option = {
  db?: D1Database;
  table?: string;
  dontUpdateTimestamps?: boolean;
};

type EnsureNotArray<T> = T extends any[] ? never : T;
type EnsureArray<T> = T extends any[] ? T : T[];

export class D1Query<
  DB extends object,
  T extends keyof DB = undefined,
  C = DB[T],
  T2 extends keyof DB = undefined,
  C2 = DB[T2],
  SC = {}
> {
  static db: D1Database;
  #db?: D1Database;
  #options?: Option = {};
  // primaryKey: string = "id";
  // createdAtColumn: string;
  // updatedAtColumn: string;
  #q: Record<string, any> = {};

  set db(db: D1Database) {
    this.#db = db;
    this.#options = {...this.#options, db};
  }
  get db() {
    return this.#db;
  }

  get options() {
    return this.#options;
  }

  constructor(options?: Option, query?: Record<string, any>) {
    this.#options = options;
    this.#db = options?.db;
    this.#q.whereParameters = [];
    this.#q.orderBy = [];

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        this.#q[key] = value;
      });
    }
  }

  select(select: string | Array<string>): D1Query<DB, T, C> {
    if (Array.isArray(select)) select = select.join(", ");
    return new D1Query(this.#options, {...this.#q, select});
  }

  from<T extends keyof DB>(from: T) {
    return new D1Query<DB, T, DB[T]>(this.#options, {...this.#q, from});
  }

  where(column: keyof C, operator: SQLUnaryOperator): D1Query<DB, T, C>;
  where(column: keyof C, operator: SQLBinaryOperator, value: any): D1Query<DB, T, C>;
  where(
    column: keyof C | string,
    operator: SQLUnaryOperator | SQLBinaryOperator,
    value?: any
  ): D1Query<DB, T, C> {
    if (typeof operator === "undefined" && typeof value === "undefined") {
      return new D1Query(this.#options, {...this.#q, where: String(column)});
    }

    if (typeof value === "undefined") {
      return new D1Query(this.#options, {
        ...this.#q,
        where: `${String(column)} ${operator}`,
      });
    }

    return new D1Query(this.#options, {
      ...this.#q,
      where: `${String(column)} ${operator} ?`,
      whereParameters: [...this.#q.whereParameters, value],
    });
  }

  and(column: keyof C, operator: WhereOperator, value: any) {
    if (!this.#q.where) throw "and() must come after where()";

    return new D1Query<DB, T, C>(this.#options, {
      ...this.#q,
      where: `${this.#q.where} AND ${String(column)} ${operator} ?`,
      whereParameters: [...this.#q.whereParameters, value],
    });
  }

  or(column: keyof C, operator: WhereOperator, value: any) {
    if (!this.#q.where) throw "or() must come after where()";

    return new D1Query<DB, T, C>(this.#options, {
      ...this.#q,
      where: `${this.#q.where} OR ${String(column)} ${operator} ?`,
      whereParameters: [...this.#q.whereParameters, value],
    });
  }

  groupBy(groupBy: string): D1Query<DB, T, C, T2, C2> {
    return new D1Query(this.#options, {...this.#q, groupBy});
  }

  having(having: string): D1Query<DB, T, C, T2, C2> {
    return new D1Query(this.#options, {...this.#q, having});
  }

  count(count: string = "*"): D1Query<DB, T, C> {
    return new D1Query(this.#options, {...this.#q, count});
  }

  deleteFrom<T extends keyof DB>(table: T): D1Query<DB, T, DB[T]> {
    return new D1Query(this.#options, {
      ...this.#q,
      deleteFrom: `DELETE FROM ${String(table)}`,
    });
  }

  insertInto<T extends keyof DB>(table: T, data: Partial<DB[T]>) {
    let columnNames = Object.keys(data).join(", ");
    let values = Object.keys(data)
      .map((_x) => "?")
      .join(", ");

    // if (this.createdAtColumn && !(this.createdAtColumn in data)) {
    //   columnNames += ", " + this.createdAtColumn;
    //   values += ", datetime('now')";
    // }

    // if (this.updatedAtColumn && !(this.updatedAtColumn in data)) {
    //   columnNames += ", " + this.updatedAtColumn;
    //   values += ", datetime('now')";
    // }

    const insertInto = `INSERT INTO ${String(table)} (${columnNames}) VALUES (${values})`;

    return new D1Query<DB, T, DB[T]>(this.#options, {
      ...this.#q,
      table,
      insertInto,
    });
  }

  // insertInto<T extends keyof DB, X extends keyof DB[T]>(table: T, columns: Array<X>) {
  //   return new D1Query<DB, T, DB[T], {}, {}, Pick<DB[T], X>>(this.#options, {
  //     ...this.#q,
  //     table,
  //     insertInto: columns,
  //   });
  // }

  // values<LT extends TupleOfPropertyTypes<SC>>(...values: LT) {
  //   let columnNames = Object.keys(values).join(", ");
  //   let questionmarks = Object.keys(values)
  //     .map((_x) => "?")
  //     .join(", ");
  // }

  // update<T extends keyof DB>(table: T, data: Partial<DB[typeof table]>) {
  //   let set = Object.keys(data)
  //     .map((key) => `${key} = ?`)
  //     .join(", ");

  //   // if (this.updatedAtColumn && this.updatedAtColumn in data) {
  //   //   set += `, ${this.updatedAtColumn} = datetime('now')`;
  //   // }

  //   const update = `UPDATE ${String(table)} SET ${set}`;
  //   return new D1Query<DB, T, DB[T]>(this.#options, {table, update});
  // }

  update<T extends keyof DB>(update: T) {
    return new D1Query<DB, T, DB[T]>(this.#options, {...this.#q, update});
  }

  set(data: Partial<C>) {
    let set = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(", ");

    return new D1Query<DB, T, C>(this.#options, {
      ...this.#q,
      set,
      setParameters: Object.values(data),
    });
  }

  leftJoin<T2 extends keyof DB>(leftJoin: T2) {
    return new D1Query<DB, T, C, T2, DB[T2]>(this.#options, {...this.#q, leftJoin});
  }
  rightJoin<T2 extends keyof DB>(rightJoin: T2) {
    return new D1Query<DB, T, C, T2, DB[T2]>(this.#options, {...this.#q, rightJoin});
  }
  innerJoin<T2 extends keyof DB>(innerJoin: T2) {
    return new D1Query<DB, T, C, T2, DB[T2]>(this.#options, {...this.#q, innerJoin});
  }
  outerJoin<T2 extends keyof DB>(outerJoin: T2) {
    return new D1Query<DB, T, C, T2, DB[T2]>(this.#options, {...this.#q, outerJoin});
  }

  on(cmd: string): D1Query<DB, T, C, T2, C2>;
  on(
    column: `${string & T}.${string & keyof C}`,
    operator?: WhereOperator,
    column2?: `${string & T2}.${string & keyof C2}`
  ): D1Query<DB, T, C, T2, C2>;
  on(
    column: `${string & T}.${string & keyof C}` | string,
    operator?: WhereOperator,
    column2?: `${string & T2}.${string & keyof C2}`
  ): D1Query<DB, T, C, T2, C2> {
    if (typeof operator === "undefined" && typeof column2 === "undefined") {
      return new D1Query(this.#options, {...this.#q, on: String(column)});
    }
    return new D1Query(this.#options, {
      ...this.#q,
      on: `${String(column)} ${operator} ${String(column2)}`,
    });
  }

  offset(offset: number): D1Query<DB, T, C, T2, C2> {
    // if (!this.#q.limit) this.#q.limit = 99999999;
    return new D1Query(this.#options, {...this.#q, offset});
  }

  limit(limit: number): D1Query<DB, T, C, T2, C2> {
    return new D1Query(this.#options, {...this.#q, limit});
  }

  orderBy<X extends keyof C & string>(
    orderBy: `${X} ${"DESC" | "ASC"}`
    // orderBy: `${"ASC" | "DESC"}`
  ): D1Query<DB, T, C, T2, C2> {
    return new D1Query(this.#options, {...this.#q, orderBy: [...this.#q.orderBy, orderBy]});
    // return new D1Query(this.#options, {...this.#q, orderBy: []});
  }

  force(force: boolean = true): D1Query<DB, T, C, T2, C2> {
    return new D1Query(this.#options, {...this.#q, force});
  }

  validate() {
    if (this.#q.update && !this.#q.set) {
      throw new Error(`Can't do update without set`);
    }

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
    let bindlist: any[] = [];
    let sql = "";

    // console.log("this.#q", this.#q);

    this.#q.from ||= this.#options?.table;

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
        sql += ` LEFT JOIN ${this.#q.leftJoin}`;
      }
      if (this.#q.rightJoin) {
        sql += ` RIGHT JOIN ${this.#q.rightJoin}`;
      }
      if (this.#q.innerJoin) {
        sql += ` INNER JOIN ${this.#q.innerJoin}`;
      }
      if (this.#q.outerJoin) {
        sql += ` OUTER JOIN ${this.#q.outerJoin}`;
      }
      if (this.#q.on) {
        sql += ` ON ${this.#q.on}`;
      }
    } else if (this.#q.insertInto) {
      sql = this.#q.insertInto;
    } else if (this.#q.deleteFrom) {
      sql = this.#q.deleteFrom;
    } else if (this.#q.update) {
      sql = `UPDATE ${this.#q.update}`;
      if (this.#q.set) {
        sql += ` SET ${this.#q.set}`;
        bindlist.push(...this.#q.setParameters);
      }
    }

    // prettier-ignore
    {
      if (this.#q.groupBy)          { sql += " GROUP BY"; bindlist.push(this.#q.groupBy) };
      if (this.#q.having)           { sql += " HAVING"; bindlist.push(this.#q.having) }
      if (this.#q.where)            { sql += ` WHERE ${this.#q.where}` }
      if (this.#q.whereParameters)  { bindlist.push(...this.#q.whereParameters) }
      if(this.#q.orderBy?.length > 0) {
        const orderBy = this.#q.orderBy?.map( orderBy => {
          bindlist.push(orderBy) 
          return "?"
        } ).join(", ");
        sql += ` ORDER BY ${orderBy}`;
      }

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

  async all(): Promise<C[]> {
    let [sql, bindlist] = this.queryBuilder();
    this.validate();

    if (!this.#q.select) sql += " RETURNING *";

    const db = D1Query.db || this.#db;
    const {results, success} = await db
      .prepare(sql)
      .bind(...bindlist)
      .all();

    return results as C[];
  }

  async first(column?: string): Promise<C> {
    let [sql, bindlist] = this.queryBuilder();
    this.validate();

    if (!this.#q.select) sql += " RETURNING *";

    const db = D1Query.db || this.#db;

    const row = await db
      .prepare(sql)
      .bind(...bindlist)
      .first();

    return row as C;
  }

  async run() {
    const [sql, bindlist] = this.queryBuilder();
    this.validate();

    const db = D1Query.db || this.#db;

    const response = await db
      .prepare(sql)
      .bind(...bindlist)
      .run();

    return response;
  }

  async sql<T extends object>(query: string, ...params: unknown[]): Promise<EnsureArray<T>> {
    const db = D1Query.db || this.#db;
    if (!db) throw new Error("No database connection, try setting D1Query.db = <your_db_conn>");

    const {results, success} = await db
      .prepare(query)
      .bind(...params)
      .all();

    return results as EnsureArray<T>;
  }

  async sqlFirst<T extends object>(
    query: string,
    ...params: unknown[]
  ): Promise<EnsureNotArray<T>> {
    const db = D1Query.db || this.#db;
    if (!db) throw new Error("No database connection, try setting D1Query.db = <your_db_conn>");

    const row = await db
      .prepare(query)
      .bind(...params)
      .first();

    return row as EnsureNotArray<T>;
  }

  async tableInfo(table: string) {
    const sql = `PRAGMA table_info(${table})`;
    const data = await this.#db?.prepare(sql).all();
    return data;
  }

  async tableList(showAll = false) {
    const sql = "PRAGMA table_list";
    let data = await this.#db?.prepare(sql).all();
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
