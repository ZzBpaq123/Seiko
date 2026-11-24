package com.seiko.work.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.seiko.work.constant.RedisKey;
import com.seiko.common.exception.BusinessException;
import com.seiko.work.service.HolidayService;
import com.seiko.work.vo.HolidayVO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * 节假日 Service 实现
 * 数据源：https://holiday.ailcc.com/api/holiday/allyear/{year}
 * 第三方 API 不支持浏览器跨域调用，故由服务端代理；结果按年缓存到 Redis（3 天）
 */
@Slf4j
@Service
public class HolidayServiceImpl implements HolidayService {

    private static final Duration CACHE_TTL = Duration.ofDays(3);
    private static final String API_BASE_URL = "https://holiday.ailcc.com";
    private static final TypeReference<List<HolidayVO>> HOLIDAY_LIST_TYPE = new TypeReference<>() {
    };

    private final RestClient restClient;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public HolidayServiceImpl(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        this.restClient = RestClient.builder()
                .baseUrl(API_BASE_URL)
                .requestFactory(requestFactory)
                .build();
    }

    @Override
    public List<HolidayVO> getHolidays(int year) {
        String key = RedisKey.HOLIDAY_YEAR.formatted(year);
        String cached = redisTemplate.opsForValue().get(key);
        if (cached != null) {
            try {
                return objectMapper.readValue(cached, HOLIDAY_LIST_TYPE);
            } catch (JsonProcessingException e) {
                log.warn("节假日缓存反序列化失败，key={}，重新拉取", key, e);
            }
        }
        List<HolidayVO> list = fetch(year);
        try {
            redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(list), CACHE_TTL);
        } catch (JsonProcessingException e) {
            log.warn("节假日缓存序列化失败，key={}", key, e);
        }
        return list;
    }

    /**
     * 返回全年每天的信息数组，type：0-工作日 1-周末 2-节日 3-调休放假 4-补班
     * 仅保留 type>=2 的日子（节日、调休放假、补班），普通工作日和周末不返回
     */
    private List<HolidayVO> fetch(int year) {
        JsonNode root;
        try {
            root = restClient.get()
                    .uri("/api/holiday/allyear/{year}", year)
                    .retrieve()
                    .body(JsonNode.class);
        } catch (Exception e) {
            log.error("节假日数据获取失败，year={}", year, e);
            throw new BusinessException("节假日数据获取失败");
        }
        JsonNode data = root == null ? null : root.path("data");
        if (data == null || root.path("code").asInt(-1) != 0 || !data.isArray() || data.isEmpty()) {
            throw new BusinessException("节假日数据获取失败");
        }
        List<HolidayVO> list = new ArrayList<>();
        for (JsonNode node : data) {
            if (node.path("type").asInt(0) < 2) {
                continue;
            }
            HolidayVO vo = objectMapper.convertValue(node, HolidayVO.class);
            if (vo.getName() == null || vo.getName().isBlank()) {
                continue;
            }
            list.add(vo);
        }
        list.sort(Comparator.comparing(HolidayVO::getDate));
        return list;
    }

}
