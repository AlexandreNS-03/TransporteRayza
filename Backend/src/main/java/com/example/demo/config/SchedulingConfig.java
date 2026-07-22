package com.example.demo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Habilita tareas programadas (@Scheduled), p.ej. liberar reservas vencidas. */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
