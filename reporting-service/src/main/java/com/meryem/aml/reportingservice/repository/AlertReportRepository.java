package com.meryem.aml.reportingservice.repository;

import com.meryem.aml.reportingservice.entity.AlertReport;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlertReportRepository extends JpaRepository<AlertReport, Long> {
}