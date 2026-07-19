package com.example.demo.repository;

import com.example.demo.model.Notificacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificacionRepository extends JpaRepository<Notificacion, String> {

    List<Notificacion> findByModuloOrderByCreatedAtDesc(String modulo);
}
