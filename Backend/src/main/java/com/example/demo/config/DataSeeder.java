//package com.example.demo.config;
//
//import com.example.demo.model.Rol;
//import com.example.demo.model.Usuario;
//import com.example.demo.repository.UsuarioRepository;
//import org.springframework.boot.CommandLineRunner;
//import org.springframework.context.annotation.Bean;
//import org.springframework.context.annotation.Configuration;
//import org.springframework.security.crypto.password.PasswordEncoder;
//
//import java.time.LocalDateTime;
//import java.util.UUID;
//
//@Configuration
//public class DataSeeder {
//
//    @Bean
//    public CommandLineRunner sembrarAdmin(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
//        return args -> {
//            if (usuarioRepository.count() == 0) {
//                Usuario admin = new Usuario();
//                admin.setId(UUID.randomUUID().toString());
//                admin.setUsername("admin");
//                admin.setPassword(passwordEncoder.encode("admin123")); // cámbiala luego desde la app
//                admin.setNombre("Administrador");
//                admin.setEmail("admin@rayza.com");
//                admin.setRol(Rol.ADMIN);
//                admin.setActivo(true);
//                admin.setCreatedAt(LocalDateTime.now());
//                usuarioRepository.save(admin);
//                System.out.println(">>> Usuario ADMIN inicial creado: admin / admin123");
//            }
//        };
//    }
//}