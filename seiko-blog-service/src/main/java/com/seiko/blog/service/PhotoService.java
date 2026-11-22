package com.seiko.blog.service;

import com.seiko.blog.vo.PhotoVO;

import java.util.List;

/**
 * 相册服务接口
 */
public interface PhotoService {

    /**
     * 获取照片列表
     *
     * @return 相册列表
     */
    List<PhotoVO> getPhotoList();

    /**
     * 获取相册详情
     *
     * @param id 相册ID
     * @return 相册详情
     */
    PhotoVO getPhotoById(Long id);

    /**
     * 根据拍摄地点获取相册列表
     *
     * @param location 拍摄地点
     * @return 相册列表
     */
    List<PhotoVO> getPhotoListByLocation(String location);

    /**
     * 根据相册ID获取照片列表
     *
     * @param albumId 相册ID
     * @return 照片列表
     */
    List<PhotoVO> getPhotosByAlbumId(Long albumId);
}
