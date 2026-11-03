package com.seiko.work.service;

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
import com.seiko.work.vo.LoginVO;
import com.seiko.work.vo.UserVO;

/**
 * 认证 Service
 */
public interface AuthService {

    /**
     * 发送邮箱验证码
     *
     * @param dto 请求参数
     */
    void sendEmailCode(SendEmailCodeDTO dto);

    void sendBindEmailCode(SendEmailCodeDTO dto);

    void sendBindPhoneCode(SendPhoneCodeDTO dto);

    /**
     * 用户注册
     *
     * @param dto 请求参数
     */
    void emailRegister(RegisterDTO dto);

    /**
     * 用户登录
     *
     * @param dto 请求参数
     * @return 登录信息
     */
    LoginVO emailLogin(LoginDTO dto);

    /**
     * 发送手机验证码
     *
     * @param dto 请求参数
     */
    void sendPhoneCode(SendPhoneCodeDTO dto);

    /**
     * 手机号注册
     *
     * @param dto 请求参数
     */
    void phoneRegister(PhoneRegisterDTO dto);

    /**
     * 手机号验证码登录
     *
     * @param dto 请求参数
     * @return 登录信息
     */
    LoginVO phoneLogin(PhoneLoginDTO dto);

    /**
     * 发送找回密码验证码（邮箱或手机号）
     *
     * @param dto 请求参数
     */
    void sendResetCode(SendResetCodeDTO dto);

    /**
     * 找回密码（通过邮箱或手机验证码重置密码）
     *
     * @param dto 请求参数
     */
    void resetPassword(ResetPasswordDTO dto);

    /**
     * 修改密码（已登录用户，需验证原密码）
     *
     * @param dto 请求参数
     */
    void changePassword(ChangePasswordDTO dto);

    /**
     * 修改当前登录用户信息（头像、用户名、邮箱、手机号）
     *
     * @param dto 请求参数
     * @return 更新后的用户信息
     */
    UserVO updateProfile(UserProfileUpdateDTO dto);

    /**
     * 用户登出
     */
    void logout();    /**
     * 获取当前登录用户信息
     *
     * @return 用户信息
     */
    UserVO getCurrentUser();

}
