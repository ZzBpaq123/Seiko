package com.seiko.work.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

/**
 * 找回密码（重置密码）请求参数
 */
@Data
@Schema(description = "找回密码请求参数")
public class ResetPasswordDTO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Email(message = "邮箱格式不正确")
    @Schema(description = "邮箱（邮箱和手机号至少填写一个）")
    @Size(max = 100)
    private String email;

    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确")
    @Schema(description = "手机号（邮箱和手机号至少填写一个）")
    private String phone;

    @NotBlank(message = "验证码不能为空")
    @Size(min = 6, max = 6, message = "验证码必须为6位")
    @Schema(description = "验证码", requiredMode = Schema.RequiredMode.REQUIRED)
    private String code;

    @NotBlank(message = "密码不能为空")
    @Size(min = 6, max = 20, message = "密码长度必须在6-20之间")
    @Schema(description = "新密码", requiredMode = Schema.RequiredMode.REQUIRED)
    private String password;

    @NotBlank(message = "确认密码不能为空")
    @Schema(description = "确认密码", requiredMode = Schema.RequiredMode.REQUIRED)
    private String confirmPassword;

    @AssertTrue(message = "邮箱和手机号至少填写一个")
    public boolean isContactValid() {
        return (email != null && !email.isBlank()) || (phone != null && !phone.isBlank());
    }

    @AssertTrue(message = "两次输入的密码不一致")
    public boolean isPasswordMatch() {
        return password != null && password.equals(confirmPassword);
    }

}
