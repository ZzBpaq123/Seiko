package com.seiko.work.service.impl;

import com.seiko.work.base.ResultCode;
import com.seiko.work.config.MailServerPolicy;
import com.seiko.work.entity.Mail;
import com.seiko.work.vo.MailMessageVO;
import com.seiko.work.exception.BusinessException;
import com.seiko.work.service.MailMessageService;
import com.seiko.work.service.MailService;
import jakarta.mail.Address;
import jakarta.mail.BodyPart;
import jakarta.mail.Flags;
import jakarta.mail.Folder;
import jakarta.mail.Message;
import jakarta.mail.MessagingException;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.Store;
import jakarta.mail.FetchProfile;
import jakarta.mail.internet.ContentType;
import jakarta.mail.internet.InternetAddress;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.angus.mail.imap.IMAPFolder;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Properties;

/**
 * 邮件 Service 实现（通过 IMAP 实时获取，不持久化）
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MailMessageServiceImpl implements MailMessageService {

    private static final String INBOX = "INBOX";

    /** IMAP 连接超时（毫秒）：服务器不可达时快速失败，避免线程无限阻塞 */
    private static final String IMAP_CONNECTION_TIMEOUT = "5000";

    /** IMAP 读写超时（毫秒） */
    private static final String IMAP_READ_TIMEOUT = "10000";

    /** 单段正文最大读取字节数（1MB），超出截断 */
    private static final int MAX_TEXT_BYTES = 1024 * 1024;

    /** multipart 递归解析最大深度，防止恶意深层嵌套导致栈溢出 */
    private static final int MAX_PARSE_DEPTH = 10;

    private final MailService mailService;
    private final MailServerPolicy mailServerPolicy;

    @Override
    public List<MailMessageVO> listRecent(Long userId, int limit) {
        Mail account = requireAccount(userId);
        try (Store store = connect(account); Folder folder = store.getFolder(INBOX)) {
            folder.open(Folder.READ_ONLY);
            int count = folder.getMessageCount();
            if (count == 0) {
                return List.of();
            }
            // 只取最近的 limit 封，倒序窗口 [start, count]
            int start = Math.max(1, count - limit + 1);
            Message[] messages = folder.getMessages(start, count);
            // 批量拉取信封与标志，避免逐封往返
            FetchProfile profile = new FetchProfile();
            profile.add(FetchProfile.Item.ENVELOPE);
            profile.add(FetchProfile.Item.FLAGS);
            folder.fetch(messages, profile);
            List<MailMessageVO> list = new ArrayList<>(messages.length);
            for (Message message : messages) {
                list.add(parseMessage(message, false));
            }
            list.sort(Comparator.comparing(MailMessageVO::getReceiveTime,
                    Comparator.nullsLast(Comparator.naturalOrder())).reversed());
            return list;
        } catch (MessagingException | IOException e) {
            // 底层异常可能包含服务器地址、认证细节，仅记录日志，不向客户端透出
            log.error("获取邮件列表失败", e);
            throw new BusinessException("获取邮件失败，请检查邮箱配置");
        }
    }

    @Override
    public MailMessageVO getDetail(Long userId, String messageUid) {
        Mail account = requireAccount(userId);
        try (Store store = connect(account); Folder folder = store.getFolder(INBOX)) {
            folder.open(Folder.READ_ONLY);
            Message message = getMessageByUid(folder, messageUid);
            if (message == null) {
                throw new BusinessException(ResultCode.NOT_FOUND);
            }
            return parseMessage(message, true);
        } catch (MessagingException | IOException e) {
            log.error("获取邮件详情失败", e);
            throw new BusinessException("获取邮件失败，请检查邮箱配置");
        }
    }

    @Override
    public void markRead(Long userId, String messageUid) {
        Mail account = requireAccount(userId);
        try (Store store = connect(account); Folder folder = store.getFolder(INBOX)) {
            folder.open(Folder.READ_WRITE);
            Message message = getMessageByUid(folder, messageUid);
            if (message == null) {
                throw new BusinessException(ResultCode.NOT_FOUND);
            }
            message.setFlags(new Flags(Flags.Flag.SEEN), true);
        } catch (MessagingException e) {
            log.error("标记邮件已读失败", e);
            throw new BusinessException("获取邮件失败，请检查邮箱配置");
        }
    }

    private Mail requireAccount(Long userId) {
        Mail account = mailService.getByUserId(userId);
        if (account == null) {
            throw new BusinessException("未配置邮箱账号，请先保存邮箱授权信息");
        }
        return account;
    }

    private Store connect(Mail account) throws MessagingException {
        mailServerPolicy.validate(account);
        Properties props = new Properties();
        props.put("mail.store.protocol", "imap");
        props.put("mail.imap.host", account.getImapHost());
        props.put("mail.imap.port", String.valueOf(account.getImapPort()));
        props.put("mail.imap.ssl.enable", String.valueOf(!Boolean.FALSE.equals(account.getSslEnable())));
        props.put("mail.imap.connectiontimeout", IMAP_CONNECTION_TIMEOUT);
        props.put("mail.imap.timeout", IMAP_READ_TIMEOUT);
        // 读取邮件时不自动设置已读标记
        props.put("mail.imap.peek", "true");
        props.put("mail.imap.ssl.checkserveridentity", "true");
        props.put("mail.imap.writetimeout", IMAP_READ_TIMEOUT);
        Session session = Session.getInstance(props);
        Store store = session.getStore("imap");
        try {
            store.connect(account.getImapHost(), account.getImapPort(), account.getEmail(), account.getAuthCode());
        } catch (MessagingException e) {
            try { store.close(); } catch (MessagingException ignored) { }
            throw e;
        }
        return store;
    }

    private Message getMessageByUid(Folder folder, String messageUid) throws MessagingException {
        final long uid;
        try {
            uid = Long.parseLong(messageUid);
        } catch (NumberFormatException e) {
            throw new BusinessException(ResultCode.PARAM_ERROR.getCode(), "邮件UID格式错误");
        }
        return ((IMAPFolder) folder).getMessageByUID(uid);
    }

    private MailMessageVO parseMessage(Message message, boolean withContent) throws MessagingException, IOException {
        MailMessageVO mail = new MailMessageVO();
        if (message.getFolder() instanceof IMAPFolder imapFolder) {
            mail.setMessageUid(String.valueOf(imapFolder.getUID(message)));
        }
        Address[] from = message.getFrom();
        if (from != null && from.length > 0 && from[0] instanceof InternetAddress address) {
            mail.setFromAddress(address.getAddress());
            mail.setFromName(address.getPersonal());
        }
        mail.setSubject(message.getSubject());
        mail.setReceiveTime(message.getReceivedDate() != null
                ? message.getReceivedDate() : message.getSentDate());
        mail.setIsRead(message.isSet(Flags.Flag.SEEN));
        if (withContent) {
            parseContent(message, mail, 0);
        } else {
            // 列表场景不下载正文，仅按结构预判附件标志（精确判断见详情接口）
            mail.setHasAttachment(predictHasAttachment(message));
        }
        return mail;
    }

    /**
     * 不下载正文预判是否有附件：整封附件、multipart/mixed（RFC 2046 中附件标准容器）
     */
    private boolean predictHasAttachment(Message message) throws MessagingException {
        return message.getFileName() != null
                || Part.ATTACHMENT.equalsIgnoreCase(message.getDisposition())
                || message.isMimeType("multipart/mixed");
    }

    /**
     * 递归解析正文内容，text/plain 优先作为纯文本正文，text/html 保存原始HTML
     */
    private void parseContent(Part part, MailMessageVO mail, int depth) throws MessagingException, IOException {
        if (depth > MAX_PARSE_DEPTH) {
            return;
        }
        if (part.isMimeType("text/plain") && mail.getContentText() == null) {
            mail.setContentText(readTextContent(part));
            return;
        }
        if (part.isMimeType("text/html") && mail.getContentHtml() == null) {
            mail.setContentHtml(readTextContent(part));
            return;
        }
        if (part.isMimeType("multipart/*")) {
            Multipart multipart = (Multipart) part.getContent();
            for (int i = 0; i < multipart.getCount(); i++) {
                BodyPart bodyPart = multipart.getBodyPart(i);
                if (isAttachment(bodyPart)) {
                    mail.setHasAttachment(true);
                }
                parseContent(bodyPart, mail, depth + 1);
            }
        }
    }

    /**
     * 读取 text/* 内容，最多读 MAX_TEXT_BYTES 字节，超出截断，防止超大正文撑爆内存
     */
    private String readTextContent(Part part) throws IOException, MessagingException {
        try (InputStream in = part.getInputStream();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int remaining = MAX_TEXT_BYTES;
            int read;
            while (remaining > 0 && (read = in.read(buffer, 0, Math.min(buffer.length, remaining))) != -1) {
                out.write(buffer, 0, read);
                remaining -= read;
            }
            String charset = new ContentType(part.getContentType()).getParameter("charset");
            return out.toString(charset != null ? charset : "UTF-8");
        }
    }

    private boolean isAttachment(Part part) throws MessagingException {
        return part.getFileName() != null
                || Part.ATTACHMENT.equalsIgnoreCase(part.getDisposition());
    }

}
