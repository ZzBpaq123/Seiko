package com.seiko.blog.service;

import com.seiko.blog.vo.BookVO;

import java.util.List;

public interface BookService {

    /**
     * 获取书籍列表
     *
     * @return 书籍列表
     */
    List<BookVO> getBookList();
}
