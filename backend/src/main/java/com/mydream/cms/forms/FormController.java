package com.mydream.cms.forms;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class FormController {
    private final FormService forms;
    private final FormNotificationService notifications;

    public FormController(FormService forms, FormNotificationService notifications) {
        this.forms = forms;
        this.notifications = notifications;
    }

    @PostMapping("/public-api/v1/sites/{siteKey}/forms/{formKey}/submissions")
    public FormService.SubmissionReceipt submit(@PathVariable String siteKey, @PathVariable String formKey,
                                                @RequestBody FormService.SubmissionRequest request) {
        return forms.submit(siteKey, formKey, request);
    }

    @GetMapping("/admin-api/v1/sites/{siteId}/submissions")
    @PreAuthorize("hasAuthority('submission.read')")
    public List<FormService.SubmissionView> list(@PathVariable String siteId,
                                                 @RequestParam(required = false) String formKey,
                                                 @RequestParam(required = false) String status) {
        return forms.list(siteId, formKey, status);
    }

    @PatchMapping("/admin-api/v1/submissions/{submissionId}")
    @PreAuthorize("hasAuthority('submission.write')")
    public FormService.SubmissionView update(@PathVariable String submissionId,
                                             @RequestBody FormService.StatusRequest request) {
        return forms.updateStatus(submissionId, request);
    }

    @GetMapping("/admin-api/v1/sites/{siteId}/forms/{formKey}/notification")
    @PreAuthorize("hasAuthority('submission.read')")
    public FormNotificationService.NotificationSettings notificationSettings(@PathVariable String siteId,
                                                                              @PathVariable String formKey) {
        return notifications.settings(siteId, formKey);
    }

    @PutMapping("/admin-api/v1/sites/{siteId}/forms/{formKey}/notification")
    @PreAuthorize("hasAuthority('submission.write')")
    public FormNotificationService.NotificationSettings saveNotificationSettings(@PathVariable String siteId,
                                                                                  @PathVariable String formKey,
                                                                                  @RequestBody FormNotificationService.SaveNotificationSettingsRequest request) {
        return notifications.saveSettings(siteId, formKey, request);
    }
}
