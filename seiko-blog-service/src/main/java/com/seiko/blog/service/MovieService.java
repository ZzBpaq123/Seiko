package com.seiko.blog.service;

import com.seiko.blog.vo.MovieVO;

import java.util.List;

public interface MovieService {

    /**
     * 获取电影列表
     *
     * @return 电影列表
     */
    List<MovieVO> getMovieList();
}
