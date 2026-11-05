package org.allianceindia.csc2.service;

import org.allianceindia.csc2.domain.AuthRateLimit;
import org.allianceindia.csc2.repository.AuthRateLimitRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

@Service
public class RateLimiterService {

    private final AuthRateLimitRepository rateLimitRepository;

    public RateLimiterService(AuthRateLimitRepository rateLimitRepository) {
        this.rateLimitRepository = rateLimitRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean checkAndRecord(String rateKey, int maxAttempts, Duration window) {
        Instant cutoff = Instant.now().minus(window);
        long count = rateLimitRepository.countByRateKeyAndAttemptAtAfter(rateKey, cutoff);
        if (count >= maxAttempts) {
            return false;
        }
        rateLimitRepository.save(new AuthRateLimit(rateKey));
        return true;
    }

    @Transactional(readOnly = true)
    public boolean isAllowed(String rateKey, int maxAttempts, Duration window) {
        Instant cutoff = Instant.now().minus(window);
        long count = rateLimitRepository.countByRateKeyAndAttemptAtAfter(rateKey, cutoff);
        return count < maxAttempts;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordAttempt(String rateKey) {
        rateLimitRepository.save(new AuthRateLimit(rateKey));
    }
}
