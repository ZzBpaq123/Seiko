package com.seiko.blog.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.seiko.common.constant.RedisConstant;
import com.seiko.blog.entity.Movie;
import com.seiko.blog.mapper.MovieMapper;
import com.seiko.blog.service.MovieService;
import com.seiko.blog.vo.MovieVO;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 电影服务实现
 */
@Service
@RequiredArgsConstructor
public class MovieServiceImpl implements MovieService {

    private final MovieMapper movieMapper;

    @Override
    @Cacheable(cacheNames = RedisConstant.CACHE_MOVIE, key = "'all'")
    public List<MovieVO> getMovieList() {
        return movieMapper.selectList(
                new LambdaQueryWrapper<Movie>()
                        .orderByDesc(Movie::getIsTop)
                        .orderByDesc(Movie::getId)
        ).stream().map(this::convertToVO).collect(Collectors.toList());
    }

    private MovieVO convertToVO(Movie movie) {
        if (movie == null) {
            return null;
        }
        MovieVO movieVO = new MovieVO();
        movieVO.setId(movie.getId());
        movieVO.setMovieName(movie.getMovieName());
        movieVO.setIsTop(movie.getIsTop());
        movieVO.setRating(movie.getRating());
        movieVO.setRatingSource(movie.getRatingSource());
        movieVO.setTags(movie.getTags());
        movieVO.setSynopsis(movie.getSynopsis());
        movieVO.setBackdrop(movie.getBackdrop());
        movieVO.setDuration(movie.getDuration());
        return movieVO;
    }
}
