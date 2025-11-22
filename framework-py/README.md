# DBForge Framework (Python)

A unified database client for Python that provides a consistent API across PostgreSQL, MySQL, MariaDB, MongoDB, and Redis.

## Features

- 🔄 **Unified API** - Same interface for all database types
- 🎯 **Type-safe** - Full type hints support
- 🚀 **Simple** - Minimal boilerplate, maximum productivity
- 🔌 **Flexible** - Direct connections or API token proxy
- 🛠️ **Helper Methods** - Common CRUD operations built-in

## Installation

Install the base package:

```bash
pip install dbforge-framework
```

Install with specific database support:

```bash
# MySQL/MariaDB
pip install dbforge-framework[mysql]

# PostgreSQL
pip install dbforge-framework[postgresql]

# MongoDB
pip install dbforge-framework[mongodb]

# Redis
pip install dbforge-framework[redis]

# All databases
pip install dbforge-framework[all]
```

## Quick Start

### PostgreSQL Example

```python
from dbforge_framework import DbForgeClient

# Option 1: Create client from credentials
client = DbForgeClient.from_credentials(
    db_type="postgresql",
    host="localhost",
    port=5432,
    username="myuser",
    password="mypass",
    database="mydb"
)

# Option 2: Create from connection string
client = DbForgeClient.from_connection_string(
    "postgresql://myuser:mypass@localhost:5432/mydb"
)

# Use context manager for automatic connection handling
with client:
    # Method 1: Direct CRUD methods
    users = client.select("users", where={"age": 25})
    client.insert("users", {"name": "Alice", "age": 25})
    client.update("users", {"age": 26}, {"name": "Alice"})
    client.delete("users", {"name": "Alice"})
    
    # Method 2: Raw SQL query
    users = client.query("SELECT * FROM users WHERE age > %s", (18,))
    
    # Method 3: Using helpers
    users = client.helpers.find_all("users", {"active": True})
    client.helpers.insert("users", {"name": "Alice", "age": 25})
    client.helpers.update("users", {"age": 26}, {"name": "Alice"})
```

### MySQL/MariaDB Example

```python
client = DbForgeClient.from_credentials(
    db_type="mysql",
    host="localhost",
    port=3306,
    username="root",
    password="password",
    database="testdb"
)

with client:
    # Execute queries
    result = client.query("INSERT INTO products (name, price) VALUES (%s, %s)", ("Widget", 19.99))
    
    # Use helpers
    products = client.helpers.find_all("products")
    product = client.helpers.find_one("products", {"id": 1})
```

### MongoDB Example

```python
client = DbForgeClient.from_credentials(
    db_type="mongodb",
    host="localhost",
    port=27017,
    username="admin",
    password="password",
    database="mydb"
)

with client:
    # Get collection
    collection = client.get_collection("users")
    
    # Use helpers
    users = client.helpers.find_all("users", {"age": {"$gt": 18}})
    user_id = client.helpers.insert("users", {"name": "Bob", "email": "bob@example.com"})
    client.helpers.update("users", {"name": "Bob"}, {"$set": {"age": 30}})
```

### Redis Example

```python
client = DbForgeClient.from_credentials(
    db_type="redis",
    host="localhost",
    port=6379,
    password="password",
    database="0"
)

with client:
    # Use helpers
    client.helpers.set("key", "value", ex=3600)
    value = client.helpers.get("key")
    
    # Hash operations
    client.helpers.hset("user:1001", "name", "Charlie")
    user_data = client.helpers.hgetall("user:1001")
    
    # List operations
    client.helpers.lpush("tasks", "task1", "task2")
    tasks = client.helpers.lrange("tasks", 0, -1)
```

## API Token Mode

Instead of direct credentials, you can use DBForge API tokens:

```python
client = DbForgeClient.from_api_token(
    api_token="your-api-token",
    instance_id="db-instance-id"
)
```

## API Methods

### Connection Methods

```python
# From explicit credentials
client = DbForgeClient.from_credentials(
    db_type="postgresql",  # postgresql, mysql, mariadb, mongodb, redis
    host="localhost",
    port=5432,
    username="user",
    password="pass",
    database="db"
)

# From connection string
client = DbForgeClient.from_connection_string(
    "postgresql://user:pass@host:5432/db"
)

# From API token
client = DbForgeClient.from_api_token(
    api_token="token",
    instance_id="instance-id"
)
```

### Direct CRUD Methods

```python
with client:
    # SELECT
    rows = client.select("table", 
                        columns=["id", "name"],  # Optional
                        where={"status": "active"},  # Optional
                        limit=10,  # Optional
                        order_by="created_at DESC")  # Optional
    
    # INSERT
    row_count = client.insert("table", {"name": "Alice", "age": 25})
    
    # UPDATE
    affected = client.update("table", 
                            {"status": "inactive"}, 
                            {"id": 123})
    
    # DELETE
    deleted = client.delete("table", {"id": 123})
```

## Helper Methods

### SQL Databases (MySQL, PostgreSQL)

- `find_all(table, where=None)` - Select rows
- `find_one(table, where)` - Select single row
- `insert(table, data)` - Insert row
- `update(table, data, where)` - Update rows
- `delete(table, where)` - Delete rows

### MongoDB

- `find_all(collection, query=None)` - Find documents
- `find_one(collection, query)` - Find single document
- `insert(collection, document)` - Insert document
- `update(collection, query, update)` - Update documents
- `delete(collection, query)` - Delete documents

### Redis

- `get(key)` / `set(key, value, ex=None)` - String operations
- `hget(name, key)` / `hset(name, key, value)` / `hgetall(name)` - Hash operations
- `lpush(name, *values)` / `rpush(name, *values)` / `lrange(name, start, end)` - List operations
- `delete(*keys)` / `exists(key)` - Key operations

## Connection Options

All database types support additional connection options:

```python
client = DbForgeClient.from_credentials(
    db_type="postgresql",
    host="localhost",
    port=5432,
    username="user",
    password="pass",
    database="db",
    # Extra options
    connect_timeout=10,
    application_name="MyApp"
)
```

## Manual Connection Management

If you don't want to use context managers:

```python
client = DbForgeClient.from_credentials(...)
client.connect()

try:
    result = client.query("SELECT * FROM users")
finally:
    client.disconnect()
```

## Requirements

- Python 3.8+
- Database drivers (installed automatically with extras):
  - MySQL/MariaDB: `pymysql`
  - PostgreSQL: `psycopg2-binary`
  - MongoDB: `pymongo`
  - Redis: `redis`

## Examples

Check out the [examples directory](https://github.com/BRMilev22/DBForge/tree/main/examples-py) for complete working applications:

- FastAPI + PostgreSQL
- Flask + MySQL
- Django + MongoDB  
- Redis + FastAPI

## License

MIT License - see LICENSE file for details.

## Links

- 🏠 Homepage: https://dbforge.dev
- 📚 Documentation: https://dbforge.dev/docs
- 🐙 GitHub: https://github.com/BRMilev22/DBForge
- 📦 PyPI: https://pypi.org/project/dbforge-framework/
