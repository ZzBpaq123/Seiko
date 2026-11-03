package com.seiko.work.controller;

import cn.dev33.satoken.annotation.SaCheckLogin;
import com.seiko.work.base.Result;
import com.seiko.work.dto.ChangePasswordDTO;
import com.seiko.work.dto.LoginDTO;
import com.seiko.work.dto.PhoneLoginDTO;
import com.seiko.work.dto.PhoneRegisterDTO;
import com.seiko.work.dto.RegisterDTO;
import com.seiko.work.dto.ResetPasswordDTO;
import com.seiko.work.dto.SendEmailCodeDTO;
import com.seiko.work.dto.SendPhoneCodeDTO;
import com.seiko.work.dto.SendResetCodeDTO;
import com.seiko.work.dto.UserProfileUpdateDTO;
import com.seiko.work.service.AuthService;
import com.seiko.work.vo.LoginVO;
import com.seiko.work.vo.UserVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 认证管理 Controller
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Validated
@Tag(name = "认证管理", description = "用户登录、注册、登出、验证码")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/email/code")
    @Operation(summary = "发送邮箱验证码")
    public Result<Void> sendEmailCode(@Valid @RequestBody SendEmailCodeDTO dto) {
        authService.sendEmailCode(dto);
        return Result.success();
    }

    @PostMapping("/email/bind-code")
    @SaCheckLogin
    public Result<Void> sendBindEmailCode(@Valid @RequestBody SendEmailCodeDTO dto) {
        authService.sendBindEmailCode(dto);
        return Result.success();
    }

    @PostMapping("/phone/bind-code")
    @SaCheckLogin
    public Result<Void> sendBindPhoneCode(@Valid @RequestBody SendPhoneCodeDTO dto) {
        authService.sendBindPhoneCode(dto);
        return Result.success();
    }

    @PostMapping("/email/register")
    @Operation(summary = "用户注册（邮箱+密码）")
    public Result<Void> emailRegister(@Valid @RequestBody RegisterDTO dto) {
        authService.emailRegister(dto);
        return Result.success();
    }

    @PostMapping("/email/login")
    @Operation(summary = "用户登录（邮箱+密码）")
    public Result<LoginVO> emailLogin(@Valid @RequestBody LoginDTO dto) {
        return Result.success(authService.emailLogin(dto));
    }

    @PostMapping("/phone/code")
    @Operation(summary = "发送手机验证码")
    public Result<Void> sendPhoneCode(@Valid @RequestBody SendPhoneCodeDTO dto) {
        authService.sendPhoneCode(dto);
        return Result.success();
    }

    @PostMapping("/phone/register")
    @Operation(summary = "手机号注册")
    public Result<Void> phoneRegister(@Valid @RequestBody PhoneRegisterDTO dto) {
        authService.phoneRegister(dto);
        return Result.success();
    }

    @PostMapping("/phone/login")
    @Operation(summary = "手机号验证码登录")
    public Result<LoginVO> phoneLogin(@Valid @RequestBody PhoneLoginDTO dto) {
        return Result.success(authService.phoneLogin(dto));
    }

    @PostMapping("/password/code")
    @Operation(summary = "发送找回密码验证码（邮箱或手机号）")
    public Result<Void> sendResetCode(@Valid @RequestBody SendResetCodeDTO dto) {
        authService.sendResetCode(dto);
        return Result.success();
    }

    @PostMapping("/password/reset")
    @Operation(summary = "找回密码（通过邮箱或手机验证码重置密码）")
    public Result<Void> resetPassword(@Valid @RequestBody ResetPasswordDTO dto) {
        authService.resetPassword(dto);
        return Result.success();
    }

    @PostMapping("/password/change")
    @SaCheckLogin
    @Operation(summary = "修改密码（需登录，验证原密码）")
    public Result<Void> changePassword(@Valid @RequestBody ChangePasswordDTO dto) {
        authService.changePassword(dto);
        return Result.success();
    }

    @PutMapping("/profile")
    @SaCheckLogin
    @Operation(summary = "修改当前登录用户信息（头像、用户名、邮箱、手机号）")
    public Result<UserVO> updateProfile(@Valid @RequestBody UserProfileUpdateDTO dto) {
        return Result.success(authService.updateProfile(dto));
    }

    @PostMapping("/logout")
    @SaCheckLogin
    @Operation(summary = "用户登出")
    public Result<Void> logout() {
        authService.logout();
        return Result.success();
    }

    @GetMapping("/info")
    @SaCheckLogin
    @Operation(summary = "获取当前登录用户信息")
    public Result<UserVO> info() {
        return Result.success(authService.getCurrentUser());
    }

}
