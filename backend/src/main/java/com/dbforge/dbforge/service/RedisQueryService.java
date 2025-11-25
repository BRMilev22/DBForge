package com.dbforge.dbforge.service;

import com.dbforge.dbforge.dto.QueryRequest;
import com.dbforge.dbforge.dto.QueryResult;
import com.dbforge.dbforge.model.DatabaseInstance;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisPoolConfig;

import java.util.*;

@Service
@Slf4j
public class RedisQueryService {
    
    private final AuditLogService auditLogService;
    
    public RedisQueryService(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    public QueryResult executeRedisCommand(DatabaseInstance instance, QueryRequest request) {
        Long userId = instance.getUserId();
        long startTime = System.currentTimeMillis();
        
        JedisPoolConfig poolConfig = new JedisPoolConfig();
        poolConfig.setMaxTotal(10);
        
        // Use localhost since backend runs on same server as Docker containers
        String host = "localhost";
        
        try (JedisPool pool = new JedisPool(poolConfig, host, instance.getPort(), 2000, instance.getPassword());
             Jedis jedis = pool.getResource()) {
            
            // Parse the query - remove comments and extract valid commands
            String query = request.getQuery().trim();
            
            // Split by newlines and filter out comments
            String[] lines = query.split("\\n");
            List<String> commands = new ArrayList<>();
            for (String line : lines) {
                String trimmedLine = line.trim();
                // Skip empty lines and comment lines
                if (!trimmedLine.isEmpty() && !trimmedLine.startsWith("#")) {
                    commands.add(trimmedLine);
                }
            }
            
            if (commands.isEmpty()) {
                return QueryResult.builder()
                    .success(false)
                    .error("No valid Redis command found (only comments)")
                    .executionTimeMs(System.currentTimeMillis() - startTime)
                    .build();
            }
            
            // Execute commands
            QueryResult result;
            if (commands.size() > 1) {
                int successCount = 0;
                int errorCount = 0;
                String lastError = null;
                
                for (String cmd : commands) {
                    try {
                        QueryResult cmdResult = executeSingleCommand(jedis, cmd, startTime);
                        if (cmdResult.getSuccess() != null && cmdResult.getSuccess()) {
                            successCount++;
                        } else {
                            errorCount++;
                            lastError = cmdResult.getError();
                        }
                    } catch (Exception e) {
                        errorCount++;
                        lastError = e.getMessage();
                    }
                }
                
                if (errorCount > 0) {
                    auditLogService.logFailure(userId, "QUERY_EXECUTED", "DATABASE", instance.getId(),
                            instance.getInstanceName(), "Redis: " + errorCount + " commands failed");
                    return QueryResult.builder()
                        .success(false)
                        .error(String.format("Executed %d commands: %d succeeded, %d failed. Last error: %s", 
                            commands.size(), successCount, errorCount, lastError))
                        .executionTimeMs(System.currentTimeMillis() - startTime)
                        .build();
                } else {
                    String details = String.format("Redis: %d commands executed successfully", successCount);
                    auditLogService.logSuccess(userId, "QUERY_EXECUTED", "DATABASE", instance.getId(),
                            instance.getInstanceName(), details);
                }
                
                return QueryResult.builder()
                    .success(true)
                    .queryType("SET")
                    .message(String.format("Successfully executed %d commands", successCount))
                    .executionTimeMs(System.currentTimeMillis() - startTime)
                    .build();
            }
            
            // Single command
            result = executeSingleCommand(jedis, commands.get(0), startTime);
            
            // Log single command execution
            if (result.getSuccess() != null && result.getSuccess()) {
                String cmdPreview = commands.get(0).length() > 100 ? commands.get(0).substring(0, 100) + "..." : commands.get(0);
                String details = String.format("Redis: %s, Execution time: %dms", cmdPreview, result.getExecutionTimeMs());
                auditLogService.logSuccess(userId, "QUERY_EXECUTED", "DATABASE", instance.getId(),
                        instance.getInstanceName(), details);
            }
            
            return result;
            
        } catch (Exception e) {
            log.error("Redis command execution error: {}", e.getMessage());
            long executionTime = System.currentTimeMillis() - startTime;
            
            auditLogService.logFailure(userId, "QUERY_EXECUTED", "DATABASE", instance.getId(),
                    instance.getInstanceName(), "Redis command failed: " + e.getMessage());
            
            return QueryResult.builder()
                .success(false)
                .error(e.getMessage())
                .executionTimeMs(executionTime)
                .build();
        }
    }
    
    private String[] parseCommand(String command) {
        List<String> parts = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        
        log.debug("Parsing command: [{}]", command);
        
        for (int i = 0; i < command.length(); i++) {
            char c = command.charAt(i);
            
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (Character.isWhitespace(c) && !inQuotes) {
                if (current.length() > 0) {
                    parts.add(current.toString());
                    current = new StringBuilder();
                }
            } else {
                current.append(c);
            }
        }
        
        if (current.length() > 0) {
            parts.add(current.toString());
        }
        
        log.debug("Parsed into {} parts: {}", parts.size(), parts);
        
        return parts.toArray(new String[0]);
    }
    
    private QueryResult executeSingleCommand(Jedis jedis, String command, long startTime) {
        String[] parts = parseCommand(command);
            
            if (parts.length == 0) {
                return QueryResult.builder()
                    .success(false)
                    .error("Empty command")
                    .build();
            }
            
            String cmd = parts[0].toUpperCase();
            
            return switch (cmd) {
                case "GET" -> handleGet(jedis, parts, startTime);
                case "SET" -> handleSet(jedis, parts, startTime);
                case "DEL", "DELETE" -> handleDel(jedis, parts, startTime);
                case "EXISTS" -> handleExists(jedis, parts, startTime);
                case "KEYS" -> handleKeys(jedis, parts, startTime);
                case "TYPE" -> handleType(jedis, parts, startTime);
                case "TTL" -> handleTtl(jedis, parts, startTime);
                case "EXPIRE" -> handleExpire(jedis, parts, startTime);
                case "LPUSH" -> handleLpush(jedis, parts, startTime);
                case "RPUSH" -> handleRpush(jedis, parts, startTime);
                case "LPOP" -> handleLpop(jedis, parts, startTime);
                case "RPOP" -> handleRpop(jedis, parts, startTime);
                case "LRANGE" -> handleLrange(jedis, parts, startTime);
                case "SADD" -> handleSadd(jedis, parts, startTime);
                case "SMEMBERS" -> handleSmembers(jedis, parts, startTime);
                case "HSET" -> handleHset(jedis, parts, startTime);
                case "HGET" -> handleHget(jedis, parts, startTime);
                case "HGETALL" -> handleHgetall(jedis, parts, startTime);
                case "INCR" -> handleIncr(jedis, parts, startTime);
                case "DECR" -> handleDecr(jedis, parts, startTime);
                case "DBSIZE" -> handleDbsize(jedis, startTime);
                case "FLUSHDB" -> handleFlushdb(jedis, startTime);
                case "INFO" -> handleInfo(jedis, startTime);
                default -> QueryResult.builder()
                    .success(false)
                    .error("Unsupported Redis command: " + cmd)
                    .executionTimeMs(System.currentTimeMillis() - startTime)
                    .build();
            };
    }

    private QueryResult handleGet(Jedis jedis, String[] parts, long startTime) {
        if (parts.length < 2) {
            return buildError("GET requires a key", startTime);
        }
        
        String value = jedis.get(parts[1]);
        
        return QueryResult.builder()
            .success(true)
            .queryType("GET")
            .columns(List.of("key", "value"))
            .rows(List.of(Map.of("key", parts[1], "value", value != null ? value : "(nil)")))
            .rowCount(1)
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    private QueryResult handleSet(Jedis jedis, String[] parts, long startTime) {
        if (parts.length < 3) {
            return buildError("SET requires key and value", startTime);
        }
        
        // Join all parts after the key as the value (in case it wasn't quoted)
        String value = parts.length > 3 
            ? String.join(" ", Arrays.copyOfRange(parts, 2, parts.length))
            : parts[2];
        
        String result = jedis.set(parts[1], value);
        
        return QueryResult.builder()
            .success(true)
            .queryType("SET")
            .message(result)
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    private QueryResult handleDel(Jedis jedis, String[] parts, long startTime) {
        if (parts.length < 2) {
            return buildError("DEL requires at least one key", startTime);
        }
        
        String[] keys = Arrays.copyOfRange(parts, 1, parts.length);
        Long deleted = jedis.del(keys);
        
        return QueryResult.builder()
            .success(true)
            .queryType("DELETE")
            .affectedRows(deleted.intValue())
            .message(deleted + " key(s) deleted")
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    private QueryResult handleExists(Jedis jedis, String[] parts, long startTime) {
        if (parts.length < 2) {
            return buildError("EXISTS requires a key", startTime);
        }
        
        boolean exists = jedis.exists(parts[1]);
        
        return QueryResult.builder()
            .success(true)
            .queryType("EXISTS")
            .columns(List.of("key", "exists"))
            .rows(List.of(Map.of("key", parts[1], "exists", exists ? "1" : "0")))
            .rowCount(1)
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    private QueryResult handleKeys(Jedis jedis, String[] parts, long startTime) {
        String pattern = parts.length > 1 ? parts[1] : "*";
        Set<String> keys = jedis.keys(pattern);
        
        List<Map<String, Object>> rows = new ArrayList<>();
        for (String key : keys) {
            String type = jedis.type(key);
            Long ttl = jedis.ttl(key);
            
            // Get value based on type
            String value;
            switch (type) {
                case "string":
                    value = jedis.get(key);
                    break;
                case "list":
                    value = jedis.lrange(key, 0, -1).toString();
                    break;
                case "set":
                    value = jedis.smembers(key).toString();
                    break;
                case "hash":
                    value = jedis.hgetAll(key).toString();
                    break;
                case "zset":
                    value = jedis.zrange(key, 0, -1).toString();
                    break;
                default:
                    value = "(unknown type)";
            }
            
            rows.add(Map.of(
                "key", key,
                "type", type,
                "value", value != null ? value : "(nil)",
                "ttl", ttl == -1 ? "no expiry" : ttl + "s"
            ));
        }
        
        return QueryResult.builder()
            .success(true)
            .queryType("KEYS")
            .columns(List.of("key", "type", "value", "ttl"))
            .rows(rows)
            .rowCount(rows.size())
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    private QueryResult handleType(Jedis jedis, String[] parts, long startTime) {
        if (parts.length < 2) {
            return buildError("TYPE requires a key", startTime);
        }
        
        String type = jedis.type(parts[1]);
        
        return QueryResult.builder()
            .success(true)
            .queryType("TYPE")
            .columns(List.of("key", "type"))
            .rows(List.of(Map.of("key", parts[1], "type", type)))
            .rowCount(1)
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    private QueryResult handleTtl(Jedis jedis, String[] parts, long startTime) {
        if (parts.length < 2) {
            return buildError("TTL requires a key", startTime);
        }
        
        Long ttl = jedis.ttl(parts[1]);
        String ttlStr = ttl == -1 ? "no expiry" : ttl == -2 ? "key does not exist" : ttl + " seconds";
        
        return QueryResult.builder()
            .success(true)
            .queryType("TTL")
            .columns(List.of("key", "ttl"))
            .rows(List.of(Map.of("key", parts[1], "ttl", ttlStr)))
            .rowCount(1)
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    private QueryResult handleExpire(Jedis jedis, String[] parts, long startTime) {
        if (parts.length < 3) {
            return buildError("EXPIRE requires key and seconds", startTime);
        }
        
        Long result = jedis.expire(parts[1], Long.parseLong(parts[2]));
        
        return QueryResult.builder()
            .success(true)
            .queryType("EXPIRE")
            .message(result == 1 ? "Expiry set" : "Key does not exist")
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    private QueryResult handleLpush(Jedis jedis, String[] parts, long startTime) {
        if (parts.length < 3) {
            return buildError("LPUSH requires key and value(s)", startTime);
        }
        
        String[] values = Arrays.copyOfRange(parts, 2, parts.length);
        Long result = jedis.lpush(parts[1], values);
        
        return QueryResult.builder()
            .success(true)
            .queryType("LPUSH")
            .message("List length: " + result)
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    private QueryResult handleRpush(Jedis jedis, String[] parts, long startTime) {
        if (parts.length < 3) {
            return buildError("RPUSH requires key and value(s)", startTime);
        }
        
        String[] values = Arrays.copyOfRange(parts, 2, parts.length);
        Long result = jedis.rpush(parts[1], values);
        
        return QueryResult.builder()
            .success(true)
            .queryType("RPUSH")
            .message("List length: " + result)
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    private QueryResult handleLpop(Jedis jedis, String[] parts, long startTime) {
        if (parts.length < 2) {
            return buildError("LPOP requires a key", startTime);
        }
        
        String value = jedis.lpop(parts[1]);
        
        return QueryResult.builder()
            .success(true)
            .queryType("LPOP")
            .columns(List.of("value"))
            .rows(List.of(Map.of("value", value != null ? value : "(nil)")))
            .rowCount(1)
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    private QueryResult handleRpop(Jedis jedis, String[] parts, long startTime) {
        if (parts.length < 2) {
            return buildError("RPOP requires a key", startTime);
        }
        
        String value = jedis.rpop(parts[1]);
        
        return QueryResult.builder()
            .success(true)
            .queryType("RPOP")
            .columns(List.of("value"))
            .rows(List.of(Map.of("value", value != null ? value : "(nil)")))
            .rowCount(1)
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    private QueryResult handleLrange(Jedis jedis, String[] parts, long startTime) {
        if (parts.length < 4) {
            return buildError("LRANGE requires key, start, and stop", startTime);
        }
        
        List<String> values = jedis.lrange(parts[1], Long.parseLong(parts[2]), Long.parseLong(parts[3]));
        
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = 0; i < values.size(); i++) {
            rows.add(Map.of("index", i, "value", values.get(i)));
        }
        
        return QueryResult.builder()
            .success(true)
            .queryType("LRANGE")
            .columns(List.of("index", "value"))
            .rows(rows)
            .rowCount(rows.size())
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    private QueryResult handleSadd(Jedis jedis, String[] parts, long startTime) {
        if (parts.length < 3) {
            return buildError("SADD requires key and member(s)", startTime);
        }
        
        String[] members = Arrays.copyOfRange(parts, 2, parts.length);
        Long result = jedis.sadd(parts[1], members);
        
        return QueryResult.builder()
            .success(true)
            .queryType("SADD")
            .message(result + " member(s) added")
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    private QueryResult handleSmembers(Jedis jedis, String[] parts, long startTime) {
        if (parts.length < 2) {
            return buildError("SMEMBERS requires a key", startTime);
        }
        
        Set<String> members = jedis.smembers(parts[1]);
        
        List<Map<String, Object>> rows = new ArrayList<>();
        for (String member : members) {
            rows.add(Map.of("member", member));
        }
        
        return QueryResult.builder()
            .success(true)
            .queryType("SMEMBERS")
            .columns(List.of("member"))
            .rows(rows)
            .rowCount(rows.size())
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    private QueryResult handleHset(Jedis jedis, String[] parts, long startTime) {
        if (parts.length < 4) {
            return buildError("HSET requires key, field, and value", startTime);
        }
        
        Long result = jedis.hset(parts[1], parts[2], parts[3]);
        
        return QueryResult.builder()
            .success(true)
            .queryType("HSET")
            .message(result == 1 ? "Field created" : "Field updated")
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    private QueryResult handleHget(Jedis jedis, String[] parts, long startTime) {
        if (parts.length < 3) {
            return buildError("HGET requires key and field", startTime);
        }
        
        String value = jedis.hget(parts[1], parts[2]);
        
        return QueryResult.builder()
            .success(true)
            .queryType("HGET")
            .columns(List.of("field", "value"))
            .rows(List.of(Map.of("field", parts[2], "value", value != null ? value : "(nil)")))
            .rowCount(1)
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    private QueryResult handleHgetall(Jedis jedis, String[] parts, long startTime) {
        if (parts.length < 2) {
            return buildError("HGETALL requires a key", startTime);
        }
        
        Map<String, String> hash = jedis.hgetAll(parts[1]);
        
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Map.Entry<String, String> entry : hash.entrySet()) {
            rows.add(Map.of("field", entry.getKey(), "value", entry.getValue()));
        }
        
        return QueryResult.builder()
            .success(true)
            .queryType("HGETALL")
            .columns(List.of("field", "value"))
            .rows(rows)
            .rowCount(rows.size())
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    private QueryResult handleIncr(Jedis jedis, String[] parts, long startTime) {
        if (parts.length < 2) {
            return buildError("INCR requires a key", startTime);
        }
        
        Long result = jedis.incr(parts[1]);
        
        return QueryResult.builder()
            .success(true)
            .queryType("INCR")
            .columns(List.of("key", "value"))
            .rows(List.of(Map.of("key", parts[1], "value", result.toString())))
            .rowCount(1)
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    private QueryResult handleDecr(Jedis jedis, String[] parts, long startTime) {
        if (parts.length < 2) {
            return buildError("DECR requires a key", startTime);
        }
        
        Long result = jedis.decr(parts[1]);
        
        return QueryResult.builder()
            .success(true)
            .queryType("DECR")
            .columns(List.of("key", "value"))
            .rows(List.of(Map.of("key", parts[1], "value", result.toString())))
            .rowCount(1)
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    private QueryResult handleDbsize(Jedis jedis, long startTime) {
        Long size = jedis.dbSize();
        
        return QueryResult.builder()
            .success(true)
            .queryType("DBSIZE")
            .columns(List.of("keys"))
            .rows(List.of(Map.of("keys", size.toString())))
            .rowCount(1)
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    private QueryResult handleFlushdb(Jedis jedis, long startTime) {
        String result = jedis.flushDB();
        
        return QueryResult.builder()
            .success(true)
            .queryType("FLUSHDB")
            .message(result)
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    private QueryResult handleInfo(Jedis jedis, long startTime) {
        String info = jedis.info();
        String[] lines = info.split("\n");
        
        List<Map<String, Object>> rows = new ArrayList<>();
        for (String line : lines) {
            if (!line.trim().isEmpty() && !line.startsWith("#")) {
                String[] parts = line.split(":", 2);
                if (parts.length == 2) {
                    rows.add(Map.of("property", parts[0].trim(), "value", parts[1].trim()));
                }
            }
        }
        
        return QueryResult.builder()
            .success(true)
            .queryType("INFO")
            .columns(List.of("property", "value"))
            .rows(rows)
            .rowCount(rows.size())
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    private QueryResult buildError(String message, long startTime) {
        return QueryResult.builder()
            .success(false)
            .error(message)
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }
    
    public List<String> getKeys(DatabaseInstance instance) {
        JedisPoolConfig poolConfig = new JedisPoolConfig();
        poolConfig.setMaxTotal(10);
        
        String host = "localhost";
        
        try (JedisPool pool = new JedisPool(poolConfig, host, instance.getPort(), 2000, instance.getPassword());
             Jedis jedis = pool.getResource()) {
            
            Set<String> keys = jedis.keys("*");
            return new ArrayList<>(keys);
            
        } catch (Exception e) {
            log.error("Failed to get Redis keys: {}", e.getMessage());
            return new ArrayList<>();
        }
    }
}

