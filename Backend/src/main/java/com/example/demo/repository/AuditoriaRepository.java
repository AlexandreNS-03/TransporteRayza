package com.example.demo.repository;

import com.example.demo.model.Auditoria;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditoriaRepository extends JpaRepository<Auditoria, String> {

    List<Auditoria> findTop500ByOrderByCreatedAtDesc();
}
