package com.example.demo.controller;

import com.example.demo.repository.UsuarioRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestController {

    private final UsuarioRepository usuarioRepository;

    public TestController(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @GetMapping("/usuarios")
    public long contarUsuarios() {
        return usuarioRepository.count();
    }
}