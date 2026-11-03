import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.*;
import java.util.*;

/** Offline administrative migration. Default is a rollback-only verification run. */
public class RotateMailKey {
    private static final byte[] AAD = "seiko:work_mail:auth_code".getBytes(StandardCharsets.UTF_8);
    private static final SecureRandom RANDOM = new SecureRandom();
    record Row(long id, String ciphertext) { }

    public static void main(String[] args) throws Exception {
        if (args.length == 1 && "--self-test".equals(args[0])) {
            selfTest();
            return;
        }
        if (args.length > 1 || (args.length == 1 && !"--apply".equals(args[0]))) {
            throw new IllegalArgumentException("Use no arguments for dry run, or --apply after backup and shutdown");
        }
        boolean apply = args.length == 1;
        String oldKey = required("OLD_CRYPTO_KEY");
        String newKey = required("CRYPTO_KEY");
        if (newKey.trim().length() < 32 || oldKey.trim().equals(newKey.trim())) {
            throw new IllegalArgumentException("New key must be different and at least 32 characters");
        }
        Properties properties = new Properties();
        properties.setProperty("user", required("MYSQL_USERNAME"));
        properties.setProperty("password", required("MYSQL_PASSWORD"));
        try (Connection connection = DriverManager.getConnection(required("ROTATION_JDBC_URL"), properties)) {
            connection.setAutoCommit(false);
            try {
                List<Row> rows = new ArrayList<>();
                try (Statement statement = connection.createStatement();
                     ResultSet results = statement.executeQuery("SELECT id, auth_code FROM work_mail FOR UPDATE")) {
                    while (results.next()) rows.add(new Row(results.getLong(1), results.getString(2)));
                }
                try (PreparedStatement update = connection.prepareStatement("UPDATE work_mail SET auth_code=? WHERE id=?")) {
                    for (Row row : rows) {
                        String plaintext = decrypt(row.ciphertext(), oldKey);
                        String encrypted = encrypt(plaintext, newKey);
                        if (!plaintext.equals(decrypt(encrypted, newKey))) throw new IllegalStateException("Verification failed");
                        if (apply) {
                            update.setString(1, encrypted);
                            update.setLong(2, row.id());
                            if (update.executeUpdate() != 1) throw new IllegalStateException("Unexpected update count");
                        }
                    }
                }
                if (apply) connection.commit(); else connection.rollback();
                System.out.println((apply ? "Migrated " : "Dry run verified ") + rows.size() + " mail accounts");
            } catch (Exception e) {
                connection.rollback();
                // Do not print database exceptions that may contain connection details.
                throw new IllegalStateException("Migration failed; transaction rolled back. Check keys and database configuration.");
            }
        }
    }

    private static String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) throw new IllegalArgumentException("Missing environment variable: " + name);
        return value;
    }
    private static Cipher cipher(int mode, String key, byte[] nonce) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(key.trim().getBytes(StandardCharsets.UTF_8));
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(mode, new SecretKeySpec(digest, "AES"), new GCMParameterSpec(128, nonce));
        cipher.updateAAD(AAD);
        return cipher;
    }
    private static String decrypt(String encoded, String key) throws Exception {
        byte[] data = Base64.getDecoder().decode(encoded);
        if (data.length < 28) throw new IllegalArgumentException("Invalid ciphertext");
        return new String(cipher(Cipher.DECRYPT_MODE, key, Arrays.copyOf(data, 12))
                .doFinal(data, 12, data.length - 12), StandardCharsets.UTF_8);
    }
    private static String encrypt(String text, String key) throws Exception {
        byte[] nonce = new byte[12]; RANDOM.nextBytes(nonce);
        byte[] encrypted = cipher(Cipher.ENCRYPT_MODE, key, nonce).doFinal(text.getBytes(StandardCharsets.UTF_8));
        byte[] data = Arrays.copyOf(nonce, nonce.length + encrypted.length);
        System.arraycopy(encrypted, 0, data, nonce.length, encrypted.length);
        return Base64.getEncoder().encodeToString(data);
    }
    private static void selfTest() throws Exception {
        String oldKey = "legacy-test-key", newKey = "new-test-key-with-at-least-32-characters";
        String value = "test-mail-authorization";
        String migrated = encrypt(decrypt(encrypt(value, oldKey), oldKey), newKey);
        if (!value.equals(decrypt(migrated, newKey))) throw new AssertionError("Roundtrip failed");
        try { decrypt(migrated, oldKey); throw new AssertionError("Wrong key accepted"); }
        catch (javax.crypto.AEADBadTagException expected) { }
        byte[] data = Base64.getDecoder().decode(migrated); data[data.length - 1] ^= 1;
        try { decrypt(Base64.getEncoder().encodeToString(data), newKey); throw new AssertionError("Tampering accepted"); }
        catch (javax.crypto.AEADBadTagException expected) { }
        System.out.println("Key rotation self-test passed");
    }
}
