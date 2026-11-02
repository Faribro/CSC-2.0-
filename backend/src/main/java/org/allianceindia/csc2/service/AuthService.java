package org.allianceindia.csc2.service;

import org.allianceindia.csc2.config.JwtTokenProvider;
import org.allianceindia.csc2.domain.Actor;
import org.allianceindia.csc2.domain.ScopeAssignment;
import org.allianceindia.csc2.dto.DTOs;
import org.allianceindia.csc2.repository.ActorRepository;
import org.allianceindia.csc2.repository.ScopeAssignmentRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AuthService {

    private final ActorRepository actorRepository;
    private final ScopeAssignmentRepository scopeAssignmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthService(ActorRepository actorRepository,
                       ScopeAssignmentRepository scopeAssignmentRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider jwtTokenProvider) {
        this.actorRepository = actorRepository;
        this.scopeAssignmentRepository = scopeAssignmentRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Transactional(readOnly = true)
    public DTOs.LoginResponse login(DTOs.LoginRequest request) {
        Actor actor = actorRepository.findByUsername(request.username())
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));

        if (!actor.isActive() || !passwordEncoder.matches(request.password(), actor.getPasswordHash())) {
            throw new BadCredentialsException("Invalid username or password");
        }

        List<String> centers = scopeAssignmentRepository.findByActorId(actor.getId())
                .stream().map(ScopeAssignment::getCenterId).toList();

        String token = jwtTokenProvider.generateToken(actor.getId(), actor.getUsername(), actor.getRole(), centers);

        return new DTOs.LoginResponse(
                token,
                actor.getId(),
                actor.getUsername(),
                actor.getFullName(),
                actor.getRole(),
                centers
        );
    }
}
