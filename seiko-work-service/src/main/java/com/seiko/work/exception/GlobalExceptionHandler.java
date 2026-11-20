package com.seiko.work.exception;

import cn.dev33.satoken.exception.NotLoginException;
import cn.dev33.satoken.exception.NotPermissionException;
import cn.dev33.satoken.exception.NotRoleException;
import com.seiko.common.exception.HttpStatusErrorHandler;
import com.seiko.common.result.Result;
import com.seiko.common.result.ResultCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler extends HttpStatusErrorHandler {
    @ExceptionHandler(NotLoginException.class)
    public ResponseEntity<Result<Void>> handleNotLoginException(NotLoginException e) {
        return ResponseEntity.status(401).body(Result.error(ResultCode.UNAUTHORIZED));
    }

    @ExceptionHandler({NotRoleException.class, NotPermissionException.class})
    public ResponseEntity<Result<Void>> handleForbidden(Exception e) {
        return ResponseEntity.status(403).body(Result.error(ResultCode.FORBIDDEN));
    }
}
