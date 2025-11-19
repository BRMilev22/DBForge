package com.dbforge.dbforge.config;

import com.dbforge.dbforge.service.ApiTokenService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class ApiKeyFilter extends OncePerRequestFilter {
    
    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";
    
    private final ApiTokenService apiTokenService;
    private final ObjectMapper objectMapper;
    
    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        
        try {
            // Get Authorization header
            String authHeader = request.getHeader(AUTHORIZATION_HEADER);
            
            if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)) {
                String token = authHeader.substring(BEARER_PREFIX.length());
                
                // Try to validate as API token
                Optional<Long> userIdOpt = apiTokenService.validateToken(token);
                
                if (userIdOpt.isPresent()) {
                    Long userId = userIdOpt.get();
                    
                    // Create authentication token
                    UsernamePasswordAuthenticationToken authentication = 
                            new UsernamePasswordAuthenticationToken(userId, null, null);
                    
                    // Set in security context
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    
                    log.debug("API Key authentication successful for user: {}", userId);
                }
                // If not a valid API token, just continue - might be a JWT token
            }
            
            // Continue filter chain
            filterChain.doFilter(request, response);
            
        } catch (Exception e) {
            log.error("Error in ApiKeyFilter", e);
            handleFilterException(response, e);
        }
    }
    
    /**
     * Handle invalid token response
     */
    private void handleInvalidToken(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        
        Map<String, String> errorResponse = new HashMap<>();
        errorResponse.put("error", "Invalid or expired API token");
        
        response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
    }
    
    /**
     * Handle filter exceptions
     */
    private void handleFilterException(HttpServletResponse response, Exception e) throws IOException {
        response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        
        Map<String, String> errorResponse = new HashMap<>();
        errorResponse.put("error", "Authentication filter error");
        
        response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
    }
}
