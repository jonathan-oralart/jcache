# JCache

A simple function result caching system.

## Example

```ts
// Example of caching an API response
const response = await jcache(
    async function apiCache(): Promise<any> {
        const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
        return await response.json();
    }
)('api-folder-group');
// ^ cache file will be stored in cache/api-folder-group/apiCache.jsont

// Example of caching a database query
const data = await jcache(
    async function queryCache( sql: Sql): Promise<Result> {
        return await sql`SELECT * FROM table`;
    }
)('sql-folder-group', sql);
//                    ^ these are the arguments passed to the function

```

## Output
```
/cache
    /api-folder-group
        /apiCache.jsont
    /sql-folder-group
        /queryCache.jsont
```

## Environment Variables

- `JCACHE_READ`: Set to "true" to enable reading from cache
- `JCACHE_WRITE`: Set to "true" to enable writing to cache



