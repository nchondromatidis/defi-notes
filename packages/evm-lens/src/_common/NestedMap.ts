/**
 * A typesafe nested map data structure.
 *
 * @template K - A tuple representing the types of keys at each level (e.g., [string, number]).
 * @template V - The type of the value stored at the deepest level.
 */
export class NestedMap<K extends unknown[], V> {
  // We use 'any' internally to avoid complex recursive type overhead in implementation,
  // but the public API is strictly typed via the generic K.
  private storage: Map<any, any>;

  constructor() {
    this.storage = new Map();
  }

  /**
   * Sets a value at the specified nested keys.
   * Usage: map.set(key1, key2, ..., value)
   */
  set(...args: [...K, V]): void {
    const value = args[args.length - 1] as V;
    const keys = args.slice(0, -1) as unknown as K;

    let current: Map<any, any> = this.storage;

    // Iterate through all keys except the last one to build the structure
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current.has(key)) {
        current.set(key, new Map());
      }
      current = current.get(key);
    }

    // Set the final value using the last key
    current.set(keys[keys.length - 1], value);
  }

  /**
   * Sets a value ONLY if the key path does not already exist.
   * Throws an error if a value is already stored at these keys.
   */
  setNotDuplicate(...args: [...K, V]): void {
    // Extract keys to check existence
    const keys = args.slice(0, -1) as unknown as K;

    if (this.has(...keys)) {
      throw new Error(`Duplicate key error: Value already exists at path [${keys.join(', ')}]`);
    }

    // If safe, proceed to set using the standard logic
    this.set(...args);
  }

  /**
   * Retrieves a value from the specified nested keys.
   * Usage: map.get(key1, key2, ...)
   */
  get(...keys: K): V | undefined {
    let current: Map<any, any> | undefined = this.storage;

    for (const key of keys) {
      if (!current || !current.has(key)) {
        return undefined;
      }
      current = current.get(key);
    }

    return current as V;
  }

  /**
   * Retrieves the intermediate Map at a partial key path.
   * Usage: map.getMapAt(key1, key2, ...)
   *
   */
  getMapAt<Keys extends unknown[]>(...keys: Keys): BuildNestedMap<RemainingKeys<K, Keys['length']>, V> | undefined {
    let current: Map<any, any> | undefined = this.storage;

    for (const key of keys) {
      if (!current || !current.has(key)) {
        return undefined as any;
      }
      current = current.get(key);
    }

    return current as any;
  }

  /**
   * Checks if a value exists at the specified nested keys.
   * Usage: map.has(key1, key2, ...)
   */
  has(...keys: K): boolean {
    let current: Map<any, any> | undefined = this.storage;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!current || !current.has(key)) {
        return false;
      }
      // If we are at the last key, checks if it exists in the final map
      if (i === keys.length - 1) {
        return true;
      }
      current = current.get(key);
    }
    return false;
  }

  /**
   * Deletes a value at the specified nested keys.
   * Usage: map.delete(key1, key2, ...)
   * Note: This implementation does not clean up empty parent maps.
   */
  delete(...keys: K): boolean {
    let current: Map<any, any> | undefined = this.storage;
    const maps: Map<any, any>[] = [current];

    // Traverse down to the second to last map
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current || !current.has(key)) {
        return false;
      }
      current = current.get(key);
      maps.push(current!);
    }

    // Delete the final entry
    const finalKey = keys[keys.length - 1];
    const success = current!.delete(finalKey);

    // Optional: Clean up empty maps bubbling up
    // (Remove this block if you want to keep empty branches)
    if (success) {
      for (let i = maps.length - 1; i > 0; i--) {
        const parent = maps[i - 1];
        const child = maps[i];
        const key = keys[i - 1];
        if (child.size === 0) {
          parent.delete(key);
        } else {
          break;
        }
      }
    }

    return success;
  }

  clear() {
    this.storage = new Map();
  }

  push(...args: [...K, V extends Array<infer T> ? T : never]): void {
    const value = args[args.length - 1] as any;
    const keys = args.slice(0, -1) as unknown as K;

    let arr = this.get(...keys) as any[] | undefined;

    if (!arr) {
      arr = [];
      this.set(...keys, arr as any);
    }

    arr.push(value);
  }

  add(...args: [...K, V extends Set<infer T> ? T : never]): void {
    const value = args[args.length - 1] as any;
    const keys = args.slice(0, -1) as unknown as K;

    let set = this.get(...keys) as Set<any> | undefined;

    if (!set) {
      set = new Set();
      this.set(...keys, set as any);
    }

    set.add(value);
  }
}

// Helper type to build nested Map structure from remaining keys
type BuildNestedMap<Keys extends readonly unknown[], Value> = Keys extends readonly [infer First, ...infer Rest]
  ? Rest extends []
    ? Map<First, Value>
    : Map<First, BuildNestedMap<Rest, Value>>
  : never;

// Helper type to get remaining keys after N keys consumed
type RemainingKeys<Tuple extends readonly unknown[], N extends number> = N extends 0
  ? Tuple
  : Tuple extends readonly [unknown, ...infer Rest]
    ? RemainingKeys<Rest, Prev[N]>
    : [];

type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
