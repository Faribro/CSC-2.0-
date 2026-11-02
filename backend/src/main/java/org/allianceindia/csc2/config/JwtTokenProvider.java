package org.allianceindia.csc2.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.UUID;

@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long expirationMs;

    public JwtTokenProvider(@Value("${app.jwt.secret}") String secret,
                            @Value("${app.jwt.expiration-ms:86400000}") long expirationMs) {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            byte[] padded = new byte[32];
            System.arraycopy(keyBytes, 0, padded, 0, keyBytes.length);
            keyBytes = padded;
        }
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.expirationMs = expirationMs;
    }

    public String generateToken(UUID actorId, String username, String role, List<String> authorizedCenters) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(actorId.toString())
                .claim("username", username)
                .claim("role", role)
                .claim("centers", authorizedCenters)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    public UserPrincipal parseToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        UUID actorId = UUID.fromString(claims.getSubject());
        String username = claims.get("username", String.class);
        String role = claims.get("role", String.class);
        @SuppressWarnings("unchecked")
        List<String> centers = claims.get("centers", List.class);

        return new UserPrincipal(actorId, username, role, centers);
    }
}
