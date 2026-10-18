package com.meryem.aml.reportingservice.controller;

import com.meryem.aml.reportingservice.dto.StatsResponse;
import com.meryem.aml.reportingservice.service.ReportingStatsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/reports")
public class ReportingController {

    private final ReportingStatsService reportingStatsService;

    public ReportingController(ReportingStatsService reportingStatsService) {
        this.reportingStatsService = reportingStatsService;
    }

    @GetMapping("/stats")
    public StatsResponse getStats() {
        return reportingStatsService.computeStats();
    }
}