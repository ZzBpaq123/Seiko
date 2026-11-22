package com.seiko.blog.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.seiko.common.constant.RedisConstant;
import com.seiko.blog.entity.Book;
import com.seiko.blog.mapper.BookMapper;
import com.seiko.blog.service.BookService;
import com.seiko.blog.vo.BookVO;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 书籍服务实现
 */
@Service
@RequiredArgsConstructor
public class BookServiceImpl implements BookService {

    private final BookMapper bookMapper;

    @Override
    @Cacheable(cacheNames = RedisConstant.CACHE_BOOK, key = "'all'")
    public List<BookVO> getBookList() {
        return bookMapper.selectList(
                new LambdaQueryWrapper<Book>()
                        .orderByDesc(Book::getId)
        ).stream().map(this::convertToVO).collect(Collectors.toList());
    }

    private BookVO convertToVO(Book book) {
        if (book == null) {
            return null;
        }
        BookVO bookVO = new BookVO();
        bookVO.setId(book.getId());
        bookVO.setBookName(book.getBookName());
        bookVO.setBookAuthor(book.getBookAuthor());
        bookVO.setDescription(book.getDescription());
        bookVO.setBookCover(book.getBookCover());
        return bookVO;
    }
}
