package com.dbforge.dbforge.service;

import com.dbforge.dbforge.dto.ExportRequest;
import com.dbforge.dbforge.dto.SchemaInfo;
import com.dbforge.dbforge.model.DatabaseInstance;
import com.dbforge.dbforge.repository.DatabaseInstanceRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisPoolConfig;
import redis.clients.jedis.resps.Tuple;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExportService {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final DatabaseInstanceRepository databaseInstanceRepository;
    private final SchemaIntrospectionService schemaIntrospectionService;

    public ExportFile exportDatabase(Long instanceId, Long userId, ExportRequest request) {
        DatabaseInstance instance = databaseInstanceRepository.findById(instanceId)
                .orElseThrow(() -> new RuntimeException("Database instance not found"));

        if (userId != null && !instance.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }

        if (instance.getStatus() != DatabaseInstance.InstanceStatus.RUNNING) {
            throw new RuntimeException("Database instance is not running");
        }

        String format = normalizeFormat(request.getFormat());
        ExportContext context = new ExportContext(
                format,
                Boolean.TRUE.equals(request.getIncludeSchema()),
                request.getIncludeHeaders() == null || request.getIncludeHeaders(),
                request.getLimit() != null ? request.getLimit() : 0
        );

        String dbType = instance.getDatabaseType().getName().toLowerCase();
        return switch (dbType) {
            case "mongodb" -> exportMongo(instance, request, context);
            case "redis" -> exportRedis(instance, request, context);
            default -> exportSql(instance, request, context);
        };
    }

    private ExportFile exportSql(DatabaseInstance instance, ExportRequest request, ExportContext context) {
        List<String> tables = resolveSqlTables(instance, request);
        if (tables.isEmpty()) {
            throw new RuntimeException("No tables found to export");
        }

        String jdbcUrl = buildJdbcUrl(instance);

        try (Connection conn = DriverManager.getConnection(jdbcUrl, instance.getUsername(), instance.getPassword())) {
            if (tables.size() == 1) {
                String table = tables.get(0);
                String content = exportSqlTable(conn, table, context);
                String extension = switch (context.format()) {
                    case "json" -> "json";
                    case "sql" -> "sql";
                    default -> "csv";
                };
                MediaType mediaType = switch (context.format()) {
                    case "json" -> MediaType.APPLICATION_JSON;
                    case "sql" -> MediaType.TEXT_PLAIN;
                    default -> new MediaType("text", "csv");
                };
                String filename = buildFileName(table, "export." + extension);
                return new ExportFile(content.getBytes(StandardCharsets.UTF_8), filename, mediaType);
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            try (ZipOutputStream zos = new ZipOutputStream(baos, StandardCharsets.UTF_8)) {
                for (String table : tables) {
                    String content = exportSqlTable(conn, table, context);
                    String extension = switch (context.format()) {
                        case "json" -> ".json";
                        case "sql" -> ".sql";
                        default -> ".csv";
                    };
                    addZipEntry(zos, sanitize(table) + extension, content);
                }
            }

            String filename = buildFileName(instance.getInstanceName(), "export-" + context.format() + ".zip");
            return new ExportFile(baos.toByteArray(), filename, MediaType.parseMediaType("application/zip"));
        } catch (SQLException | IOException e) {
            throw new RuntimeException("Failed to export SQL database: " + e.getMessage(), e);
        }
    }

    private ExportFile exportMongo(DatabaseInstance instance, ExportRequest request, ExportContext context) {
        if ("sql".equals(context.format())) {
            throw new RuntimeException("SQL export is not supported for MongoDB");
        }

        String connectionString = String.format(
                "mongodb://%s:%s@localhost:%d/%s?authSource=admin",
                instance.getUsername(),
                instance.getPassword(),
                instance.getPort(),
                instance.getDatabaseName()
        );

        List<String> collections = resolveMongoCollections(instance, connectionString, request);
        if (collections.isEmpty()) {
            throw new RuntimeException("No collections found to export");
        }

        try (MongoClient client = MongoClients.create(connectionString)) {
            MongoDatabase database = client.getDatabase(instance.getDatabaseName());

            if (collections.size() == 1) {
                String collection = collections.get(0);
                String content = exportMongoCollection(database, collection, context);
                String extension = "json".equals(context.format()) ? "json" : "csv";
                MediaType mediaType = "json".equals(context.format())
                        ? MediaType.APPLICATION_JSON
                        : new MediaType("text", "csv");
                String filename = buildFileName(collection, "export." + extension);
                return new ExportFile(content.getBytes(StandardCharsets.UTF_8), filename, mediaType);
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            try (ZipOutputStream zos = new ZipOutputStream(baos, StandardCharsets.UTF_8)) {
                for (String collection : collections) {
                    String content = exportMongoCollection(database, collection, context);
                    String extension = "json".equals(context.format()) ? ".json" : ".csv";
                    addZipEntry(zos, sanitize(collection) + extension, content);
                }
            }

            String filename = buildFileName(instance.getInstanceName(), "export-" + context.format() + ".zip");
            return new ExportFile(baos.toByteArray(), filename, MediaType.parseMediaType("application/zip"));
        } catch (Exception e) {
            throw new RuntimeException("Failed to export MongoDB database: " + e.getMessage(), e);
        }
    }

    private ExportFile exportRedis(DatabaseInstance instance, ExportRequest request, ExportContext context) {
        if ("sql".equals(context.format())) {
            throw new RuntimeException("SQL export is not supported for Redis");
        }

        JedisPoolConfig poolConfig = new JedisPoolConfig();
        poolConfig.setMaxTotal(10);

        List<String> patterns = (request.getTables() != null && !request.getTables().isEmpty())
                ? request.getTables()
                : List.of("*");

        try (JedisPool pool = new JedisPool(poolConfig, "localhost", instance.getPort(), 2000, instance.getPassword());
             Jedis jedis = pool.getResource()) {

            Set<String> keys = new LinkedHashSet<>();
            for (String pattern : patterns) {
                keys.addAll(jedis.keys(pattern));
                if (context.limit() > 0 && keys.size() >= context.limit()) {
                    break;
                }
            }

            List<Map<String, Object>> entries = new ArrayList<>();
            int max = context.limit() > 0 ? context.limit() : Integer.MAX_VALUE;
            int count = 0;
            for (String key : keys) {
                if (count >= max) break;
                entries.add(readRedisEntry(jedis, key));
                count++;
            }

            String content = "json".equals(context.format())
                    ? writeRedisJson(entries)
                    : writeRedisCsv(entries, context.includeHeaders());

            String extension = "json".equals(context.format()) ? "json" : "csv";
            MediaType mediaType = "json".equals(context.format())
                    ? MediaType.APPLICATION_JSON
                    : new MediaType("text", "csv");
            String filename = buildFileName(instance.getInstanceName(), "redis-export." + extension);

            return new ExportFile(content.getBytes(StandardCharsets.UTF_8), filename, mediaType);
        } catch (Exception e) {
            throw new RuntimeException("Failed to export Redis database: " + e.getMessage(), e);
        }
    }

    private String exportSqlTable(Connection conn, String table, ExportContext context) throws SQLException, JsonProcessingException {
        String query = "SELECT * FROM " + table;
        if (context.limit() > 0) {
            query += " LIMIT " + context.limit();
        }

        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(query)) {

            ResultSetMetaData metaData = rs.getMetaData();
            return switch (context.format()) {
                case "json" -> resultSetToJson(rs, metaData);
                case "sql" -> resultSetToInsertStatements(table, rs, metaData, context.includeSchema());
                default -> resultSetToCsv(rs, metaData, context.includeHeaders());
            };
        }
    }

    private String exportMongoCollection(MongoDatabase database, String collectionName, ExportContext context) throws JsonProcessingException {
        MongoCollection<Document> collection = database.getCollection(collectionName);
        FindIterable<Document> iterable = collection.find();
        if (context.limit() > 0) {
            iterable = iterable.limit(context.limit());
        }

        List<Document> documents = new ArrayList<>();
        iterable.into(documents);

        if (documents.isEmpty()) {
            return "json".equals(context.format()) ? "[]" : "";
        }

        if ("json".equals(context.format())) {
            return OBJECT_MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(documents);
        }

        return documentsToCsv(documents, context.includeHeaders());
    }

    private List<String> resolveSqlTables(DatabaseInstance instance, ExportRequest request) {
        SchemaInfo schema = schemaIntrospectionService.getSchema(instance.getId());
        List<String> availableTables = schema.getTables().stream()
                .map(SchemaInfo.TableInfo::getName)
                .toList();

        if (request.getTables() == null || request.getTables().isEmpty()) {
            return availableTables;
        }

        Set<String> requested = new HashSet<>();
        request.getTables().forEach(t -> requested.add(t.toLowerCase()));

        return availableTables.stream()
                .filter(t -> requested.contains(t.toLowerCase()))
                .toList();
    }

    private List<String> resolveMongoCollections(DatabaseInstance instance, String connectionString, ExportRequest request) {
        if (request.getTables() != null && !request.getTables().isEmpty()) {
            return request.getTables();
        }

        try (MongoClient client = MongoClients.create(connectionString)) {
            MongoDatabase database = client.getDatabase(instance.getDatabaseName());
            return database.listCollectionNames().into(new ArrayList<>());
        } catch (Exception e) {
            log.error("Failed to resolve MongoDB collections: {}", e.getMessage());
            return List.of();
        }
    }

    private String buildJdbcUrl(DatabaseInstance instance) {
        String host = "localhost";
        String port = String.valueOf(instance.getPort());
        String database = instance.getDatabaseName();
        String dbType = instance.getDatabaseType().getName().toLowerCase();

        return switch (dbType) {
            case "postgresql" -> String.format("jdbc:postgresql://%s:%s/%s", host, port, database);
            case "mysql", "mariadb" -> String.format("jdbc:mysql://%s:%s/%s?allowPublicKeyRetrieval=true&useSSL=false", host, port, database);
            default -> throw new RuntimeException("Unsupported database type: " + dbType);
        };
    }

    private String resultSetToJson(ResultSet rs, ResultSetMetaData metaData) throws SQLException, JsonProcessingException {
        List<Map<String, Object>> rows = new ArrayList<>();
        int columnCount = metaData.getColumnCount();

        while (rs.next()) {
            Map<String, Object> row = new LinkedHashMap<>();
            for (int i = 1; i <= columnCount; i++) {
                row.put(metaData.getColumnLabel(i), rs.getObject(i));
            }
            rows.add(row);
        }

        return OBJECT_MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(rows);
    }

    private String resultSetToInsertStatements(String table, ResultSet rs, ResultSetMetaData metaData, boolean includeSchema) throws SQLException {
        StringBuilder sb = new StringBuilder();
        int columnCount = metaData.getColumnCount();

        if (includeSchema) {
            sb.append("-- Schema for ").append(table).append("\n");
            for (int i = 1; i <= columnCount; i++) {
                sb.append("-- ").append(metaData.getColumnLabel(i))
                        .append(" ")
                        .append(metaData.getColumnTypeName(i));
                sb.append(metaData.isNullable(i) == ResultSetMetaData.columnNullable ? " NULL" : " NOT NULL");
                sb.append("\n");
            }
            sb.append("\n");
        }

        List<String> columns = new ArrayList<>();
        for (int i = 1; i <= columnCount; i++) {
            columns.add(metaData.getColumnLabel(i));
        }

        while (rs.next()) {
            sb.append("INSERT INTO ").append(table)
                    .append(" (")
                    .append(String.join(", ", columns))
                    .append(") VALUES (");

            for (int i = 1; i <= columnCount; i++) {
                sb.append(formatSqlValue(rs.getObject(i)));
                if (i < columnCount) {
                    sb.append(", ");
                }
            }
            sb.append(");\n");
        }

        return sb.toString();
    }

    private String resultSetToCsv(ResultSet rs, ResultSetMetaData metaData, boolean includeHeaders) throws SQLException {
        StringBuilder sb = new StringBuilder();
        int columnCount = metaData.getColumnCount();

        if (includeHeaders) {
            for (int i = 1; i <= columnCount; i++) {
                sb.append(escapeCsv(metaData.getColumnLabel(i)));
                if (i < columnCount) sb.append(",");
            }
            sb.append("\n");
        }

        while (rs.next()) {
            for (int i = 1; i <= columnCount; i++) {
                sb.append(escapeCsv(rs.getObject(i)));
                if (i < columnCount) sb.append(",");
            }
            sb.append("\n");
        }

        return sb.toString();
    }

    private String documentsToCsv(List<Document> documents, boolean includeHeaders) {
        Set<String> columns = new LinkedHashSet<>();
        documents.forEach(doc -> columns.addAll(doc.keySet()));

        StringBuilder sb = new StringBuilder();

        if (includeHeaders) {
            int idx = 0;
            for (String col : columns) {
                sb.append(escapeCsv(col));
                if (idx < columns.size() - 1) {
                    sb.append(",");
                }
                idx++;
            }
            sb.append("\n");
        }

        for (Document doc : documents) {
            int idx = 0;
            for (String col : columns) {
                sb.append(escapeCsv(stringifyMongoValue(doc.get(col))));
                if (idx < columns.size() - 1) {
                    sb.append(",");
                }
                idx++;
            }
            sb.append("\n");
        }

        return sb.toString();
    }

    private Map<String, Object> readRedisEntry(Jedis jedis, String key) {
        String type = jedis.type(key);
        Object value;

        switch (type) {
            case "list" -> value = jedis.lrange(key, 0, -1);
            case "set" -> value = jedis.smembers(key);
            case "hash" -> value = jedis.hgetAll(key);
            case "zset" -> {
                List<Tuple> tuples = jedis.zrangeWithScores(key, 0, -1);
                Map<String, Double> zset = new LinkedHashMap<>();
                for (Tuple tuple : tuples) {
                    zset.put(tuple.getElement(), tuple.getScore());
                }
                value = zset;
            }
            case "string" -> value = jedis.get(key);
            default -> value = jedis.get(key);
        }

        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("key", key);
        entry.put("type", type);
        entry.put("value", value);
        return entry;
    }

    private String writeRedisJson(List<Map<String, Object>> entries) throws JsonProcessingException {
        return OBJECT_MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(entries);
    }

    private String writeRedisCsv(List<Map<String, Object>> entries, boolean includeHeaders) throws JsonProcessingException {
        StringBuilder sb = new StringBuilder();
        if (includeHeaders) {
            sb.append("key,type,value\n");
        }

        for (Map<String, Object> entry : entries) {
            sb.append(escapeCsv(entry.get("key")))
                    .append(",")
                    .append(escapeCsv(entry.get("type")))
                    .append(",")
                    .append(escapeCsv(stringifyValue(entry.get("value"))))
                    .append("\n");
        }

        return sb.toString();
    }

    private String stringifyValue(Object value) throws JsonProcessingException {
        if (value == null) return "";
        if (value instanceof Collection || value instanceof Map) {
            return OBJECT_MAPPER.writeValueAsString(value);
        }
        return String.valueOf(value);
    }

    private String stringifyMongoValue(Object value) {
        if (value == null) return "";
        if (value instanceof Document) {
            return ((Document) value).toJson();
        }
        if (value instanceof Collection || value instanceof Map) {
            try {
                return OBJECT_MAPPER.writeValueAsString(value);
            } catch (JsonProcessingException e) {
                return String.valueOf(value);
            }
        }
        return String.valueOf(value);
    }

    private String formatSqlValue(Object value) {
        if (value == null) {
            return "NULL";
        }
        if (value instanceof Number || value instanceof Boolean) {
            return value.toString();
        }
        String escaped = value.toString().replace("'", "''");
        return "'" + escaped + "'";
    }

    private String escapeCsv(Object raw) {
        if (raw == null) return "";
        String value = raw.toString();
        boolean hasSpecial = value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r");
        if (hasSpecial) {
            value = "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private void addZipEntry(ZipOutputStream zos, String name, String content) throws IOException {
        ZipEntry entry = new ZipEntry(name);
        zos.putNextEntry(entry);
        zos.write(content.getBytes(StandardCharsets.UTF_8));
        zos.closeEntry();
    }

    private String buildFileName(String base, String suffix) {
        String timestamp = new SimpleDateFormat("yyyyMMdd-HHmmss").format(new java.util.Date());
        return sanitize(base) + "-export-" + timestamp + "-" + suffix;
    }

    private String sanitize(String value) {
        return value == null ? "export" : value.replaceAll("[^a-zA-Z0-9_-]", "_");
    }

    private String normalizeFormat(String format) {
        if (format == null || format.isBlank()) return "csv";
        return format.toLowerCase();
    }

    public record ExportFile(byte[] data, String filename, MediaType contentType) {
    }

    private record ExportContext(String format, boolean includeSchema, boolean includeHeaders, int limit) {
    }
}
