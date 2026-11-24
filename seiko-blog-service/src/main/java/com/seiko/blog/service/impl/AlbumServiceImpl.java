package com.seiko.blog.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.seiko.common.constant.RedisConstant;
import com.seiko.blog.entity.Album;
import com.seiko.blog.mapper.AlbumMapper;
import com.seiko.blog.service.AlbumService;
import com.seiko.blog.vo.AlbumVO;
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
public class AlbumServiceImpl extends ServiceImpl<AlbumMapper, Album> implements AlbumService {

    private final AlbumMapper albumMapper;

    @Override
    @Cacheable(cacheNames = RedisConstant.CACHE_ALBUM, key = "'all'")
    public List<AlbumVO> getAlbumList() {
        return albumMapper.selectList(
                new LambdaQueryWrapper<Album>()
                    .orderByDesc(Album::getCreateTime)
        ).stream().map(this::convertToVO).collect(Collectors.toList());
    }

    private AlbumVO convertToVO(Album album) {
        if (album == null) {
            return null;
        }
        AlbumVO vo = new AlbumVO();
        vo.setId(album.getId());
        vo.setAlbumName(album.getAlbumName());
        vo.setAlbumDesc(album.getAlbumDesc());
        vo.setAlbumCover(album.getAlbumCover());
        vo.setAlbumTime(album.getAlbumTime());
        return vo;
    }
}
