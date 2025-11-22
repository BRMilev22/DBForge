"""
Database-specific helper methods for common CRUD operations
"""

from typing import Any, Dict, List, Optional, Union


class MySQLHelpers:
    """Helper methods for MySQL/MariaDB."""
    
    def __init__(self, client):
        self.client = client
    
    def find_all(self, table: str, where: Optional[Dict] = None) -> List[Dict]:
        """
        Select all rows from a table.
        
        Args:
            table: Table name
            where: Optional WHERE conditions as dict
            
        Returns:
            List of rows as dictionaries
        """
        sql = f"SELECT * FROM {table}"
        params = None
        
        if where:
            conditions = " AND ".join([f"{k} = %s" for k in where.keys()])
            sql += f" WHERE {conditions}"
            params = tuple(where.values())
        
        return self.client.query(sql, params)
    
    def find_one(self, table: str, where: Dict) -> Optional[Dict]:
        """Find a single row."""
        results = self.find_all(table, where)
        return results[0] if results else None
    
    def insert(self, table: str, data: Dict) -> int:
        """
        Insert a row.
        
        Args:
            table: Table name
            data: Row data as dictionary
            
        Returns:
            Number of affected rows
        """
        columns = ", ".join(data.keys())
        placeholders = ", ".join(["%s"] * len(data))
        sql = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
        
        return self.client.query(sql, tuple(data.values()))
    
    def update(self, table: str, data: Dict, where: Dict) -> int:
        """
        Update rows.
        
        Args:
            table: Table name
            data: Data to update
            where: WHERE conditions
            
        Returns:
            Number of affected rows
        """
        set_clause = ", ".join([f"{k} = %s" for k in data.keys()])
        where_clause = " AND ".join([f"{k} = %s" for k in where.keys()])
        sql = f"UPDATE {table} SET {set_clause} WHERE {where_clause}"
        
        params = tuple(list(data.values()) + list(where.values()))
        return self.client.query(sql, params)
    
    def delete(self, table: str, where: Dict) -> int:
        """
        Delete rows.
        
        Args:
            table: Table name
            where: WHERE conditions
            
        Returns:
            Number of affected rows
        """
        where_clause = " AND ".join([f"{k} = %s" for k in where.keys()])
        sql = f"DELETE FROM {table} WHERE {where_clause}"
        
        return self.client.query(sql, tuple(where.values()))


class PostgreSQLHelpers:
    """Helper methods for PostgreSQL."""
    
    def __init__(self, client):
        self.client = client
    
    def find_all(self, table: str, where: Optional[Dict] = None) -> List[Dict]:
        """Select all rows from a table."""
        sql = f"SELECT * FROM {table}"
        params = None
        
        if where:
            conditions = " AND ".join([f"{k} = %s" for k in where.keys()])
            sql += f" WHERE {conditions}"
            params = tuple(where.values())
        
        return self.client.query(sql, params)
    
    def find_one(self, table: str, where: Dict) -> Optional[Dict]:
        """Find a single row."""
        results = self.find_all(table, where)
        return results[0] if results else None
    
    def insert(self, table: str, data: Dict) -> int:
        """Insert a row."""
        columns = ", ".join(data.keys())
        placeholders = ", ".join(["%s"] * len(data))
        sql = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
        
        return self.client.query(sql, tuple(data.values()))
    
    def update(self, table: str, data: Dict, where: Dict) -> int:
        """Update rows."""
        set_clause = ", ".join([f"{k} = %s" for k in data.keys()])
        where_clause = " AND ".join([f"{k} = %s" for k in where.keys()])
        sql = f"UPDATE {table} SET {set_clause} WHERE {where_clause}"
        
        params = tuple(list(data.values()) + list(where.values()))
        return self.client.query(sql, params)
    
    def delete(self, table: str, where: Dict) -> int:
        """Delete rows."""
        where_clause = " AND ".join([f"{k} = %s" for k in where.keys()])
        sql = f"DELETE FROM {table} WHERE {where_clause}"
        
        return self.client.query(sql, tuple(where.values()))


class MongoDBHelpers:
    """Helper methods for MongoDB."""
    
    def __init__(self, client):
        self.client = client
    
    def find_all(self, collection: str, query: Optional[Dict] = None) -> List[Dict]:
        """
        Find all documents in a collection.
        
        Args:
            collection: Collection name
            query: Query filter
            
        Returns:
            List of documents
        """
        coll = self.client.get_collection(collection)
        return list(coll.find(query or {}))
    
    def find_one(self, collection: str, query: Dict) -> Optional[Dict]:
        """Find a single document."""
        coll = self.client.get_collection(collection)
        return coll.find_one(query)
    
    def insert(self, collection: str, document: Dict) -> str:
        """
        Insert a document.
        
        Args:
            collection: Collection name
            document: Document to insert
            
        Returns:
            Inserted document ID
        """
        coll = self.client.get_collection(collection)
        result = coll.insert_one(document)
        return str(result.inserted_id)
    
    def update(self, collection: str, query: Dict, update: Dict, upsert: bool = False) -> int:
        """
        Update documents.
        
        Args:
            collection: Collection name
            query: Query filter
            update: Update operations (use $set, $inc, etc.)
            upsert: Whether to insert if not found
            
        Returns:
            Number of modified documents
        """
        coll = self.client.get_collection(collection)
        result = coll.update_many(query, update, upsert=upsert)
        return result.modified_count
    
    def delete(self, collection: str, query: Dict) -> int:
        """
        Delete documents.
        
        Args:
            collection: Collection name
            query: Query filter
            
        Returns:
            Number of deleted documents
        """
        coll = self.client.get_collection(collection)
        result = coll.delete_many(query)
        return result.deleted_count


class RedisHelpers:
    """Helper methods for Redis."""
    
    def __init__(self, client):
        self.client = client
    
    def get(self, key: str) -> Optional[str]:
        """Get a value by key."""
        return self.client.connection.get(key)
    
    def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        """
        Set a value.
        
        Args:
            key: Key name
            value: Value to set
            ex: Expiration in seconds
            
        Returns:
            True if successful
        """
        return self.client.connection.set(key, value, ex=ex)
    
    def delete(self, *keys: str) -> int:
        """
        Delete keys.
        
        Args:
            keys: Keys to delete
            
        Returns:
            Number of deleted keys
        """
        return self.client.connection.delete(*keys)
    
    def exists(self, key: str) -> bool:
        """Check if key exists."""
        return self.client.connection.exists(key) > 0
    
    def hget(self, name: str, key: str) -> Optional[str]:
        """Get hash field value."""
        return self.client.connection.hget(name, key)
    
    def hset(self, name: str, key: str, value: str) -> int:
        """Set hash field value."""
        return self.client.connection.hset(name, key, value)
    
    def hgetall(self, name: str) -> Dict[str, str]:
        """Get all hash fields and values."""
        return self.client.connection.hgetall(name)
    
    def lpush(self, name: str, *values: str) -> int:
        """Push values to list head."""
        return self.client.connection.lpush(name, *values)
    
    def rpush(self, name: str, *values: str) -> int:
        """Push values to list tail."""
        return self.client.connection.rpush(name, *values)
    
    def lrange(self, name: str, start: int, end: int) -> List[str]:
        """Get list range."""
        return self.client.connection.lrange(name, start, end)
