package com.example.demo.repository;

import com.example.demo.model.RecargaWallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RecargaWalletRepository extends JpaRepository<RecargaWallet, String> {
    Optional<RecargaWallet> findByIdAndClienteEmailIgnoreCase(String id, String clienteEmail);
}
