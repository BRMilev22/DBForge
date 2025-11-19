package com.dbforge.dbforge.service;

import com.dbforge.dbforge.model.DatabaseInstance;
import com.dbforge.dbforge.model.DatabaseType;
import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.command.CreateContainerResponse;
import com.github.dockerjava.api.model.*;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientImpl;
import com.github.dockerjava.zerodep.ZerodepDockerHttpClient;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@Slf4j
public class DockerService {
    
    @Value("${docker.host}")
    private String dockerHost;
    
    @Value("${docker.network:dbforge-network}")
    private String dockerNetwork;
    
    @Value("${resource.default.cpu:0.25}")
    private String defaultCpu;
    
    @Value("${resource.default.memory:256m}")
    private String defaultMemory;
    
    private DockerClient dockerClient;
    
    @PostConstruct
    public void init() {
        try {
            DefaultDockerClientConfig config = DefaultDockerClientConfig.createDefaultConfigBuilder()
                    .withDockerHost(dockerHost)
                    .withDockerTlsVerify(false)
                    .build();
            
            ZerodepDockerHttpClient httpClient = new ZerodepDockerHttpClient.Builder()
                    .dockerHost(config.getDockerHost())
                    .build();
            
            dockerClient = DockerClientImpl.getInstance(config, httpClient);
            
            createNetworkIfNotExists();
            
            log.info("Docker client initialized successfully for host: {}", dockerHost);
        } catch (Exception e) {
            log.error("Failed to initialize Docker client", e);
        }
    }
    
    private void createNetworkIfNotExists() {
        try {
            boolean networkExists = dockerClient.listNetworksCmd()
                    .withNameFilter(dockerNetwork)
                    .exec()
                    .stream()
                    .anyMatch(n -> n.getName().equals(dockerNetwork));
            
            if (!networkExists) {
                dockerClient.createNetworkCmd()
                        .withName(dockerNetwork)
                        .withDriver("bridge")
                        .exec();
                log.info("Created Docker network: {}", dockerNetwork);
            }
        } catch (Exception e) {
            log.warn("Could not create Docker network", e);
        }
    }
    
    private void removeContainerIfExists(String containerName) {
        try {
            var containers = dockerClient.listContainersCmd()
                    .withShowAll(true)
                    .withNameFilter(List.of(containerName))
                    .exec();
            
            if (!containers.isEmpty()) {
                String containerId = containers.get(0).getId();
                log.info("Removing existing container: {} (ID: {})", containerName, containerId);
                
                try {
                    dockerClient.stopContainerCmd(containerId).exec();
                    log.info("Stopped container: {}", containerName);
                } catch (Exception e) {
                    log.debug("Container was not running or already stopped: {}", containerName);
                }
                
                dockerClient.removeContainerCmd(containerId)
                        .withForce(true)
                        .exec();
                log.info("Removed container: {}", containerName);
            }
        } catch (Exception e) {
            log.warn("Could not remove existing container: {}", containerName, e);
        }
    }
    
    public String createDatabase(DatabaseInstance instance, DatabaseType dbType, String fullImageName) {
        try {
            log.info("Creating database container: {}", instance.getContainerName());
            
            removeContainerIfExists(instance.getContainerName());
            
            pullImageIfNotExists(fullImageName);
            
            Thread.sleep(500);
            
            List<String> env = buildEnvironmentVariables(instance, dbType);
            
            ExposedPort exposedPort = ExposedPort.tcp(dbType.getDefaultPort());
            Ports portBindings = new Ports();
            // Bind to 0.0.0.0 to make it accessible from the network
            portBindings.bind(exposedPort, Ports.Binding.bindIpAndPort("0.0.0.0", instance.getPort()));
            
            HostConfig hostConfig = HostConfig.newHostConfig()
                    .withPortBindings(portBindings)
                    .withNetworkMode(dockerNetwork)
                    .withMemory(parseMemoryLimit(defaultMemory))
                    .withNanoCPUs((long) (Double.parseDouble(defaultCpu) * 1_000_000_000L))
                    .withRestartPolicy(RestartPolicy.unlessStoppedRestart());
            
            // Add command to override bind-address for MySQL/MariaDB
            String[] cmd = null;
            if (dbType.getName().equalsIgnoreCase("mysql") || dbType.getName().equalsIgnoreCase("mariadb")) {
                cmd = new String[]{"--bind-address=0.0.0.0"};
            } else if (dbType.getName().equalsIgnoreCase("redis")) {
                // Redis requires password to be set via command line
                cmd = new String[]{"redis-server", "--requirepass", instance.getPassword()};
            }
            
            var createCmd = dockerClient.createContainerCmd(fullImageName)
                    .withName(instance.getContainerName())
                    .withEnv(env)
                    .withExposedPorts(exposedPort)
                    .withHostConfig(hostConfig);
            
            // Only set cmd if not null (PostgreSQL, MongoDB don't need custom commands)
            if (cmd != null) {
                createCmd.withCmd(cmd);
            }
            
            CreateContainerResponse container = createCmd.exec();
            
            dockerClient.startContainerCmd(container.getId()).exec();
            
            log.info("Container created and started: {} (ID: {})", instance.getContainerName(), container.getId());
            return container.getId();
            
        } catch (Exception e) {
            log.error("Failed to create database container", e);
            throw new RuntimeException("Failed to create database: " + e.getMessage());
        }
    }
    
    private void pullImageIfNotExists(String imageName) {
        try {
            log.info("Checking if image exists: {}", imageName);
            
            List<com.github.dockerjava.api.model.Image> allImages = dockerClient.listImagesCmd().exec();
            boolean imageExists = allImages.stream()
                    .filter(img -> img.getRepoTags() != null)
                    .flatMap(img -> Arrays.stream(img.getRepoTags()))
                    .anyMatch(tag -> tag.equals(imageName));
            
            if (!imageExists) {
                log.info("Image not found locally. Pulling Docker image: {}", imageName);
                try {
                    dockerClient.pullImageCmd(imageName)
                            .exec(new com.github.dockerjava.api.async.ResultCallback.Adapter<com.github.dockerjava.api.model.PullResponseItem>() {
                                @Override
                                public void onNext(com.github.dockerjava.api.model.PullResponseItem item) {
                                    if (item.getStatus() != null) {
                                        log.info("Pull progress: {} - {}", 
                                                item.getStatus(), 
                                                item.getProgress() != null ? item.getProgress() : "");
                                    }
                                }
                            })
                            .awaitCompletion();
                    
                    log.info("Image pulled successfully: {}", imageName);
                    
                    Thread.sleep(1000);
                    allImages = dockerClient.listImagesCmd().exec();
                    boolean pullSuccess = allImages.stream()
                            .filter(img -> img.getRepoTags() != null)
                            .flatMap(img -> Arrays.stream(img.getRepoTags()))
                            .anyMatch(tag -> tag.equals(imageName));
                    
                    if (!pullSuccess) {
                        throw new RuntimeException("Image pull completed but image not found: " + imageName);
                    }
                    
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Image pull interrupted: " + imageName, e);
                }
            } else {
                log.info("Docker image already exists: {}", imageName);
            }
        } catch (Exception e) {
            log.error("Error checking/pulling image: {}", imageName, e);
            throw new RuntimeException("Failed to pull image: " + imageName, e);
        }
    }
    
    private List<String> buildEnvironmentVariables(DatabaseInstance instance, DatabaseType dbType) {
        List<String> env = new ArrayList<>();
        
        switch (dbType.getName().toLowerCase()) {
            case "postgresql":
                env.add("POSTGRES_DB=" + instance.getDatabaseName());
                env.add("POSTGRES_USER=" + instance.getUsername());
                env.add("POSTGRES_PASSWORD=" + instance.getPassword());
                break;
            case "mysql":
            case "mariadb":
                env.add("MYSQL_DATABASE=" + instance.getDatabaseName());
                env.add("MYSQL_USER=" + instance.getUsername());
                env.add("MYSQL_PASSWORD=" + instance.getPassword());
                env.add("MYSQL_ROOT_PASSWORD=" + instance.getPassword() + "_root");
                break;
            case "mongodb":
                env.add("MONGO_INITDB_DATABASE=" + instance.getDatabaseName());
                env.add("MONGO_INITDB_ROOT_USERNAME=" + instance.getUsername());
                env.add("MONGO_INITDB_ROOT_PASSWORD=" + instance.getPassword());
                break;
            case "redis":
                env.add("REDIS_PASSWORD=" + instance.getPassword());
                break;
        }
        
        return env;
    }
    
    public void stopContainer(String containerId) {
        try {
            dockerClient.stopContainerCmd(containerId).exec();
            log.info("Container stopped: {}", containerId);
        } catch (Exception e) {
            log.error("Failed to stop container: {} - Error: {}", containerId, e.getMessage(), e);
            throw new RuntimeException("Failed to stop container: " + e.getMessage());
        }
    }
    
    public void startContainer(String containerId) {
        try {
            dockerClient.startContainerCmd(containerId).exec();
            log.info("Container started: {}", containerId);
        } catch (Exception e) {
            log.error("Failed to start container: {} - Error: {}", containerId, e.getMessage(), e);
            throw new RuntimeException("Failed to start container: " + e.getMessage());
        }
    }
    
    public void deleteContainer(String containerId) {
        try {
            dockerClient.stopContainerCmd(containerId).exec();
            dockerClient.removeContainerCmd(containerId).withForce(true).exec();
            log.info("Container deleted: {}", containerId);
        } catch (Exception e) {
            log.error("Failed to delete container: {}", containerId, e);
            throw new RuntimeException("Failed to delete container");
        }
    }
    
    public boolean isContainerRunning(String containerId) {
        try {
            var inspection = dockerClient.inspectContainerCmd(containerId).exec();
            return Boolean.TRUE.equals(inspection.getState().getRunning());
        } catch (Exception e) {
            return false;
        }
    }
    
    private Long parseMemoryLimit(String memory) {
        memory = memory.toLowerCase();
        if (memory.endsWith("g")) {
            return Long.parseLong(memory.replace("g", "")) * 1024 * 1024 * 1024;
        } else if (memory.endsWith("m")) {
            return Long.parseLong(memory.replace("m", "")) * 1024 * 1024;
        }
        return 268435456L; // 256MB default
    }
}
