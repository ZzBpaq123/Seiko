package com.seiko.blog.common;

import com.seiko.common.exception.BodyErrorHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler extends BodyErrorHandler {
}
