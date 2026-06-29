package com.example.demo.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

import java.util.List;

@Configuration
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    public SecurityConfig(JwtFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {

        http
                .cors(cors -> {})
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/auth/**").permitAll()

                        /*VIAJES*/
                        .requestMatchers("/api/viajes/**").hasAnyRole("ADMIN", "SUPERVISOR")

                        /*SUCURSAL*/
                        .requestMatchers(HttpMethod.GET,    "/api/sucursales/**").hasAnyRole("ADMIN", "SUPERVISOR", "EMPLEADO")
                        .requestMatchers(HttpMethod.POST,   "/api/sucursales").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT,    "/api/sucursales/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/sucursales/**").hasRole("ADMIN")

                        /*EMBARCACIONES*/
                        .requestMatchers(HttpMethod.GET,    "/api/embarcaciones/**").hasAnyRole("ADMIN", "SUPERVISOR", "EMPLEADO")
                        .requestMatchers(HttpMethod.POST,   "/api/embarcaciones").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT,    "/api/embarcaciones/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/embarcaciones/**").hasRole("ADMIN")

                        /*RUTAS*/
                        .requestMatchers(HttpMethod.GET,    "/api/rutas/**").hasAnyRole("ADMIN", "SUPERVISOR", "EMPLEADO")
                        .requestMatchers(HttpMethod.POST,   "/api/rutas").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT,    "/api/rutas/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/rutas/**").hasRole("ADMIN")

                        /*ASIENTOS*/
                        .requestMatchers(HttpMethod.GET, "/api/viajes/*/asientos/**")
                        .hasAnyRole("ADMIN", "SUPERVISOR", "EMPLEADO")

                        /*VENTAS*/
                        .requestMatchers(HttpMethod.GET,   "/api/ventas/**").hasAnyRole("ADMIN", "SUPERVISOR", "EMPLEADO")
                        .requestMatchers(HttpMethod.POST,  "/api/ventas").hasAnyRole("ADMIN", "SUPERVISOR")
                        .requestMatchers(HttpMethod.PATCH, "/api/ventas/*/anular").hasAnyRole("ADMIN", "SUPERVISOR")

                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .formLogin(form -> form.disable());

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration =
                new CorsConfiguration();

        configuration.setAllowedOrigins(
                List.of("http://localhost:5173"));

        configuration.setAllowedMethods(
                List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));

        configuration.setAllowedHeaders(
                List.of("*"));
        
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}