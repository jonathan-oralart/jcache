import { ensureDirSync } from "jsr:@std/fs@1";
import { join } from "jsr:@std/path@1";

export const cacheRead: boolean = Deno.env.get("JCACHE_READ") === "true";

export const cacheWrite: boolean = Deno.env.get("JCACHE_WRITE") === "true";

function makeFileNameSafe(path: string): string {
    // Replace slashes with underscores and remove any other potentially problematic characters
    return path.replace(/[/\\?%*:|"<>]/g, '_');
}

function fileExistsSync(path: string): boolean {
    try {
        Deno.statSync(path);
        return true;
    } catch {
        return false;
    }
}

/**
 * A decorator function that adds caching capabilities to async functions.
 * Results are cached in JSON files under a `cache` directory in the current working directory.
 * Cache behavior is controlled by JCACHE_READ and JCACHE_WRITE environment variables.
 * 
 * The cache directory structure is organized by:
 * - If first argument is a string: uses that as subfolder name
 * - If first argument is empty string: uses "empty" as subfolder name
 * - Otherwise: uses "global" as subfolder name
 * 
 * @param fn The async function to be cached
 * @returns A wrapped version of the function that implements caching
 * 
 * @example
 * ```ts
 * // Define a cacheable function
 * const fetchDataCache = jcache(async (id: string) => {
 *   const response = await fetch(`https://api.example.com/data/${id}`);
 *   return response.json();
 * });
 * 
 * // Call the function - first time will fetch and cache
 * const data1 = await fetchDataCache("123"); // Writes to cache/123/fetchDataCache.jsont
 * 
 * // Subsequent calls with same args will read from cache if JCACHE_READ=true
 * const data2 = await fetchDataCache("123"); // Reads from cache if exists
 * ```
 */
export function jcache<T extends (...args: Parameters<T>) => ReturnType<T>>(fn: T): T {
    return async function (this: ThisParameterType<T>, ...args: Parameters<T>): Promise<ReturnType<T>> {
        const start = performance.now();

        // Store the cache under a subfolder
        const subFolder = (() => {
            const args0 = args[0 as keyof typeof args];
            if (args0 === "") {
                return "empty";
            }
            if (args0 && typeof args0 === 'string') {
                return args0;
            }
            return 'global';
        })();

        // Setup cache paths
        const cacheDir = join(Deno.cwd(), "cache", makeFileNameSafe(subFolder));
        const cacheFilePath = join(cacheDir, `${fn.name}.jsont`);

        // Print start of execution
        const padBit = `${subFolder.padEnd(30)}/${fn.name.padEnd(60)}`;
        const encoder = new TextEncoder();
        Deno.stdout.writeSync(encoder.encode(`${padBit}: `));

        // Try to get cached result
        let result: ReturnType<T> | undefined;
        let didReadFromCache = false;
        let didWriteToCache = false;

        if (cacheRead && fn.name.toLowerCase().endsWith('cache') && fileExistsSync(cacheFilePath)) {
            result = JSON.parse(await Deno.readTextFile(cacheFilePath));
            didReadFromCache = true;
            // Touch the file to update its modified timestamp
            await Deno.utime(cacheFilePath, new Date(), new Date());
        }

        // Execute function if no cached result
        if (result === undefined) {
            try {
                result = await fn.apply(this, args);

                if (cacheWrite) {
                    ensureDirSync(cacheDir);
                    await Deno.writeTextFile(cacheFilePath, JSON.stringify(result, null, 2));
                    didWriteToCache = true;
                }
            } catch (error) {
                console.error(`\nError in ${fn.name}:`, error);
                throw error;
            }
        }

        // Print execution time
        const seconds = Number((performance.now() - start).toFixed(1)) / 1000;
        const executionTime = seconds.toFixed(1) === "0.0" ? "-" : `${seconds.toFixed(1)}s`;
        const cacheStatus = (() => {
            if (!fn.name.toLowerCase().endsWith('cache')) return '';
            if (didReadFromCache) return ' (cached)';
            if (didWriteToCache) return '';
            return '';
        })();
        Deno.stdout.writeSync(encoder.encode(`${executionTime.padEnd(8)} ${cacheStatus}\n`));

        if (result === undefined) {
            throw new Error(`${fn.name} returned undefined`);
        }

        return result;
    } as T;
}
