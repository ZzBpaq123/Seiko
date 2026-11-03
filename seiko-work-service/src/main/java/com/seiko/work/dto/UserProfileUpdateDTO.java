package com.seiko.work.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

/**
 * 修改用户信息（头像、用户名、邮箱、手机号）请求参数
 */
@Data
@Schema(description = "修改用户信息请求参数")
public class UserProfileUpdateDTO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Size(min = 2, max = 30, message = "用户名长度必须在2-30之间")
    @Schema(description = "用户名", requiredMode = Schema.RequiredMode.REQUIRED)
    private String username;

    @Email(message = "邮箱格式不正确")
    @Schema(description = "邮箱")
    @Size(max = 100)
    private String email;

    @Pattern(regexp = "^$|^1[3-9]\\d{9}$", message = "手机号格式不正确")
    @Schema(description = "手机号")
    private String phone;

    @Schema(description = "头像")
    private String avatar;

    @Size(min = 6, max = 6, message = "验证码必须为6位")
    @Schema(description = "新邮箱验证码（修改邮箱时必填，发送至新邮箱）")
    private String emailCode;

    @Size(min = 6, max = 6, message = "验证码必须为6位")
    @Schema(description = "新手机号验证码（修改手机号时必填，发送至新手机号）")
    private String phoneCode;

}
