package com.example.demo.repository;

import com.example.demo.model.PreferenciasNotificacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PreferenciasNotificacionRepository
        extends JpaRepository<PreferenciasNotificacion, String> {
}
