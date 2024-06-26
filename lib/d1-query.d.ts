import { D1Database } from "@cloudflare/workers-types";
type WhereOperator = "<" | ">" | "<=" | ">=" | "=" | "!=" | "LIKE";
type SQLUnaryOperator = "IS NULL" | "IS NOT NULL" | "NOT" | "EXISTS";
type SQLBinaryOperator = "=" | "!=" | "<>" | ">" | "<" | ">=" | "<=" | "AND" | "OR" | "BETWEEN" | "NOT BETWEEN" | "LIKE" | "NOT LIKE" | "GLOB" | "NOT GLOB" | "IN" | "NOT IN" | "IS" | "IS NOT";
type Option = {
    db?: D1Database;
    table?: string;
    dontUpdateTimestamps?: boolean;
};
type EnsureNotArray<T> = T extends any[] ? never : T;
type EnsureArray<T> = T extends any[] ? T : T[];
export declare class D1Query<DB extends object, T extends keyof DB = undefined, C = DB[T], T2 extends keyof DB = undefined, C2 = DB[T2], SC = {}> {
    #private;
    static db: D1Database;
    set db(db: D1Database);
    get db(): D1Database;
    get options(): Option;
    constructor(options?: Option, query?: Record<string, any>);
    select(select: string | Array<string>): D1Query<DB, T, C>;
    from<T extends keyof DB>(from: T): D1Query<DB, T, DB[T], undefined, DB[undefined], {}>;
    where(column: keyof C, operator: SQLUnaryOperator): D1Query<DB, T, C>;
    where(column: keyof C, operator: SQLBinaryOperator, value: any): D1Query<DB, T, C>;
    and(column: keyof C, operator: WhereOperator, value: any): D1Query<DB, T, C, undefined, DB[undefined], {}>;
    or(column: keyof C, operator: WhereOperator, value: any): D1Query<DB, T, C, undefined, DB[undefined], {}>;
    groupBy(groupBy: string): D1Query<DB, T, C, T2, C2>;
    having(having: string): D1Query<DB, T, C, T2, C2>;
    deleteFrom<T extends keyof DB>(table: T): D1Query<DB, T, DB[T]>;
    insertInto<T extends keyof DB>(table: T, data: Partial<DB[T]>): D1Query<DB, T, DB[T], undefined, DB[undefined], {}>;
    update<T extends keyof DB>(update: T): D1Query<DB, T, DB[T], undefined, DB[undefined], {}>;
    set(data: Partial<C>): D1Query<DB, T, C, undefined, DB[undefined], {}>;
    leftJoin<T2 extends keyof DB>(leftJoin: T2): D1Query<DB, T, C, T2, DB[T2], {}>;
    rightJoin<T2 extends keyof DB>(rightJoin: T2): D1Query<DB, T, C, T2, DB[T2], {}>;
    innerJoin<T2 extends keyof DB>(innerJoin: T2): D1Query<DB, T, C, T2, DB[T2], {}>;
    outerJoin<T2 extends keyof DB>(outerJoin: T2): D1Query<DB, T, C, T2, DB[T2], {}>;
    on(cmd: string): D1Query<DB, T, C, T2, C2>;
    on(column: `${string & T}.${string & keyof C}`, operator?: WhereOperator, column2?: `${string & T2}.${string & keyof C2}`): D1Query<DB, T, C, T2, C2>;
    offset(offset: number): D1Query<DB, T, C, T2, C2>;
    limit(limit: number): D1Query<DB, T, C, T2, C2>;
    orderBy<X extends keyof C & string>(orderBy: `${X} ${"DESC" | "ASC"}`): D1Query<DB, T, C, T2, C2>;
    force(force?: boolean): D1Query<DB, T, C, T2, C2>;
    validate(): void;
    queryBuilder(): [string, (string | number)[]];
    toSQL(): string;
    parameters(): any[];
    all(): Promise<C[]>;
    first(column?: string): Promise<C>;
    run(): Promise<import("@cloudflare/workers-types").D1Response>;
    sql<T extends object>(query: string, ...params: unknown[]): Promise<EnsureArray<T>>;
    sqlFirst<T extends object>(query: string, ...params: unknown[]): Promise<EnsureNotArray<T>>;
    tableInfo(table: string): Promise<import("@cloudflare/workers-types").D1Result<Record<string, unknown>>>;
    tableList(showAll?: boolean): Promise<import("@cloudflare/workers-types").D1Result<Record<string, unknown>>>;
}
export {};
