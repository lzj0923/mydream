package com.mydream.cms.shared;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.net.URI;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(org.springframework.dao.DataAccessException.class)
    ResponseEntity<ProblemDetail> handleDatabase(org.springframework.dao.DataAccessException exception, HttpServletRequest request) {
        log.error("Database operation failed for {}", request.getRequestURI(), exception);
        var detail = ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE, "資料服務暫時無法使用，請稍後重試");
        detail.setTitle("DATA_SERVICE_UNAVAILABLE");
        detail.setProperty("code", "DATA_SERVICE_UNAVAILABLE");
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(detail);
    }

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ProblemDetail> handleApi(ApiException exception, HttpServletRequest request) {
        var detail = ProblemDetail.forStatusAndDetail(exception.status(), exception.getMessage());
        detail.setTitle(exception.code());
        detail.setType(URI.create("https://api.mydream.example/problems/" + exception.code().toLowerCase().replace('_', '-')));
        detail.setProperty("code", exception.code());
        detail.setProperty("path", request.getRequestURI());
        return ResponseEntity.status(exception.status()).body(detail);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ProblemDetail> handleValidation(MethodArgumentNotValidException exception) {
        var detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "请求字段校验失败");
        detail.setTitle("VALIDATION_ERROR");
        detail.setProperty("code", "VALIDATION_ERROR");
        detail.setProperty("fieldErrors", exception.getBindingResult().getFieldErrors().stream()
                .map(error -> Map.of("field", error.getField(), "message", error.getDefaultMessage() == null ? "字段无效" : error.getDefaultMessage()))
                .toList());
        return ResponseEntity.badRequest().body(detail);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ProblemDetail> handleConstraint(ConstraintViolationException exception) {
        var detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "请求参数校验失败");
        detail.setTitle("VALIDATION_ERROR");
        detail.setProperty("code", "VALIDATION_ERROR");
        detail.setProperty("violations", List.copyOf(exception.getConstraintViolations()).stream()
                .map(violation -> violation.getPropertyPath() + ": " + violation.getMessage()).toList());
        return ResponseEntity.badRequest().body(detail);
    }
}
