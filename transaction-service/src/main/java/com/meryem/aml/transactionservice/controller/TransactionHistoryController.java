package com.meryem.aml.transactionservice.controller;

import com.meryem.aml.transactionservice.service.HistoryContextService;
import com.meryem.aml.transactionservice.service.HistoryContextService.HistoryContext;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/transactions")
public class TransactionHistoryController {

    private final HistoryContextService service;

    public TransactionHistoryController(HistoryContextService service) {
        this.service = service;
    }

    @GetMapping("/{transactionId}/context")
    public HistoryContext getContext(
            @PathVariable String transactionId) {

        if (transactionId.isBlank() || transactionId.length() > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant de transaction invalide.");
        }

        return service.read(transactionId).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Transaction absente de l'historique."));
    }
}