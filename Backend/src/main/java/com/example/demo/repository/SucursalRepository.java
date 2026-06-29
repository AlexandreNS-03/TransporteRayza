package com.example.demo.repository;

import com.example.demo.model.Sucursal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SucursalRepository extends JpaRepository<Sucursal, String> {

    List<Sucursal> findAllByOrderByNombreAsc();
    List<Sucursal> findByActivoTrue();
}