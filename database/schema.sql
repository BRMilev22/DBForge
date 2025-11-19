-- DBForge Control Database Schema
-- MySQL/MariaDB
-- Version: 0.1.0
-- Date: 2025-11-13

CREATE DATABASE IF NOT EXISTS dbforge
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE dbforge;

CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role ENUM('STUDENT', 'EDUCATOR', 'ADMIN') DEFAULT 'STUDENT',
    status ENUM('ACTIVE', 'SUSPENDED', 'DELETED') DEFAULT 'ACTIVE',
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_status (status)
) ENGINE=InnoDB;

CREATE TABLE user_profiles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    organization VARCHAR(255),
    bio TEXT,
    avatar_url VARCHAR(500),
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_profile (user_id)
) ENGINE=InnoDB;

CREATE TABLE database_types (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url VARCHAR(500),
    docker_image VARCHAR(255) NOT NULL,
    default_port INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    category ENUM('SQL', 'NOSQL', 'CACHE', 'OTHER') DEFAULT 'SQL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE database_versions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    database_type_id BIGINT NOT NULL,
    version VARCHAR(50) NOT NULL,
    docker_tag VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    release_date DATE,
    end_of_life_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (database_type_id) REFERENCES database_types(id) ON DELETE CASCADE,
    UNIQUE KEY unique_type_version (database_type_id, version),
    INDEX idx_database_type_id (database_type_id),
    INDEX idx_is_default (is_default)
) ENGINE=InnoDB;

CREATE TABLE database_instances (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    database_type_id BIGINT NOT NULL,
    database_version_id BIGINT NOT NULL,
    instance_name VARCHAR(100) NOT NULL,
    container_id VARCHAR(100),
    container_name VARCHAR(255) NOT NULL UNIQUE,
    
    host VARCHAR(255) DEFAULT 'localhost',
    port INT NOT NULL,
    database_name VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    
    cpu_limit DECIMAL(3,2) DEFAULT 0.5,
    memory_limit VARCHAR(20) DEFAULT '512m',
    storage_limit VARCHAR(20) DEFAULT '1g',
    max_connections INT DEFAULT 20,
    
    status ENUM('CREATING', 'RUNNING', 'STOPPED', 'ERROR', 'DELETED') DEFAULT 'CREATING',
    health_status ENUM('HEALTHY', 'UNHEALTHY', 'UNKNOWN') DEFAULT 'UNKNOWN',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    stopped_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    
    notes TEXT,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (database_type_id) REFERENCES database_types(id),
    FOREIGN KEY (database_version_id) REFERENCES database_versions(id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_container_name (container_name),
    INDEX idx_port (port)
) ENGINE=InnoDB;

CREATE TABLE port_allocations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    database_type_id BIGINT NOT NULL,
    port INT NOT NULL,
    database_instance_id BIGINT,
    is_allocated BOOLEAN DEFAULT FALSE,
    allocated_at TIMESTAMP NULL,
    released_at TIMESTAMP NULL,
    FOREIGN KEY (database_type_id) REFERENCES database_types(id),
    FOREIGN KEY (database_instance_id) REFERENCES database_instances(id) ON DELETE SET NULL,
    UNIQUE KEY unique_port (port),
    INDEX idx_database_type_port (database_type_id, port),
    INDEX idx_is_allocated (is_allocated)
) ENGINE=InnoDB;

CREATE TABLE usage_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    database_instance_id BIGINT,
    
    cpu_usage_seconds DECIMAL(12,2) DEFAULT 0,
    memory_usage_mb DECIMAL(12,2) DEFAULT 0,
    storage_usage_mb DECIMAL(12,2) DEFAULT 0,
    network_in_mb DECIMAL(12,2) DEFAULT 0,
    network_out_mb DECIMAL(12,2) DEFAULT 0,
    query_count BIGINT DEFAULT 0,
    
    log_date DATE NOT NULL,
    log_hour TINYINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (database_instance_id) REFERENCES database_instances(id) ON DELETE SET NULL,
    INDEX idx_user_date (user_id, log_date),
    INDEX idx_instance_date (database_instance_id, log_date)
) ENGINE=InnoDB;

CREATE TABLE daily_usage_summary (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    usage_date DATE NOT NULL,
    
    total_cpu_seconds DECIMAL(12,2) DEFAULT 0,
    total_memory_mb DECIMAL(12,2) DEFAULT 0,
    total_storage_mb DECIMAL(12,2) DEFAULT 0,
    total_network_mb DECIMAL(12,2) DEFAULT 0,
    total_queries BIGINT DEFAULT 0,
    
    active_instances INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, usage_date),
    INDEX idx_usage_date (usage_date)
) ENGINE=InnoDB;

CREATE TABLE api_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_name VARCHAR(100) NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    scopes TEXT,
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (token_hash)
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id BIGINT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status ENUM('SUCCESS', 'FAILURE') DEFAULT 'SUCCESS',
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

CREATE TABLE system_settings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB;

INSERT INTO database_types (name, display_name, description, docker_image, default_port, category) VALUES
('postgres', 'PostgreSQL', 'Advanced open-source relational database', 'postgres', 5432, 'SQL'),
('mysql', 'MySQL', 'Popular open-source relational database', 'mysql', 3306, 'SQL'),
('mariadb', 'MariaDB', 'MySQL-compatible relational database', 'mariadb', 3306, 'SQL'),
('mongodb', 'MongoDB', 'Document-oriented NoSQL database', 'mongo', 27017, 'NOSQL'),
('redis', 'Redis', 'In-memory data structure store', 'redis', 6379, 'CACHE');

INSERT INTO database_versions (database_type_id, version, docker_tag, is_default, release_date) VALUES
(1, '17.0', '17.0-alpine', TRUE, '2024-09-26'),
(1, '16.6', '16.6-alpine', FALSE, '2023-09-14'),
(1, '15.10', '15.10-alpine', FALSE, '2022-10-13');

INSERT INTO database_versions (database_type_id, version, docker_tag, is_default, release_date) VALUES
(2, '9.1', '9.1', TRUE, '2024-07-15'),
(2, '8.4', '8.4', FALSE, '2018-04-19');

INSERT INTO database_versions (database_type_id, version, docker_tag, is_default, release_date) VALUES
(3, '11.6', '11.6', TRUE, '2024-10-22'),
(3, '10.11', '10.11', FALSE, '2023-02-16');

INSERT INTO database_versions (database_type_id, version, docker_tag, is_default, release_date) VALUES
(4, '8.0', '8.0', TRUE, '2024-03-12'),
(4, '7.0', '7.0', FALSE, '2023-08-01');

INSERT INTO database_versions (database_type_id, version, docker_tag, is_default, release_date) VALUES
(5, '7.4', '7.4-alpine', TRUE, '2024-07-15'),
(5, '7.2', '7.2-alpine', FALSE, '2023-08-15');

INSERT INTO port_allocations (database_type_id, port, is_allocated)
SELECT 1, port_num, FALSE
FROM (
    SELECT 5432 + (n * 1) AS port_num
    FROM (
        SELECT a.N + b.N * 10 AS n
        FROM 
            (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
             UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a,
            (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
             UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b
    ) numbers
    WHERE (5432 + (n * 1)) <= 5531
) AS ports;

INSERT INTO port_allocations (database_type_id, port, is_allocated)
SELECT 2, port_num, FALSE
FROM (
    SELECT 3306 + (n * 1) AS port_num
    FROM (
        SELECT a.N + b.N * 10 AS n
        FROM 
            (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
             UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a,
            (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
             UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b
    ) numbers
    WHERE (3306 + (n * 1)) <= 3405
) AS ports;

-- MariaDB ports: 3406-3505 (100 ports)
INSERT INTO port_allocations (database_type_id, port, is_allocated)
SELECT 3, port_num, FALSE
FROM (
    SELECT 3406 + (n * 1) AS port_num
    FROM (
        SELECT a.N + b.N * 10 AS n
        FROM 
            (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
             UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a,
            (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
             UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b
    ) numbers
    WHERE (3406 + (n * 1)) <= 3505
) AS ports;

INSERT INTO port_allocations (database_type_id, port, is_allocated)
SELECT 4, port_num, FALSE
FROM (
    SELECT 27017 + (n * 1) AS port_num
    FROM (
        SELECT a.N + b.N * 10 AS n
        FROM 
            (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
             UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a,
            (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
             UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b
    ) numbers
    WHERE (27017 + (n * 1)) <= 27116
) AS ports;

-- Redis ports: 6379-6478 (100 ports)
INSERT INTO port_allocations (database_type_id, port, is_allocated)
SELECT 5, port_num, FALSE
FROM (
    SELECT 6379 + (n * 1) AS port_num
    FROM (
        SELECT a.N + b.N * 10 AS n
        FROM 
            (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
             UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a,
            (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
             UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b
    ) numbers
    WHERE (6379 + (n * 1)) <= 6478
) AS ports;

INSERT INTO system_settings (setting_key, setting_value, description, is_public) VALUES
('max_databases_per_user', '3', 'Maximum number of databases per user (limited by 4GB RAM)', TRUE),
('max_active_instances_total', '8', 'Maximum total active instances (4GB RAM constraint)', FALSE),
('default_cpu_limit', '0.25', 'Default CPU cores per container', FALSE),
('default_memory_limit', '256m', 'Default memory limit per container', FALSE),
('default_storage_limit', '1g', 'Default storage limit per container', FALSE),
('auto_stop_idle_minutes', '30', 'Auto-stop idle containers after X minutes', FALSE),
('maintenance_mode', 'false', 'System-wide maintenance mode', TRUE),
('registration_enabled', 'true', 'Allow new user registrations', TRUE);

INSERT INTO users (id, username, email, password_hash, first_name, last_name, role, status, email_verified) VALUES
(1, 'testuser', 'test@dbforge.dev', '$2a$10$N9qo8uLOickgx2ZMRZoMye6J3r5yEBv8p1OvLxFWsNVq0vR1P.UpW', 'Test', 'User', 'STUDENT', 'ACTIVE', TRUE);

CREATE USER IF NOT EXISTS 'dbforge_user'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE ON dbforge.* TO 'dbforge_user'@'localhost';
FLUSH PRIVILEGES;