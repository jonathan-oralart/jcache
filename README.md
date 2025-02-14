# JCache

Simple function caching for TypeScript.

#### What it does
- Automatically saves function results to disk
- Retrieves cached results on subsequent runs

#### Perfect for caching
- API calls
- Expensive calculations
- Database queries

#### Ideal for development
Speed up your local development by caching external calls. Work offline, iterate faster, and reduce API usage while building your application.


## Simple Example


```ts
import { jcache} from "@jonpdw/jcache";


const response = await jcache(
    // ----------- Your function -----------
    async function api() {
        const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
        return await response.json();
    }
    // ----------- End of function -----------
)()

```

## Output
```
/cache
    /api.json
```

## Complex Example


```ts
import { jcache, jcacheWriteOnly, config } from "@jonpdw/jcache";

config.cacheFileExtension = "json" // (default = "json")
config.production = true           // (default = false) will disable read or write to the cache
config.cacheFolder = "cache"       // (default = "cache")


interface Post {
    userId: number;
    id: number;
    title: string;
    body: string;
}

const response = await jcache({ subfolder: 'api' },
    async function api(postNumber: number): Promise<Post> {
        const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${postNumber}`);
        return await response.json();
    }
)(1)

const response2 = await jcacheWriteOnly({ subfolder: 'apiWriteOnly' },
    async function apiWriteOnly(postNumber: number): Promise<any> {
        const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${postNumber}`);
        return await response.json();
    }
)(2)
```

### Output
```
/cache
    /api
        /api.json
    /apiWriteOnly
        /apiWriteOnly.json
```

### Shell Output
```bash
~/Repos/JSR/jcache deno --allow-all test.ts   
cache/api                     /api                                                         : 0.1s     
cache/                        /apiWriteOnly                                                : 0.1s  
```










