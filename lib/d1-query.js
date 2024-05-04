export class D1Query {
    static db;
    static tableName;
    db;
    options;
    // primaryKey: string = "id";
    // createdAtColumn: string;
    // updatedAtColumn: string;
    #q = {};
    constructor(options, query) {
        this.options = options;
        this.db = options?.db;
        this.#q.whereParameters = [];
        this.#q.orderBy = [];
        if (query) {
            Object.entries(query).forEach(([key, value]) => {
                this.#q[key] = value;
            });
        }
    }
    select(select) {
        if (Array.isArray(select))
            select = select.join(", ");
        return new D1Query(this.options, { ...this.#q, select });
    }
    from(from) {
        return new D1Query(this.options, { ...this.#q, from });
    }
    where(column, operator, value) {
        if (typeof operator === "undefined" && typeof value === "undefined") {
            return new D1Query(this.options, { ...this.#q, where: String(column) });
        }
        if (typeof value === "undefined") {
            return new D1Query(this.options, {
                ...this.#q,
                where: `${String(column)} ${operator}`,
            });
        }
        return new D1Query(this.options, {
            ...this.#q,
            where: `${String(column)} ${operator} ?`,
            whereParameters: [...this.#q.whereParameters, value],
        });
    }
    and(column, operator, value) {
        if (!this.#q.where)
            throw "and() must come after where()";
        return new D1Query(this.options, {
            ...this.#q,
            where: `${this.#q.where} AND ${String(column)} ${operator} ?`,
            whereParameters: [...this.#q.whereParameters, value],
        });
    }
    or(column, operator, value) {
        if (!this.#q.where)
            throw "or() must come after where()";
        return new D1Query(this.options, {
            ...this.#q,
            where: `${this.#q.where} OR ${String(column)} ${operator} ?`,
            whereParameters: [...this.#q.whereParameters, value],
        });
    }
    groupBy(groupBy) {
        return new D1Query(this.options, { ...this.#q, groupBy });
    }
    having(having) {
        return new D1Query(this.options, { ...this.#q, having });
    }
    count(count = "*") {
        return new D1Query(this.options, { ...this.#q, count });
    }
    deleteFrom(table) {
        return new D1Query(this.options, {
            ...this.#q,
            deleteFrom: `DELETE FROM ${String(table)}`,
        });
    }
    insertInto(table, data) {
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
        return new D1Query(this.options, {
            ...this.#q,
            table,
            insertInto,
        });
    }
    // insertInto<T extends keyof DB, X extends keyof DB[T]>(table: T, columns: Array<X>) {
    //   return new D1Query<DB, T, DB[T], {}, {}, Pick<DB[T], X>>(this.options, {
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
    //   return new D1Query<DB, T, DB[T]>(this.options, {table, update});
    // }
    update(update) {
        return new D1Query(this.options, { ...this.#q, update });
    }
    set(data) {
        let set = Object.keys(data)
            .map((key) => `${key} = ?`)
            .join(", ");
        return new D1Query(this.options, { ...this.#q, set });
    }
    leftJoin(leftJoin) {
        return new D1Query(this.options, { ...this.#q, leftJoin });
    }
    rightJoin(rightJoin) {
        return new D1Query(this.options, { ...this.#q, rightJoin });
    }
    innerJoin(innerJoin) {
        return new D1Query(this.options, { ...this.#q, innerJoin });
    }
    outerJoin(outerJoin) {
        return new D1Query(this.options, { ...this.#q, outerJoin });
    }
    on(column, operator, column2) {
        if (typeof operator === "undefined" && typeof column2 === "undefined") {
            return new D1Query(this.options, { ...this.#q, on: String(column) });
        }
        return new D1Query(this.options, {
            ...this.#q,
            on: `${String(column)} ${operator} ${String(column2)}`,
        });
    }
    offset(offset) {
        // if (!this.#q.limit) this.#q.limit = 99999999;
        return new D1Query(this.options, { ...this.#q, offset });
    }
    limit(limit) {
        return new D1Query(this.options, { ...this.#q, limit });
    }
    orderBy(orderBy
    // orderBy: `${"ASC" | "DESC"}`
    ) {
        return new D1Query(this.options, { ...this.#q, orderBy: [...this.#q.orderBy, orderBy] });
        // return new D1Query(this.options, {...this.#q, orderBy: []});
    }
    force(force = true) {
        return new D1Query(this.options, { ...this.#q, force });
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
                throw new Error(`?-parameters vs actual values mismatch: ${parameterCount} != ${this.#q.whereParameters.length}`);
        }
    }
    queryBuilder() {
        let bindlist = [];
        let sql = "";
        // console.log("this.#q", this.#q);
        this.#q.from ||= this.options?.table;
        if (this.#q.from &&
            !this.#q.select &&
            !this.#q.insertInto &&
            !this.#q.deleteFrom &&
            !this.#q.update) {
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
        }
        else if (this.#q.insertInto) {
            sql = this.#q.insertInto;
        }
        else if (this.#q.deleteFrom) {
            sql = this.#q.deleteFrom;
        }
        else if (this.#q.update) {
            sql = `UPDATE ${this.#q.update}`;
            if (this.#q.set) {
                sql += ` SET ${this.#q.set}`;
            }
        }
        // prettier-ignore
        {
            if (this.#q.groupBy) {
                sql += " GROUP BY";
                bindlist.push(this.#q.groupBy);
            }
            ;
            if (this.#q.having) {
                sql += " HAVING";
                bindlist.push(this.#q.having);
            }
            if (this.#q.where) {
                sql += ` WHERE ${this.#q.where}`;
            }
            if (this.#q.whereParameters) {
                bindlist.push(...this.#q.whereParameters);
            }
            if (this.#q.orderBy?.length > 0) {
                const orderBy = this.#q.orderBy?.map(orderBy => {
                    bindlist.push(orderBy);
                    return "?";
                }).join(", ");
                sql += ` ORDER BY ${orderBy}`;
            }
            if (this.#q.limit) {
                sql += " LIMIT ?";
                bindlist.push(this.#q.limit);
            }
            if (this.#q.offset) {
                sql += " OFFSET ?";
                bindlist.push(this.#q.offset);
            }
        }
        return [sql, bindlist];
    }
    toSQL() {
        // @ts-ignore
        let [sql, bindlist] = this.queryBuilder();
        return sql;
    }
    parameters() {
        // @ts-ignore
        const [sql, bindlist] = this.queryBuilder();
        return bindlist;
    }
    async all() {
        let [sql, bindlist] = this.queryBuilder();
        this.validate();
        if (!this.#q.select)
            sql += " RETURNING *";
        const db = D1Query.db || this.db;
        const { results, success } = await db
            .prepare(sql)
            .bind(...bindlist)
            .all();
        return results;
    }
    async first(column) {
        let [sql, bindlist] = this.queryBuilder();
        this.validate();
        if (!this.#q.select)
            sql += " RETURNING *";
        const db = D1Query.db || this.db;
        const row = await db
            .prepare(sql)
            .bind(...bindlist)
            .first();
        return row;
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
    async sql(query, ...params) {
        const db = D1Query.db || this.db;
        if (!db)
            throw new Error("No database connection, try setting D1Query.db = <your_db_conn>");
        const { results, success } = await db
            .prepare(query)
            .bind(...params)
            .all();
        return results;
    }
    async sqlFirst(query, ...params) {
        const db = D1Query.db || this.db;
        if (!db)
            throw new Error("No database connection, try setting D1Query.db = <your_db_conn>");
        const row = await db
            .prepare(query)
            .bind(...params)
            .first();
        return row;
    }
    async tableInfo(table) {
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
