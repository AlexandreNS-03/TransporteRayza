package com.example.demo.service;

import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.LoginResponse;
import com.example.demo.model.Usuario;
import com.example.demo.repository.UsuarioRepository;
import com.example.demo.security.JwtUtil;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final IntentosLoginService intentosLoginService;

    private final DobleFactorService dobleFactorService;

    public AuthService(UsuarioRepository usuarioRepository, JwtUtil jwtUtil,
                       PasswordEncoder passwordEncoder,
                       IntentosLoginService intentosLoginService,
                       DobleFactorService dobleFactorService) {
        this.usuarioRepository = usuarioRepository;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
        this.intentosLoginService = intentosLoginService;
        this.dobleFactorService = dobleFactorService;
    }

    public LoginResponse login(LoginRequest request, String ip) {
        // Antes de mirar nada: si vienen de fallar muchas veces, ni se intenta.
        intentosLoginService.verificar(request.getUsername(), ip);

        Usuario usuario = usuarioRepository.findByUsername(request.getUsername())
                .orElse(null);

        // Mismo mensaje para usuario inexistente que para contraseña equivocada: si
        // fueran distintos, probando nombres se averigua quiénes tienen cuenta.
        if (usuario == null || !passwordEncoder.matches(request.getPassword(), usuario.getPassword())) {
            intentosLoginService.registrarFallo(request.getUsername(), ip);
            throw new RuntimeException("Usuario o contraseña incorrectos");
        }

        // Recién con la contraseña correcta tiene sentido explicar que está inactivo:
        // así el aviso le sirve al empleado sin revelarle nada a un extraño.
        if (!usuario.getActivo()) {
            throw new RuntimeException("Usuario inactivo");
        }

        intentosLoginService.registrarExito(request.getUsername(), ip);

        // Con segundo factor la contraseña sola no abre nada: se devuelve el
        // desafío y el token recién sale al verificar el código.
        if (usuario.usaDobleFactor()) {
            LoginResponse pendiente = new LoginResponse(null, usuario.getUsername(), usuario.getNombre(),
                    usuario.getRol().name(), usuario.getSucursalId(), usuario.getSucursalNombre());
            pendiente.setRequiereCodigo(true);
            pendiente.setDesafioId(dobleFactorService.iniciar(usuario));
            pendiente.setCorreoPista(taparCorreo(usuario.getEmail()));
            return pendiente;
        }

        return conToken(usuario);
    }

    /**
     * Segundo paso del login: el código que llegó al correo.
     *
     * Vuelve a comprobar que el usuario siga activo: entre que pidió el código y
     * lo escribió pudieron desactivarlo, y esos minutos no deberían alcanzarle
     * para entrar.
     */
    public LoginResponse verificarCodigo(String desafioId, String codigo) {
        String usuarioId = dobleFactorService.verificar(desafioId, codigo);

        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RuntimeException("La cuenta ya no existe"));
        if (!usuario.getActivo())
            throw new RuntimeException("Usuario inactivo");

        return conToken(usuario);
    }

    private LoginResponse conToken(Usuario usuario) {
        String token = jwtUtil.generateToken(usuario.getUsername(), usuario.getRol().name());
        return new LoginResponse(token, usuario.getUsername(), usuario.getNombre(), usuario.getRol().name(),
                usuario.getSucursalId(), usuario.getSucursalNombre());
    }

    /**
     * "ra…z@gmail.com": recuerda a cuál correo mirar sin mostrarlo entero.
     *
     * Quien acertó la contraseña ya sabe de quién es la cuenta, pero el correo
     * completo es un dato más que regalar si esa contraseña estaba robada.
     */
    static String taparCorreo(String email) {
        if (email == null || !email.contains("@")) return "tu correo";
        String[] p = email.split("@", 2);
        String u = p[0];
        String visible = u.length() <= 2 ? u.substring(0, 1) : u.substring(0, 2);
        return visible + "…" + u.charAt(u.length() - 1) + "@" + p[1];
    }
}