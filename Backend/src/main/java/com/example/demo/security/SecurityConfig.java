package com.example.demo.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
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
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
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

                        /*USUARIOS*/
                        .requestMatchers(HttpMethod.GET,    "/api/usuarios/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST,   "/api/usuarios").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH,  "/api/usuarios/**").hasRole("ADMIN")

                        /*VIAJES*/
                        .requestMatchers(HttpMethod.GET,    "/api/viajes/**").hasAnyRole("ADMIN", "SUPERVISOR", "EMPLEADO")
                        .requestMatchers(HttpMethod.POST,   "/api/viajes/**").hasAnyRole("ADMIN", "SUPERVISOR")
                        .requestMatchers(HttpMethod.PUT,    "/api/viajes/**").hasAnyRole("ADMIN", "SUPERVISOR")
                        .requestMatchers(HttpMethod.DELETE, "/api/viajes/**").hasRole("ADMIN")

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

                        /*VENTAS*/
                        .requestMatchers(HttpMethod.GET,   "/api/ventas/**").hasAnyRole("ADMIN", "SUPERVISOR", "EMPLEADO")
                        .requestMatchers(HttpMethod.POST,  "/api/ventas").hasAnyRole("ADMIN", "SUPERVISOR")
                        .requestMatchers(HttpMethod.PATCH, "/api/ventas/*/anular").hasAnyRole("ADMIN", "SUPERVISOR")

                        /*DASHBOARD*/
                        .requestMatchers(HttpMethod.GET, "/api/dashboard/**").hasAnyRole("ADMIN", "SUPERVISOR", "EMPLEADO")

                        /*COMPROBANTE*/
                        .requestMatchers(HttpMethod.POST, "/api/ventas/*/enviar-comprobante").hasAnyRole("ADMIN", "SUPERVISOR", "EMPLEADO")

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
                List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));

        configuration.setAllowedHeaders(
                List.of("*"));
        
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}