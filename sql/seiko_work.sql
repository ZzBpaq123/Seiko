/*
 Navicat Premium Data Transfer

 Source Server         : localhost
 Source Server Type    : MySQL
 Source Server Version : 80410 (8.4.10)
 Source Host           : localhost:3306
 Source Schema         : seiko_work

 Target Server Type    : MySQL
 Target Server Version : 80410 (8.4.10)
 File Encoding         : 65001

 Date: 30/10/2026 14:27:20
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for work_bill
-- ----------------------------
DROP TABLE IF EXISTS `work_bill`;
CREATE TABLE `work_bill`  (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `category` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '分类',
  `type` tinyint NOT NULL DEFAULT 0 COMMENT '账单类型：0-支出，1-收入',
  `amount` decimal(12, 2) NOT NULL COMMENT '金额（元），恒为正数，收支方向由 type 决定',
  `bill_date` date NOT NULL COMMENT '账单日期（日/周/月/年统计均基于该字段）',
  `payment_method` tinyint NOT NULL DEFAULT 0 COMMENT '支付方式：0-其他，1-现金，2-微信，3-支付宝，4-储蓄卡，5-信用卡',
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '备注',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted` tinyint NOT NULL DEFAULT 0 COMMENT '逻辑删除标志：0-未删除，1-已删除',
  `delete_time` datetime NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user_date`(`user_id` ASC, `bill_date` ASC) USING BTREE,
  INDEX `idx_user_type_date`(`user_id` ASC, `type` ASC, `bill_date` ASC) USING BTREE,
  INDEX `idx_user_category_date`(`user_id` ASC, `bill_date` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '账单明细表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of work_bill
-- ----------------------------
INSERT INTO `work_bill` VALUES (1, 1, '餐饮', 0, 10.00, '2026-10-12', 0, NULL, '2026-10-12 15:47:01', '2026-10-12 15:47:01', 0, NULL);
INSERT INTO `work_bill` VALUES (2, 1, '交通', 0, 30.00, '2026-10-12', 0, NULL, '2026-10-12 15:48:56', '2026-10-12 15:48:56', 0, NULL);
INSERT INTO `work_bill` VALUES (3, 1, '工资', 1, 4413.79, '2026-10-12', 0, NULL, '2026-10-12 15:51:37', '2026-10-12 16:55:55', 1, NULL);
INSERT INTO `work_bill` VALUES (4, 1, '工资', 1, 5000.00, '2026-10-12', 0, NULL, '2026-10-12 17:05:25', '2026-10-12 17:05:25', 0, NULL);

-- ----------------------------
-- Table structure for work_event
-- ----------------------------
DROP TABLE IF EXISTS `work_event`;
CREATE TABLE `work_event`  (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '标题',
  `content` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '内容',
  `start_time` datetime NOT NULL COMMENT '开始时间',
  `end_time` datetime NULL DEFAULT NULL COMMENT '结束时间',
  `is_all_day` tinyint NOT NULL DEFAULT 0 COMMENT '是否全天：0-否，1-是',
  `location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '地点',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted` tinyint NOT NULL DEFAULT 0 COMMENT '逻辑删除标志：0-未删除，1-已删除',
  `delete_time` datetime NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user_start_time`(`user_id` ASC, `start_time` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '日程事件表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of work_event
-- ----------------------------
INSERT INTO `work_event` VALUES (1, 1, 'ceshi', '123', '2026-09-14 00:00:00', '2026-09-14 23:59:59', 1, NULL, '2026-09-14 11:48:36', '2026-09-14 13:39:07', 0, NULL);
INSERT INTO `work_event` VALUES (2, 1, '345', '345', '2026-09-14 00:00:00', '2026-09-19 23:59:59', 1, NULL, '2026-09-14 13:40:07', '2026-09-14 13:40:07', 0, NULL);

-- ----------------------------
-- Table structure for work_mail
-- ----------------------------
DROP TABLE IF EXISTS `work_mail`;
CREATE TABLE `work_mail`  (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '邮箱地址',
  `auth_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '邮箱授权码',
  `imap_host` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'IMAP服务器地址',
  `imap_port` int NOT NULL DEFAULT 993 COMMENT 'IMAP端口',
  `ssl_enable` tinyint NOT NULL DEFAULT 1 COMMENT '是否启用SSL：0-否，1-是',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted` tinyint NOT NULL DEFAULT 0 COMMENT '逻辑删除标志：0-未删除，1-已删除',
  `delete_time` datetime NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_user_id`(`user_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '邮箱账号配置表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of work_mail
-- ----------------------------
INSERT INTO `work_mail` VALUES (2, 1, '1302183481@qq.com', 'lycALnw9WvBsa5nFKVmN9MPXIJeWvSD+9l3Vr0oP5cNii8VSDBUGe5a7iso=', 'imap.qq.com', 993, 1, '2026-09-14 11:16:48', '2026-09-14 11:16:48', 0, NULL);

-- ----------------------------
-- Table structure for work_savings_goal
-- ----------------------------
DROP TABLE IF EXISTS `work_savings_goal`;
CREATE TABLE `work_savings_goal`  (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '每月工资分配' COMMENT '目标名称',
  `buckets` json NOT NULL COMMENT '分配档位数组：[{\"name\":\"储蓄\",\"percent\":70,\"saving\":true}]，percent 合计必须为 100',
  `salary_day` tinyint NULL DEFAULT NULL COMMENT '每月发薪日期(1-31)',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted` tinyint NOT NULL DEFAULT 0 COMMENT '逻辑删除标志：0-未删除，1-已删除',
  `delete_time` datetime NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_user_id`(`user_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '攒钱目标配置表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of work_savings_goal
-- ----------------------------
INSERT INTO `work_savings_goal` VALUES (1, 1, '每月工资分配', '[{\"name\": \"储蓄\", \"saving\": true, \"percent\": 70}, {\"name\": \"日常开销\", \"saving\": false, \"percent\": 20}, {\"name\": \"心愿\", \"saving\": false, \"percent\": 10}]', 1, '2026-10-12 16:53:26', '2026-10-12 16:53:26', 0, NULL);

-- ----------------------------
-- Table structure for work_task
-- ----------------------------
DROP TABLE IF EXISTS `work_task`;
CREATE TABLE `work_task`  (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `mail_id` bigint NULL DEFAULT NULL COMMENT '关联邮件ID',
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '标题',
  `content` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '内容',
  `plan_date` date NULL DEFAULT NULL COMMENT '计划日期',
  `status` tinyint NOT NULL DEFAULT 0 COMMENT '状态：0-待办，1-进行中，2-已完成',
  `priority` tinyint NOT NULL DEFAULT 1 COMMENT '优先级：0-低，1-中，2-高',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted` tinyint NOT NULL DEFAULT 0 COMMENT '逻辑删除标志：0-未删除，1-已删除',
  `delete_time` datetime NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user_plan_date`(`user_id` ASC, `plan_date` ASC) USING BTREE,
  INDEX `idx_user_status`(`user_id` ASC, `status` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '工作事项表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of work_task
-- ----------------------------

-- ----------------------------
-- Table structure for work_user
-- ----------------------------
DROP TABLE IF EXISTS `work_user`;
CREATE TABLE `work_user`  (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户名',
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '密码（BCrypt加密），手机号注册用户可能为空',
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '邮箱',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '手机号',
  `nickname` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '昵称',
  `avatar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '头像URL',
  `status` tinyint NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted` tinyint NOT NULL DEFAULT 0 COMMENT '逻辑删除标志：0-未删除，1-已删除',
  `delete_time` datetime NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_username`(`username` ASC) USING BTREE,
  UNIQUE INDEX `uk_email`(`email` ASC) USING BTREE,
  UNIQUE INDEX `uk_phone`(`phone` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '用户表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of work_user
-- ----------------------------
INSERT INTO `work_user` VALUES (1, 'Seiko', '$2a$10$hi7XkBN6x4TuVYrcOnEmzeP43ovvqUjIsmt3/qTLHIGdTLO0DdsSK', '1302183481@qq.com', NULL, NULL, NULL, 1, '2026-09-09 16:37:01', '2026-09-09 16:37:01', 0, NULL);

SET FOREIGN_KEY_CHECKS = 1;
