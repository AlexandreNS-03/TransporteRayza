package com.example.demo;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

@SpringBootApplication
public class DemoApplication {

	public static void main(String[] args) {
		// Railway corre en UTC; sin esto, en la tarde peruana las fechas (fecha de
		// venta del ticket, "hoy" del dashboard, etc.) se adelantan un día.
		TimeZone.setDefault(TimeZone.getTimeZone("America/Lima"));
		SpringApplication.run(DemoApplication.class, args);
	}

	/** Refuerza la zona horaria por si algún componente la reajusta al iniciar. */
	@PostConstruct
	void fijarZonaHoraria() {
		TimeZone.setDefault(TimeZone.getTimeZone("America/Lima"));
	}

}
