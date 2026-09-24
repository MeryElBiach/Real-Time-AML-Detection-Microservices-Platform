package com.meryem.aml.gatewayservice.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.util.List;
import java.util.Set;

@Component
public class JwtAuthFilter implements GlobalFilter, Ordered {

    private static final List<String> OPEN_PATHS = List.of("/api/auth/login");

    // Chaque règle : méthode HTTP + motif de chemin (regex) + rôles autorisés.
    // Une route qui ne correspond à aucune règle ici reste accessible à tout
    // utilisateur authentifié (comportement d'origine), on ne restreint que
    // ce qui est explicitement listé.
    private static final List<RoleRule> ROLE_RULES = List.of(
            new RoleRule(HttpMethod.PUT, "^/api/alerts/[^/]+/status$", Set.of("ANALYST", "ADMIN")),
            new RoleRule(HttpMethod.GET, "^/api/reports/.*$", Set.of("AUDITOR", "ADMIN"))
    );

    @Value("${app.jwt.secret}")
    private String secret;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        if (OPEN_PATHS.stream().anyMatch(path::startsWith)) {
            return chain.filter(exchange);
        }

        String authHeader = request.getHeaders().getFirst("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return unauthorized(exchange);
        }

        String token = authHeader.substring(7);

        Claims claims;
        try {
            SecretKey key = Keys.hmacShaKeyFor(secret.getBytes());
            Jws<Claims> parsed = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token);
            claims = parsed.getPayload();
        } catch (Exception e) {
            return unauthorized(exchange);
        }

        // Signature valide -> on vérifie maintenant si CETTE route exige un rôle précis
        String role = claims.get("role", String.class);
        HttpMethod method = request.getMethod();

        boolean matchesProtectedRule = ROLE_RULES.stream().anyMatch(rule ->
                rule.method().equals(method) && path.matches(rule.pathPattern())
        );

        if (matchesProtectedRule) {
            boolean allowed = ROLE_RULES.stream().anyMatch(rule ->
                    rule.method().equals(method)
                            && path.matches(rule.pathPattern())
                            && rule.allowedRoles().contains(role)
            );
            if (!allowed) {
                return forbidden(exchange);
            }
        }

        return chain.filter(exchange);
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        return response.setComplete();
    }

    private Mono<Void> forbidden(ServerWebExchange exchange) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.FORBIDDEN);
        return response.setComplete();
    }

    @Override
    public int getOrder() {
        return -1;
    }

    private record RoleRule(HttpMethod method, String pathPattern, Set<String> allowedRoles) {
    }
}