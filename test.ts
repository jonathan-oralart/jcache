import { jcache, jcacheWriteOnly, config } from "./mod.ts";

config.cacheFileExtension = "json" // default
config.production = false // will disable read or write to the cache
config.cacheFolder = "cache" // default


interface Post {
    userId: number;
    id: number;
    title: string;
    body: string;
}

const response = await jcache({ subfolder: 'api' },
    async function api(arg1: string): Promise<Post> {
        console.log(arg1)
        const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
        return await response.json();
    }
)('arg1')

const response2 = await jcacheWriteOnly(
    async function apiWriteOnly(arg1: string): Promise<any> {
        console.log(arg1)
        const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
        return await response.json();
    }
)('arg2')