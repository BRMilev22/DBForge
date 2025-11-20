import dotenv from 'dotenv';
dotenv.config();

const API_URL = process.env.API_URL;
const API_TOKEN = process.env.API_TOKEN;
const PUSH_MESSAGE = process.env.PUSH_MESSAGE;

let queryMode = 'public';
let currentInstanceId = null;

async function fetchDatabaseInfo() {
  try {
    queryMode = 'public';
    const data = await fetchDatabaseInfoPublic();
    currentInstanceId = data.id ?? null;
    return data;
  } catch (err) {
    console.warn(
      `Public token lookup failed (${err.message}). Falling back to authenticated list lookup...`
    );
  }

  queryMode = 'authorized';
  const data = await fetchDatabaseInfoAuthorized();
  currentInstanceId = data.id ?? null;
  return data;
}

async function fetchDatabaseInfoPublic() {
  const url = `${API_URL}/public/databases/${encodeURIComponent(API_TOKEN)}`;
  console.log(`\n[GET] ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to fetch database via token (${response.status}): ${body}`
    );
  }

  const data = await response.json();
  printDatabaseDetails(data);
  return data;
}

async function fetchDatabaseInfoAuthorized() {
  const url = `${API_URL}/databases`;
  console.log(`\n[GET] ${url} (authorized request)`);

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_TOKEN}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to fetch database list with API token (${response.status}): ${body}`
    );
  }

  const databases = await response.json();
  if (!Array.isArray(databases) || databases.length === 0) {
    throw new Error('No databases returned for this API token.');
  }

  const exactMatch = databases.find((db) => db.apiToken === API_TOKEN);
  const selected = exactMatch || databases[0];

  printDatabaseDetails(selected);
  return selected;
}

async function executeTokenQuery(query, options = {}) {
  const { silent = false } = options;

  if (!silent) {
    console.log(`\n[POST] /public/databases/:token/query`);
    console.log(`Query:\n${query}\n`);
  }

  const response = await fetch(
    `${API_URL}/public/databases/${encodeURIComponent(API_TOKEN)}/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );

  const body = await response.text();
  if (!response.ok) {
    throw new Error(
      `Query failed (${response.status} ${response.statusText}): ${body}`
    );
  }

  const result = JSON.parse(body);
  if (!silent || !result.success) {
    printQueryResult(result);
  }

  return result;
}

async function executeAuthorizedQuery(instanceId, query, options = {}) {
  const { silent = false } = options;

  if (!silent) {
    console.log(`\n[POST] /databases/${instanceId}/query (authorized)`);
    console.log(`Query:\n${query}\n`);
  }

  const response = await fetch(`${API_URL}/databases/${instanceId}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify({ query }),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(
      `Query failed (${response.status} ${response.statusText}): ${body}`
    );
  }

  const result = JSON.parse(body);
  if (!silent || !result.success) {
    printQueryResult(result);
  }

  return result;
}

async function executeQuery(query, options = {}) {
  if (queryMode === 'public') {
    return executeTokenQuery(query, options);
  }
  if (!currentInstanceId) {
    throw new Error('Instance ID missing for authorized query execution.');
  }
  return executeAuthorizedQuery(currentInstanceId, query, options);
}

function printDatabaseDetails(database) {
  console.log('=== Database Details ===');
  console.log(`ID: ${database.id}`);
  console.log(`Name: ${database.instanceName}`);
  console.log(`Type: ${database.databaseType}`);
  console.log(`Status: ${database.status}`);

  if (database.connectionInfo) {
    const {
      host,
      port,
      database: dbName,
      username,
      password,
      connectionString,
    } = database.connectionInfo;
    console.log('Connection Info:');
    console.log(`  Host: ${host}`);
    console.log(`  Port: ${port}`);
    console.log(`  Database: ${dbName}`);
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}`);
    console.log(`  Connection String: ${connectionString}`);
  }

  if (database.apiToken) {
    console.log(`API Token: ${database.apiToken}`);
  }
}

function printQueryResult(result) {
  if (!result) {
    console.log('No result returned');
    return;
  }

  console.log('--- Query Result ---');
  console.log(`Success: ${result.success}`);
  if (result.error) {
    console.log(`Error: ${result.error}`);
  }
  if (result.message) {
    console.log(`Message: ${result.message}`);
  }
  if (result.rowCount !== undefined) {
    console.log(`Rows: ${result.rowCount}`);
  }
  if (Array.isArray(result.rows) && result.rows.length) {
    console.table(result.rows);
  }
}

async function buildQueries(database) {
  const type = (database.databaseType || '').toLowerCase();
  const now = Date.now();

  switch (type) {
    case 'postgresql':
    case 'mysql':
    case 'mariadb':
      return await buildSqlQueries(database, now);
    case 'mongodb': {
      const jsonMessage = JSON.stringify(PUSH_MESSAGE);
      return {
        fetch: 'db.api_token_samples.find({}).limit(5)',
        push: `db.api_token_samples.insertOne({ message: ${jsonMessage}, insertedAt: new Date() })`,
        pushVerify: null,
        delete: null,
        deleteVerify: null,
      };
    }
    case 'redis':
      return {
        fetch: 'KEYS api_token_demo:*',
        push: `SET api_token_demo:${now} "${PUSH_MESSAGE}"`,
        pushVerify: null,
        delete: null,
        deleteVerify: null,
      };
    default:
      return {
        fetch: 'SELECT 1',
        push: null,
        pushVerify: null,
        delete: null,
        deleteVerify: null,
      };
  }
}

async function buildSqlQueries(database, timestamp) {
  const tableName = process.env.TABLE_NAME || 'users';

  try {
    const columnInfo = await determineSqlUserColumns(database, tableName);

    const selectFields = columnInfo.selectFields.length
      ? columnInfo.selectFields.join(', ')
      : '*';
    const fetchQuery = `SELECT ${selectFields} FROM ${tableName} ORDER BY ${columnInfo.orderBy} DESC LIMIT 5;`;

    const uniqueName = `token_user_${timestamp}`;
    const uniqueEmail = `${uniqueName}@example.com`;
    const safeMessage = escapeLiteral(PUSH_MESSAGE);
    let insertQuery = null;
    let insertVerifyQuery = null;
    let deleteQuery = null;

    if (columnInfo.insertColumns.length) {
      const values = columnInfo.insertColumns.map((column) => {
        const lower = column.toLowerCase();
        if (columnInfo.nameColumnLower && lower === columnInfo.nameColumnLower) {
          return `'${uniqueName}'`;
        }
        if (columnInfo.emailColumnLower && lower === columnInfo.emailColumnLower) {
          return `'${uniqueEmail}'`;
        }
        if (columnInfo.createdAtColumnLower && lower === columnInfo.createdAtColumnLower) {
          return 'NOW()';
        }
        return `'${safeMessage}'`;
      });

      insertQuery = `INSERT INTO ${tableName} (${columnInfo.insertColumns.join(
        ', '
      )}) VALUES (${values.join(', ')});`;

      const filterColumn = columnInfo.emailColumn || columnInfo.nameColumn;
      const filterValue = columnInfo.emailColumn
        ? `'${uniqueEmail}'`
        : columnInfo.nameColumn
        ? `'${uniqueName}'`
        : null;

      if (filterColumn && filterValue) {
        const filterClause = `${filterColumn} = ${filterValue}`;
        insertVerifyQuery = `SELECT ${selectFields} FROM ${tableName} WHERE ${filterClause} ORDER BY ${columnInfo.orderBy} DESC LIMIT 5;`;
        deleteQuery = `DELETE FROM ${tableName} WHERE ${filterClause};`;
      }
    }

    return {
      fetch: fetchQuery,
      push: insertQuery,
      pushVerify: insertVerifyQuery,
      delete: deleteQuery,
      deleteVerify: insertVerifyQuery,
    };
  } catch (error) {
    console.warn(
      `Failed to inspect ${tableName} table for dynamic queries: ${error.message}`
    );
    return {
      fetch: `SELECT * FROM ${tableName} LIMIT 5;`,
      push: null,
      pushVerify: null,
      delete: null,
      deleteVerify: null,
    };
  }
}

function escapeLiteral(value) {
  return value.replace(/'/g, "''");
}

function normalizeRowKeys(row) {
  const normalized = {};
  Object.entries(row || {}).forEach(([key, val]) => {
    normalized[key.toLowerCase()] = val;
  });
  return normalized;
}

async function determineSqlUserColumns(database, tableName) {
  const dbType = (database.databaseType || '').toLowerCase();
  const sanitizedTable = escapeLiteral(tableName);
  let query = '';

  if (dbType === 'mysql' || dbType === 'mariadb') {
    const schema = escapeLiteral(database.connectionInfo?.database || '');
    if (!schema) {
      throw new Error('Database name missing from connection info.');
    }
    query = `
      SELECT COLUMN_NAME, DATA_TYPE
      FROM information_schema.columns
      WHERE table_schema = '${schema}'
        AND table_name = '${sanitizedTable}'
      ORDER BY ORDINAL_POSITION;
    `;
  } else if (dbType === 'postgresql') {
    const catalog = escapeLiteral(
      database.connectionInfo?.database || database.connectionInfo?.dbname || ''
    );
    if (!catalog) {
      throw new Error('Catalog/database name missing from connection info.');
    }
    const schema = escapeLiteral(database.connectionInfo?.schema || 'public');
    query = `
      SELECT column_name AS COLUMN_NAME, data_type AS DATA_TYPE
      FROM information_schema.columns
      WHERE table_catalog = '${catalog}'
        AND table_schema = '${schema}'
        AND table_name = '${sanitizedTable}'
      ORDER BY ordinal_position;
    `;
  } else {
    throw new Error(`Unsupported SQL database type: ${database.databaseType}`);
  }

  const result = await executeQuery(query, { silent: true });

  if (!result.success || !Array.isArray(result.rows) || !result.rows.length) {
    throw new Error('Column metadata query returned no results.');
  }

  const discoveredColumns = [];
  const columnLookup = {};

  for (const row of result.rows) {
    const normalized = normalizeRowKeys(row);
    const columnName =
      normalized.column_name ||
      normalized.columnname ||
      normalized.column ||
      normalized.field ||
      normalized.name;
    if (columnName) {
      const actual = columnName.toString();
      discoveredColumns.push(actual);
      columnLookup[actual.toLowerCase()] = actual;
    }
  }

  if (!discoveredColumns.length) {
    throw new Error('No column names discovered for table.');
  }

  const idColumn =
    columnLookup.id ||
    columnLookup['user_id'] ||
    discoveredColumns[0] ||
    'id';
  const nameColumn = columnLookup.username || columnLookup.name;
  const emailColumn = columnLookup.email;
  const createdAtColumn =
    columnLookup.created_at ||
    columnLookup.createdat ||
    columnLookup.created ||
    columnLookup.timestamp ||
    columnLookup.createdon;

  const selectFields = [idColumn, nameColumn, emailColumn, createdAtColumn].filter(
    (val, idx, arr) => val && arr.indexOf(val) === idx
  );

  const insertColumns = [];
  if (nameColumn) insertColumns.push(nameColumn);
  if (emailColumn) insertColumns.push(emailColumn);
  if (createdAtColumn) insertColumns.push(createdAtColumn);

  return {
    selectFields,
    insertColumns,
    orderBy: idColumn,
    nameColumn,
    emailColumn,
    nameColumnLower: nameColumn ? nameColumn.toLowerCase() : null,
    emailColumnLower: emailColumn ? emailColumn.toLowerCase() : null,
    createdAtColumnLower: createdAtColumn
      ? createdAtColumn.toLowerCase()
      : null,
  };
}

async function main() {
  try {
    const database = await fetchDatabaseInfo();
    const operations = await buildQueries(database);

    if (operations.fetch) {
      console.log('\nRunning SELECT query...');
      await executeQuery(operations.fetch);
    }

    let insertSucceeded = false;

    if (operations.push) {
      console.log('\nRunning INSERT query...');
      const pushResult = await executeQuery(operations.push);
      if (pushResult.success) {
        insertSucceeded = true;
        if (operations.pushVerify) {
          console.log('\nVerifying inserted data...');
          await executeQuery(operations.pushVerify);
        }
        console.log('\nRe-running SELECT after insert...');
        await executeQuery(operations.fetch);
      } else {
        console.warn('INSERT query failed; skipping verification.');
      }
    } else {
      console.log('No INSERT query generated.');
    }

    if (insertSucceeded && operations.delete) {
      console.log('\nRunning DELETE cleanup...');
      const deleteResult = await executeQuery(operations.delete);
      if (deleteResult.success && operations.deleteVerify) {
        console.log('\nVerifying deletion...');
        await executeQuery(operations.deleteVerify);
      }
      console.log('\nFinal SELECT to show table state...');
      await executeQuery(operations.fetch);
    } else if (operations.delete && !insertSucceeded) {
      console.log('Skipping DELETE because INSERT did not succeed.');
    }
  } catch (error) {
    console.error('\nScript failed:', error.message);
    process.exit(1);
  }
}

main();
