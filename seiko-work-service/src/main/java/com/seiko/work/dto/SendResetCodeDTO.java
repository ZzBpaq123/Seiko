package com.seiko.work.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import jakarta.validation.constraints.Size;

import java.io.Serial;
import java.io.Serializable;

/**
 * 发送找回密码验证码请求参数
 */
@Data
@Schema(description = "发送找回密码验证码请求参数")
public class SendResetCodeDTO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Email(message = "邮箱格式不正确")
    @Schema(description = "邮箱（邮箱和手机号至少填写一个）")
    @Size(max = 100)
    private String email;

    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确")
    @Schema(description = "手机号（邮箱和手机号至少填写一个）")
    private String phone;

    @AssertTrue(message = "邮箱和手机号至少填写一个")
    public boolean isContactValid() {
        return (email != null && !email.isBlank()) || (phone != null && !phone.isBlank());
    }

}
