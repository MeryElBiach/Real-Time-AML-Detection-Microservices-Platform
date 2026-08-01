package com.meryem.aml.alertsservice.repository;

import com.meryem.aml.alertsservice.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlertRepository extends JpaRepository<Alert, Long> {
}