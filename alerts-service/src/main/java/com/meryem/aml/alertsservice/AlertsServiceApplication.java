package com.meryem.aml.alertsservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class AlertsServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AlertsServiceApplication.class, args);
    }
}