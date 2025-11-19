package com.dbforge.dbforge;

import com.dbforge.dbforge.model.DatabaseType;
import com.dbforge.dbforge.repository.DatabaseTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
@Slf4j
@RequiredArgsConstructor
public class DbforgeApplication {

	private final DatabaseTypeRepository databaseTypeRepository;

	public static void main(String[] args) {
		SpringApplication.run(DbforgeApplication.class, args);
	}

	@Bean
	CommandLineRunner initDatabase() {
		return args -> {
			if (databaseTypeRepository.count() == 0) {
				log.info("Seeding database types...");
				
				databaseTypeRepository.save(createDbType("postgres", "PostgreSQL", 
					"Advanced open-source relational database", "postgres:17.0-alpine", 5432));
				
				databaseTypeRepository.save(createDbType("mysql", "MySQL", 
					"Popular open-source relational database", "mysql:9.1", 3306));
				
				databaseTypeRepository.save(createDbType("mariadb", "MariaDB", 
					"MySQL-compatible relational database", "mariadb:11.6", 3306));
				
				databaseTypeRepository.save(createDbType("mongodb", "MongoDB", 
					"Document-oriented NoSQL database", "mongo:8.0", 27017));
				
				databaseTypeRepository.save(createDbType("redis", "Redis", 
					"In-memory data structure store", "redis:7.4-alpine", 6379));
				
				log.info("Database types seeded successfully");
			}
		};
	}
	
	private DatabaseType createDbType(String name, String displayName, String description, 
	                                  String dockerImage, int defaultPort) {
		DatabaseType type = new DatabaseType();
		type.setName(name);
		type.setDisplayName(displayName);
		type.setDescription(description);
		type.setDockerImage(dockerImage);
		type.setDefaultPort(defaultPort);
		type.setIsActive(true);
		
		if (name.equals("mongodb") || name.equals("redis")) {
			type.setCategory(DatabaseType.DatabaseCategory.NOSQL);
		} else if (name.equals("redis")) {
			type.setCategory(DatabaseType.DatabaseCategory.CACHE);
		} else {
			type.setCategory(DatabaseType.DatabaseCategory.SQL);
		}
		
		return type;
	}
}
