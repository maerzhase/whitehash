/**
 * Vendored from fxhash.xyz under the MIT License.
 * Copyright (c) fxhash contributors.
 * Source: https://github.com/fxhash/fxhash.xyz
 */
/**
 * Make the fields of an object NonNullable
 */
export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>
}
/**
 *
 * @example
 *
 * ```ts
 * interface MyInterface {
 *   prop1?: string;
 *   prop2?: number;
 * }
 *
 * // Use the utility type to create a new type that enforces the constraint
 * type TOne = AtLeastOne<MyInterface>;
 *
 * const example1: TOne = { prop1: "Hello" }; // Valid
 * const example2: TOne = { prop2: 42 }; // Valid
 * const example3: TOne = { prop1: "Hello", prop2: 42 }; // Valid
 * const example4: TOne = {}; // Error: At least one property required
 */
export type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> &
  U[keyof U]

type Only<T, U> = {
  [P in keyof T]: T[P]
} & {
  [P in keyof U]?: never
}

/**
 * When you need either interface, but don't want to accept both.
 *
 * @example
 *
 * ```ts
 * interface One {
 *   a: string
 * }
 * interface Two {
 *   b: string
 * }
 * type OneOrTwo = Either<One, Two>
 *
 * function f(par: OneOrTwo) {}
 *
 * f({ a: "" }) // ok
 * f({ b: "" }) // ok
 * f({ a: "", b: "" }) // not ok
 * ```
 */
export type Either<T, U> = Only<T, U> | Only<U, T>

/**
 * Creates a deep partial type from a given type T.
 *
 * This type recursively makes all properties of T optional, including nested objects.
 * For non-object types, it returns the original type.
 *
 * @example
 *
 * ```ts
 * type Person = {
 *   name: string;
 *   age: number;
 *   address: {
 *     street: string;
 *     city: string;
 *   };
 * };
 *
 * type PartialPerson = DeepPartial<Person>;
 *
 * const valid_update: DeepPartial<Person> = { address: { city: "New York" }, name: "John" } // ok
 * const invalid_update: DeepPartial<Person> = { address: { city: "New York" }, name: "John", age: 30, unknown: true } // Error: Object literal may only specify known properties, and 'unknown' does not exist in type 'DeepPartial<Person>'.
 *```
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>
    }
  : T

