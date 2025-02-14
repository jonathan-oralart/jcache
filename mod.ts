import { ensureDirSync } from "jsr:@std/fs@1";
import { join } from "jsr:@std/path@1";

export const config = {
    production: false,
    cacheFolder: "cache",
    cacheFileExtension: "json"
};

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

interface JCacheOptions {
    subfolder?: string;
}

function jcacheBase<T extends (...args: Parameters<T>) => ReturnType<T>>(
    options: JCacheOptions & { read: boolean; write: boolean },
    fn: T
): T {
    return async function (this: ThisParameterType<T>, ...args: Parameters<T>): Promise<ReturnType<T>> {
        const start = performance.now();

        // Check global production setting first, then local options
        if (config.production) {
            options.read = false;
            options.write = false;
        }

        // Setup cache paths
        const cacheDir = options.subfolder
            ? join(Deno.cwd(), config.cacheFolder, makeFileNameSafe(options.subfolder))
            : join(Deno.cwd(), config.cacheFolder);
        const cacheFilePath = join(cacheDir, `${fn.name}.${config.cacheFileExtension}`);

        const subFolder = `${config.cacheFolder}/${options.subfolder ?? ""}`

        // Print start of execution
        const padBit = `${subFolder.padEnd(30)}/${fn.name.padEnd(60)}`;
        const encoder = new TextEncoder();
        Deno.stdout.writeSync(encoder.encode(`${padBit}: `));

        // Try to get cached result
        let result: ReturnType<T> | undefined;
        let didReadFromCache = false;
        let didWriteToCache = false;

        if (options.read && fileExistsSync(cacheFilePath)) {
            result = JSON.parse(await Deno.readTextFile(cacheFilePath));
            didReadFromCache = true;
            // Touch the file to update its modified timestamp
            await Deno.utime(cacheFilePath, new Date(), new Date());
        }

        // Execute function if no cached result
        if (result === undefined) {
            try {
                result = await fn.apply(this, args);

                if (options.write) {
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

export function jcache<T extends (...args: Parameters<T>) => ReturnType<T>>(
    optionsOrFn: JCacheOptions | T,
    maybeFn?: T
): T {
    const [options, fn] = maybeFn ? [optionsOrFn as JCacheOptions, maybeFn] : [{}, optionsOrFn as T];
    return jcacheBase({ ...options, read: true, write: true }, fn);
}

export function jcacheWriteOnly<T extends (...args: Parameters<T>) => ReturnType<T>>(
    optionsOrFn: JCacheOptions | T,
    maybeFn?: T
): T {
    const [options, fn] = maybeFn ? [optionsOrFn as JCacheOptions, maybeFn] : [{}, optionsOrFn as T];
    return jcacheBase({ ...options, read: false, write: true }, fn);
}

export default jcache;