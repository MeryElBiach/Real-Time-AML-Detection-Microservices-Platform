package com.meryem.aml.reportingservice.repository;

import com.meryem.aml.reportingservice.entity.AlertReport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AlertReportRepository extends JpaRepository<AlertReport, Long> {
    Optional<AlertReport> findByAlertId(Long alertId);
    Optional<AlertReport> findFirstByTransactionIdAndAlertIdIsNullOrderByIdAsc(String transactionId);
}
