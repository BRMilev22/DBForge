"""
DBForge Client - Main client class for database operations
"""

import requests
from typing import Any, Dict, List, Optional, Union
from .helpers import MySQLHelpers, PostgreSQLHelpers, MongoDBHelpers, RedisHelpers


class DbForgeClient:
    """
    Unified database client that works with PostgreSQL, MySQL, MariaDB, MongoDB, and Redis.
    
    Supports two modes:
    - 'api': Routes through DBForge API (token-based)
    - 'direct': Direct connection to database
    """
    
    def __init__(
        self,
        mode: str = "direct",
        db_type: Optional[str] = None,
        host: Optional[str] = None,
        port: Optional[int] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        database: Optional[str] = None,
        api_token: Optional[str] = None,
        api_url: Optional[str] = "https://dbforge.dev/api",
        **kwargs
    ):
        """
        Initialize DBForge client.
        
        Args:
            mode: 'api' or 'direct'
            db_type: Database type ('postgresql', 'mysql', 'mariadb', 'mongodb', 'redis')
            host: Database host
            port: Database port
            username: Database username
            password: Database password
            database: Database name
            api_token: API token (for API mode)
            api_url: DBForge API URL
            **kwargs: Additional database-specific options
        """
        self.mode = mode
        self.db_type = db_type
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.database = database
        self.api_token = api_token
        self.api_url = api_url
        self.connection = None
        self.connected = False
        self.extra_options = kwargs
        
        # Initialize helpers
        self._helpers = None
    
    @classmethod
    def from_credentials(
        cls,
        db_type: str,
        host: str,
        port: int,
        username: str,
        password: str,
        database: str,
        **kwargs
    ):
        """
        Create a client with direct database credentials.
        
        Args:
            db_type: 'postgresql', 'mysql', 'mariadb', 'mongodb', or 'redis'
            host: Database host
            port: Database port
            username: Database username
            password: Database password
            database: Database name
            **kwargs: Additional options
        """
        return cls(
            mode="direct",
            db_type=db_type,
            host=host,
            port=port,
            username=username,
            password=password,
            database=database,
            **kwargs
        )
    
    @classmethod
    def from_connection_string(cls, connection_string: str, **overrides):
        """
        Create a client from a connection string.
        
        Args:
            connection_string: Database connection URI
                Examples:
                - postgresql://user:pass@host:5432/db
                - mysql://user:pass@host:3306/db
                - mongodb://user:pass@host:27017/db
                - redis://user:pass@host:6379/0
            **overrides: Override parsed values
            
        Returns:
            DbForgeClient instance
        """
        if not connection_string:
            raise ValueError("connection_string is required")
        
        # Parse the connection string
        from urllib.parse import urlparse, unquote
        
        parsed = urlparse(connection_string)
        protocol = parsed.scheme.lower()
        
        # Map protocol to db_type
        db_type_map = {
            'postgresql': 'postgresql',
            'postgres': 'postgresql',
            'mysql': 'mysql',
            'mariadb': 'mariadb',
            'mongodb': 'mongodb',
            'mongo': 'mongodb',
            'redis': 'redis'
        }
        
        if protocol not in db_type_map:
            raise ValueError(f"Unsupported database type: {protocol}")
        
        db_type = db_type_map[protocol]
        
        # Default ports
        default_ports = {
            'postgresql': 5432,
            'mysql': 3306,
            'mariadb': 3306,
            'mongodb': 27017,
            'redis': 6379
        }
        
        port = parsed.port or default_ports.get(db_type, 3306)
        database = parsed.path.lstrip('/') if parsed.path else ''
        
        # For Redis, the database is the path number
        if db_type == 'redis' and database:
            database = database.split('/')[0]  # Take first segment
        
        return cls(
            mode="direct",
            db_type=db_type,
            host=parsed.hostname or 'localhost',
            port=port,
            username=unquote(parsed.username) if parsed.username else '',
            password=unquote(parsed.password) if parsed.password else '',
            database=database,
            **overrides
        )
    
    @classmethod
    def from_api_token(cls, api_token: str, instance_id: str, api_url: str = "https://dbforge.dev/api"):
        """
        Create a client using DBForge API token.
        
        Args:
            api_token: Your DBForge API token
            instance_id: Database instance ID
            api_url: DBForge API URL
        """
        return cls(
            mode="api",
            api_token=api_token,
            api_url=api_url,
            instance_id=instance_id
        )
    
    def connect(self):
        """Establish database connection."""
        if self.connected:
            return
        
        if self.mode == "api":
            self._connect_api()
        else:
            self._connect_direct()
        
        self.connected = True
    
    def _connect_direct(self):
        """Connect directly to database."""
        if self.db_type in ["mysql", "mariadb"]:
            import pymysql
            self.connection = pymysql.connect(
                host=self.host,
                port=self.port,
                user=self.username,
                password=self.password,
                database=self.database,
                cursorclass=pymysql.cursors.DictCursor,
                **self.extra_options
            )
            self._helpers = MySQLHelpers(self)
            
        elif self.db_type == "postgresql":
            import psycopg2
            import psycopg2.extras
            self.connection = psycopg2.connect(
                host=self.host,
                port=self.port,
                user=self.username,
                password=self.password,
                dbname=self.database,
                **self.extra_options
            )
            self._helpers = PostgreSQLHelpers(self)
            
        elif self.db_type == "mongodb":
            from pymongo import MongoClient
            if self.username and self.password:
                # Include authSource for authentication
                auth_source = self.extra_options.pop("authSource", self.database)
                uri = f"mongodb://{self.username}:{self.password}@{self.host}:{self.port}/{self.database}?authSource={auth_source}"
            else:
                uri = f"mongodb://{self.host}:{self.port}/{self.database}"
            
            self.connection = MongoClient(uri, **self.extra_options)
            self._db = self.connection[self.database]
            self._helpers = MongoDBHelpers(self)
            
        elif self.db_type == "redis":
            import redis
            # Build connection params
            conn_params = {
                "host": self.host,
                "port": self.port,
                "password": self.password,
                "db": int(self.database) if self.database else 0,
                "decode_responses": True,
                **self.extra_options
            }
            # Only add username if provided (Redis 6.0+ feature)
            if self.username:
                conn_params["username"] = self.username
            
            self.connection = redis.Redis(**conn_params)
            self._helpers = RedisHelpers(self)
            
        else:
            raise ValueError(f"Unsupported database type: {self.db_type}")
    
    def _connect_api(self):
        """Connect via DBForge API."""
        # Placeholder for API mode implementation
        raise NotImplementedError("API mode will be implemented in a future release")
    
    def disconnect(self):
        """Close database connection."""
        if not self.connected:
            return
        
        if self.connection:
            if self.db_type in ["mysql", "mariadb", "postgresql"]:
                self.connection.close()
            elif self.db_type == "mongodb":
                self.connection.close()
            elif self.db_type == "redis":
                self.connection.close()
        
        self.connected = False
        self.connection = None
    
    def query(self, sql: Union[str, List], params: Optional[Union[tuple, dict]] = None) -> Any:
        """
        Execute a database query.
        
        Args:
            sql: SQL query string (for SQL DBs) or command list (for Redis)
            params: Query parameters
            
        Returns:
            Query results
        """
        if not self.connected:
            self.connect()
        
        if self.db_type in ["mysql", "mariadb", "postgresql"]:
            return self._query_sql(sql, params)
        elif self.db_type == "mongodb":
            raise ValueError("Use MongoDB-specific methods for queries (find, insert_one, etc.)")
        elif self.db_type == "redis":
            return self._query_redis(sql)
        
        raise ValueError(f"Query not supported for {self.db_type}")
    
    def _query_sql(self, sql: str, params: Optional[Union[tuple, dict]] = None):
        """Execute SQL query."""
        with self.connection.cursor() as cursor:
            cursor.execute(sql, params)
            
            # Check if this is a SELECT query
            if sql.strip().upper().startswith("SELECT"):
                if self.db_type == "postgresql":
                    import psycopg2.extras
                    cursor = self.connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
                    cursor.execute(sql, params)
                return cursor.fetchall()
            else:
                self.connection.commit()
                return cursor.rowcount
    
    def _query_redis(self, command: List):
        """Execute Redis command."""
        return self.connection.execute_command(*command)
    
    # MongoDB methods
    def get_collection(self, name: str):
        """Get MongoDB collection."""
        if self.db_type != "mongodb":
            raise ValueError("get_collection() only works with MongoDB")
        return self._db[name]
    
    # Helper properties
    @property
    def helpers(self):
        """Get database-specific helper methods."""
        if not self._helpers:
            if not self.connected:
                self.connect()
        return self._helpers
    
    # Direct CRUD methods (matching JS/TS API)
    def select(self, table: str, columns: List[str] = None, where: Dict = None, limit: int = None, order_by: str = None) -> Any:
        """
        Select rows from a table.
        
        Args:
            table: Table name (or collection for MongoDB, key for Redis)
            columns: List of columns to select (SQL only)
            where: WHERE conditions as dict
            limit: Maximum number of rows
            order_by: ORDER BY clause (SQL only)
            
        Returns:
            Query results
        """
        if not self.connected:
            self.connect()
        
        if self.db_type == "mongodb":
            # For MongoDB, use helpers
            return self.helpers.find_all(table, where)
        elif self.db_type == "redis":
            # For Redis, treat table as key
            return self.helpers.get(table)
        else:
            # SQL databases
            cols = ", ".join(columns) if columns else "*"
            sql = f"SELECT {cols} FROM {table}"
            
            if where:
                conditions = " AND ".join([f"{k} = %s" for k in where.keys()])
                sql += f" WHERE {conditions}"
            
            if order_by:
                sql += f" ORDER BY {order_by}"
            
            if limit:
                sql += f" LIMIT {limit}"
            
            params = tuple(where.values()) if where else None
            return self.query(sql, params)
    
    def insert(self, table: str, data: Dict) -> Any:
        """
        Insert a row/document.
        
        Args:
            table: Table name (or collection for MongoDB)
            data: Data to insert
            
        Returns:
            Result (row count for SQL, document ID for MongoDB, status for Redis)
        """
        if not self.connected:
            self.connect()
        
        if self.db_type == "mongodb":
            return self.helpers.insert(table, data)
        elif self.db_type == "redis":
            # For Redis, if data is dict, use HSET, otherwise SET
            if isinstance(data, dict) and len(data) > 1:
                # Multiple fields - use hash
                for key, value in data.items():
                    self.helpers.hset(table, key, str(value))
                return True
            elif isinstance(data, dict):
                # Single field
                key, value = list(data.items())[0]
                return self.helpers.set(f"{table}:{key}", str(value))
            else:
                return self.helpers.set(table, str(data))
        else:
            # SQL databases
            return self.helpers.insert(table, data)
    
    def update(self, table: str, data: Dict, where: Dict) -> Any:
        """
        Update rows/documents.
        
        Args:
            table: Table name (or collection for MongoDB)
            data: Data to update
            where: WHERE conditions
            
        Returns:
            Number of affected rows/documents
        """
        if not self.connected:
            self.connect()
        
        if self.db_type == "mongodb":
            # MongoDB expects $set operator
            if not any(k.startswith('$') for k in data.keys()):
                data = {"$set": data}
            return self.helpers.update(table, where, data)
        elif self.db_type == "redis":
            # For Redis, update is same as insert
            return self.insert(table, data)
        else:
            # SQL databases
            return self.helpers.update(table, data, where)
    
    def delete(self, table: str, where: Dict = None) -> Any:
        """
        Delete rows/documents.
        
        Args:
            table: Table name (or collection for MongoDB, key for Redis)
            where: WHERE conditions (not used for Redis)
            
        Returns:
            Number of affected rows/documents
        """
        if not self.connected:
            self.connect()
        
        if self.db_type == "mongodb":
            return self.helpers.delete(table, where or {})
        elif self.db_type == "redis":
            # For Redis, delete the key
            return self.helpers.delete(table)
        else:
            # SQL databases - require WHERE clause
            if not where:
                raise ValueError("Delete requires a WHERE clause to avoid accidental data loss")
            return self.helpers.delete(table, where)
    
    # Context manager support
    def __enter__(self):
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()
