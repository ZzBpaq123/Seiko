package com.seiko.blog.service;

import com.seiko.blog.vo.AlbumVO;

import java.util.List;

/**
 * 相册服务接口
 */
public interface AlbumService {

    /**
     * 获取相册列表
     *
     * @return 相册列表
     */
    List<AlbumVO> getAlbumList();
}
