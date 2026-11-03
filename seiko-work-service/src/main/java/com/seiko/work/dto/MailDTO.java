package com.seiko.work.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;

import java.io.Serial;
import java.io.Serializable;

/**
 * 邮箱账号配置 DTO
 */
@Data
@Schema(description = "邮箱账号配置请求参数")
public class MailDTO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @NotBlank(message = "邮箱地址不能为空")
    @Schema(description = "邮箱地址", requiredMode = Schema.RequiredMode.REQUIRED)
    @Email
    @Size(max = 100)
    private String email;

    @NotBlank(message = "授权码不能为空")
    @Schema(description = "邮箱授权码", requiredMode = Schema.RequiredMode.REQUIRED)
    @Size(max = 128)
    private String authCode;

    @Schema(description = "IMAP服务器地址，缺省时按邮箱后缀自动识别")
    @Size(max = 100)
    private String imapHost;

    @Schema(description = "IMAP端口，缺省时按邮箱后缀自动识别")
    @Min(1)
    @Max(65535)
    private Integer imapPort;

    @Schema(description = "是否启用SSL，缺省时按邮箱后缀自动识别")
    private Boolean sslEnable;

}
