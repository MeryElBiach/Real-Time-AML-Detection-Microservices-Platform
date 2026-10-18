package com.meryem.aml.alertsservice.controller;

import com.meryem.aml.alertsservice.entity.Alert;
import com.meryem.aml.alertsservice.entity.AlertStatus;
import com.meryem.aml.alertsservice.repository.AlertRepository;
import com.meryem.aml.alertsservice.service.AlertPublisher;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AlertStatusTest {
    @Test void everyDecisionIsSavedBeforeItIsPublished() {
        var repository = mock(AlertRepository.class);
        var publisher = mock(AlertPublisher.class);
        var controller = new AlertController(repository, publisher);
        var alert = new Alert();
        alert.setId(12L);
        when(repository.findById(12L)).thenReturn(Optional.of(alert));
        when(repository.save(alert)).thenReturn(alert);
        for (var status : AlertStatus.values()) {
            assertSame(alert, controller.updateStatus(12L, status));
            assertEquals(status, alert.getStatus());
        }
        var order = inOrder(repository, publisher);
        for (var ignored : AlertStatus.values()) {
            order.verify(repository).save(alert);
            order.verify(publisher).publish(alert);
        }
    }

    @Test void invalidRequestsDoNotPublish() {
        var repository = mock(AlertRepository.class);
        var publisher = mock(AlertPublisher.class);
        var controller = new AlertController(repository, publisher);
        assertThrows(ResponseStatusException.class, () -> controller.updateStatus(12L, null));
        assertThrows(ResponseStatusException.class, () -> controller.updateStatus(12L, AlertStatus.PENDING));
        verifyNoInteractions(publisher);
    }
}
