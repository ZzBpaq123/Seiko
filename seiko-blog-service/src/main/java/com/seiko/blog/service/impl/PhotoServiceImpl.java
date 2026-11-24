package com.seiko.blog.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.seiko.common.constant.RedisConstant;
import com.seiko.common.exception.BusinessException;
import com.seiko.blog.entity.Photo;
import com.seiko.blog.mapper.PhotoMapper;
import com.seiko.blog.service.PhotoService;
import com.seiko.blog.vo.PhotoVO;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 相册服务实现
 */
@Service
@RequiredArgsConstructor
public class PhotoServiceImpl extends ServiceImpl<PhotoMapper, Photo> implements PhotoService {

    private final PhotoMapper photoMapper;

    @Override
    @Cacheable(cacheNames = RedisConstant.CACHE_PHOTO, key = "'all'")
    public List<PhotoVO> getPhotoList() {
        return photoMapper.selectList(
                new LambdaQueryWrapper<Photo>()
                    .orderByAsc(Photo::getSortOrder)
                    .orderByDesc(Photo::getId)
        ).stream().map(this::convertToVO).collect(Collectors.toList());
    }

    @Override
    @Cacheable(cacheNames = RedisConstant.CACHE_PHOTO, key = "'id:' + #id", unless = "#result == null")
    public PhotoVO getPhotoById(Long id) {
        Photo photo = photoMapper.selectById(id);
        if (photo == null || photo.getIsDeleted() == 1) {
            throw new BusinessException(500, "图片不存在");
        }
        return convertToVO(photo);
    }

    @Override
    @Cacheable(cacheNames = RedisConstant.CACHE_PHOTO, key = "'location:' + #location")
    public List<PhotoVO> getPhotoListByLocation(String location) {
        return photoMapper.selectList(
                new LambdaQueryWrapper<Photo>()
                    .eq(Photo::getPhotoLocation, location)
                    .orderByAsc(Photo::getSortOrder)
                    .orderByDesc(Photo::getId)
        ).stream().map(this::convertToVO).collect(Collectors.toList());
    }

    @Override
    @Cacheable(cacheNames = RedisConstant.CACHE_PHOTO, key = "'album:' + #albumId")
    public List<PhotoVO> getPhotosByAlbumId(Long albumId) {
        return photoMapper.selectList(
                new LambdaQueryWrapper<Photo>()
                    .eq(Photo::getAlbumId, albumId)
                    .orderByAsc(Photo::getSortOrder)
                    .orderByDesc(Photo::getId)
        ).stream().map(this::convertToVO).collect(Collectors.toList());
    }

    private PhotoVO convertToVO(Photo photo) {
        if (photo == null) {
            return null;
        }
        PhotoVO vo = new PhotoVO();
        vo.setId(photo.getId());
        vo.setAlbumId(photo.getAlbumId());
        vo.setPhotoSrc(photo.getPhotoSrc());
        vo.setPhotoAlt(photo.getPhotoAlt());
        vo.setPhotoWidth(photo.getPhotoWidth());
        vo.setPhotoHeight(photo.getPhotoHeight());
        vo.setPhotoTitle(photo.getPhotoTitle());
        vo.setPhotoLocation(photo.getPhotoLocation());
        vo.setPhotoDate(photo.getPhotoDate());
        vo.setSortOrder(photo.getSortOrder());
        vo.setCreateTime(photo.getCreateTime());
        return vo;
    }
}
