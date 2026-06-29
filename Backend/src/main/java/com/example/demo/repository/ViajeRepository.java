package com.example.demo.repository;

import com.example.demo.model.Viaje;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ViajeRepository extends JpaRepository<Viaje, String> {

    List<Viaje> findAllByOrderByFechaSalidaDesc();
}