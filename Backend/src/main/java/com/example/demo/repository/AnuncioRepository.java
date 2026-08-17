package com.example.demo.repository;

import com.example.demo.model.Anuncio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnuncioRepository extends JpaRepository<Anuncio, String> {
    List<Anuncio> findAllByOrderByCreatedAtDesc();
    List<Anuncio> findByTipoAndActivoTrue(Anuncio.Tipo tipo);
}
