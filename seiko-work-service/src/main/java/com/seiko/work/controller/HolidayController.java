package com.seiko.work.controller;

import cn.dev33.satoken.annotation.SaCheckLogin;
import com.seiko.common.result.Result;
import com.seiko.work.service.HolidayService;
import com.seiko.work.vo.HolidayVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 节假日 Controller
 */
@RestController
@RequestMapping("/api/holidays")
@RequiredArgsConstructor
@Validated
@SaCheckLogin
@Tag(name = "节假日", description = "法定节假日查询")
public class HolidayController {

    private final HolidayService holidayService;

    @GetMapping("/{year}")
    @Operation(summary = "查询某年节假日")
    public Result<List<HolidayVO>> getByYear(@PathVariable Integer year) {
        return Result.success(holidayService.getHolidays(year));
    }

}
