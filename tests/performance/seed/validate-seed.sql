SET @expected_count := COALESCE(@expected_count, 1000000);
SET @perf_org_id := COALESCE(@perf_org_id, 'openfgc-perf-org');

DELIMITER //

DROP PROCEDURE IF EXISTS validate_perf_seed//
CREATE PROCEDURE validate_perf_seed()
BEGIN
    DECLARE consent_count BIGINT DEFAULT 0;
    DECLARE orphan_count BIGINT DEFAULT 0;
    DECLARE missing_required_count BIGINT DEFAULT 0;
    DECLARE missing_status_count BIGINT DEFAULT 0;
    DECLARE typed_count BIGINT DEFAULT 0;
    DECLARE bucket_count BIGINT DEFAULT 0;

    SELECT COUNT(*) INTO consent_count
    FROM CONSENT
    WHERE ORG_ID = @perf_org_id;

    IF consent_count <> @expected_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'CONSENT row count does not match @expected_count';
    END IF;

    SELECT COUNT(*) INTO orphan_count
    FROM CONSENT_AUTH_RESOURCE ar
    LEFT JOIN CONSENT c ON c.CONSENT_ID = ar.CONSENT_ID
    WHERE ar.ORG_ID = @perf_org_id AND c.CONSENT_ID IS NULL;

    IF orphan_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'CONSENT_AUTH_RESOURCE contains orphan rows';
    END IF;

    SELECT COUNT(*) INTO orphan_count
    FROM CONSENT_ATTRIBUTE a
    LEFT JOIN CONSENT c ON c.CONSENT_ID = a.CONSENT_ID
    WHERE a.ORG_ID = @perf_org_id AND c.CONSENT_ID IS NULL;

    IF orphan_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'CONSENT_ATTRIBUTE contains orphan rows';
    END IF;

    SELECT COUNT(*) INTO orphan_count
    FROM PURPOSE_CONSENT_MAPPING pcm
    LEFT JOIN CONSENT c ON c.CONSENT_ID = pcm.CONSENT_ID
    LEFT JOIN PURPOSE p ON p.VERSION_ID = pcm.PURPOSE_VERSION_ID
    WHERE pcm.ORG_ID = @perf_org_id
      AND (c.CONSENT_ID IS NULL OR p.VERSION_ID IS NULL);

    IF orphan_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'PURPOSE_CONSENT_MAPPING contains orphan rows';
    END IF;

    SELECT COUNT(*) INTO orphan_count
    FROM CONSENT_ELEMENT_APPROVAL cea
    LEFT JOIN PURPOSE_CONSENT_MAPPING pcm
      ON pcm.CONSENT_ID = cea.CONSENT_ID
     AND pcm.PURPOSE_VERSION_ID = cea.PURPOSE_VERSION_ID
    LEFT JOIN PURPOSE_ELEMENT_MAPPING pem
      ON pem.PURPOSE_VERSION_ID = cea.PURPOSE_VERSION_ID
     AND pem.ELEMENT_VERSION_ID = cea.ELEMENT_VERSION_ID
    WHERE cea.ORG_ID = @perf_org_id
      AND (pcm.CONSENT_ID IS NULL OR pem.PURPOSE_VERSION_ID IS NULL);

    IF orphan_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'CONSENT_ELEMENT_APPROVAL contains orphan rows';
    END IF;

    SELECT COUNT(*) INTO missing_required_count
    FROM CONSENT
    WHERE ORG_ID = @perf_org_id
      AND (
        CONSENT_ID IS NULL OR CREATED_TIME IS NULL OR UPDATED_TIME IS NULL
        OR GROUP_ID IS NULL OR GROUP_ID = ''
        OR CONSENT_TYPE IS NULL OR CONSENT_TYPE = ''
        OR CURRENT_STATUS IS NULL OR CURRENT_STATUS = ''
      );

    IF missing_required_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'CONSENT contains rows with missing required columns';
    END IF;

    SELECT COUNT(*) INTO missing_status_count
    FROM (
        SELECT 'ACTIVE' AS status_name
        UNION ALL SELECT 'CREATED'
        UNION ALL SELECT 'EXPIRED'
        UNION ALL SELECT 'REVOKED'
    ) expected
    LEFT JOIN (
        SELECT CURRENT_STATUS, COUNT(*) AS status_count
        FROM CONSENT
        WHERE ORG_ID = @perf_org_id
        GROUP BY CURRENT_STATUS
    ) actual ON actual.CURRENT_STATUS = expected.status_name
    WHERE COALESCE(actual.status_count, 0) = 0;

    IF @expected_count >= 10 AND missing_status_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Status distribution is missing one or more expected statuses';
    END IF;

    SELECT COUNT(*) INTO typed_count
    FROM CONSENT
    WHERE ORG_ID = @perf_org_id
      AND CONSENT_TYPE = 'accounts';
    IF typed_count < ROUND(@expected_count * 0.52) OR typed_count > ROUND(@expected_count * 0.58) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'accounts consent ratio is outside the expected band';
    END IF;

    SELECT COUNT(*) INTO typed_count
    FROM CONSENT
    WHERE ORG_ID = @perf_org_id
      AND CONSENT_TYPE = 'payments';
    IF typed_count < ROUND(@expected_count * 0.27) OR typed_count > ROUND(@expected_count * 0.33) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'payments consent ratio is outside the expected band';
    END IF;

    SELECT COUNT(*) INTO typed_count
    FROM CONSENT
    WHERE ORG_ID = @perf_org_id
      AND CONSENT_TYPE = 'profile-sharing';
    IF typed_count < ROUND(@expected_count * 0.12) OR typed_count > ROUND(@expected_count * 0.18) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'profile-sharing consent ratio is outside the expected band';
    END IF;

    SELECT COUNT(*) INTO typed_count
    FROM CONSENT
    WHERE ORG_ID = @perf_org_id
      AND CURRENT_STATUS = 'ACTIVE';
    IF typed_count < ROUND(@expected_count * 0.67) OR typed_count > ROUND(@expected_count * 0.73) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'ACTIVE status ratio is outside the expected band';
    END IF;

    SELECT COUNT(*) INTO typed_count
    FROM CONSENT
    WHERE ORG_ID = @perf_org_id
      AND CURRENT_STATUS = 'CREATED';
    IF typed_count < ROUND(@expected_count * 0.08) OR typed_count > ROUND(@expected_count * 0.12) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'CREATED status ratio is outside the expected band';
    END IF;

    SELECT COUNT(*) INTO typed_count
    FROM CONSENT
    WHERE ORG_ID = @perf_org_id
      AND CURRENT_STATUS = 'EXPIRED';
    IF typed_count < ROUND(@expected_count * 0.10) OR typed_count > ROUND(@expected_count * 0.14) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'EXPIRED status ratio is outside the expected band';
    END IF;

    SELECT COUNT(*) INTO typed_count
    FROM CONSENT
    WHERE ORG_ID = @perf_org_id
      AND CURRENT_STATUS = 'REVOKED';
    IF typed_count < ROUND(@expected_count * 0.06) OR typed_count > ROUND(@expected_count * 0.10) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'REVOKED status ratio is outside the expected band';
    END IF;

    SELECT COUNT(*) INTO bucket_count
    FROM (
        SELECT CONSENT_ID
        FROM CONSENT_AUTH_RESOURCE
        WHERE ORG_ID = @perf_org_id
        GROUP BY CONSENT_ID
        HAVING COUNT(*) = 1
    ) auth_bucket;
    IF bucket_count < ROUND(@expected_count * 0.79) OR bucket_count > ROUND(@expected_count * 0.85) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'single-authorization consent ratio is outside the expected band';
    END IF;

    SELECT COUNT(*) INTO bucket_count
    FROM (
        SELECT CONSENT_ID
        FROM CONSENT_AUTH_RESOURCE
        WHERE ORG_ID = @perf_org_id
        GROUP BY CONSENT_ID
        HAVING COUNT(*) = 2
    ) auth_bucket;
    IF bucket_count < ROUND(@expected_count * 0.12) OR bucket_count > ROUND(@expected_count * 0.18) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'double-authorization consent ratio is outside the expected band';
    END IF;

    SELECT COUNT(*) INTO bucket_count
    FROM (
        SELECT CONSENT_ID
        FROM CONSENT_AUTH_RESOURCE
        WHERE ORG_ID = @perf_org_id
        GROUP BY CONSENT_ID
        HAVING COUNT(*) = 3
    ) auth_bucket;
    IF bucket_count < ROUND(@expected_count * 0.01) OR bucket_count > ROUND(@expected_count * 0.05) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'triple-authorization consent ratio is outside the expected band';
    END IF;

    SELECT COUNT(*) INTO bucket_count
    FROM (
        SELECT CONSENT_ID
        FROM PURPOSE_CONSENT_MAPPING
        WHERE ORG_ID = @perf_org_id
        GROUP BY CONSENT_ID
        HAVING COUNT(*) = 1
    ) purpose_bucket;
    IF bucket_count < ROUND(@expected_count * 0.52) OR bucket_count > ROUND(@expected_count * 0.58) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'single-purpose consent ratio is outside the expected band';
    END IF;

    SELECT COUNT(*) INTO bucket_count
    FROM (
        SELECT CONSENT_ID
        FROM PURPOSE_CONSENT_MAPPING
        WHERE ORG_ID = @perf_org_id
        GROUP BY CONSENT_ID
        HAVING COUNT(*) = 2
    ) purpose_bucket;
    IF bucket_count < ROUND(@expected_count * 0.27) OR bucket_count > ROUND(@expected_count * 0.33) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'double-purpose consent ratio is outside the expected band';
    END IF;

    SELECT COUNT(*) INTO bucket_count
    FROM (
        SELECT CONSENT_ID
        FROM PURPOSE_CONSENT_MAPPING
        WHERE ORG_ID = @perf_org_id
        GROUP BY CONSENT_ID
        HAVING COUNT(*) = 3
    ) purpose_bucket;
    IF bucket_count < ROUND(@expected_count * 0.09) OR bucket_count > ROUND(@expected_count * 0.15) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'triple-purpose consent ratio is outside the expected band';
    END IF;

    SELECT COUNT(*) INTO bucket_count
    FROM (
        SELECT CONSENT_ID
        FROM PURPOSE_CONSENT_MAPPING
        WHERE ORG_ID = @perf_org_id
        GROUP BY CONSENT_ID
        HAVING COUNT(*) = 4
    ) purpose_bucket;
    IF bucket_count < ROUND(@expected_count * 0.01) OR bucket_count > ROUND(@expected_count * 0.05) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'quad-purpose consent ratio is outside the expected band';
    END IF;

    SELECT 'CONSENT' AS table_name, COUNT(*) AS row_count
    FROM CONSENT
    WHERE ORG_ID = @perf_org_id
    UNION ALL
    SELECT 'CONSENT_AUTH_RESOURCE', COUNT(*) FROM CONSENT_AUTH_RESOURCE WHERE ORG_ID = @perf_org_id
    UNION ALL
    SELECT 'CONSENT_ATTRIBUTE', COUNT(*) FROM CONSENT_ATTRIBUTE WHERE ORG_ID = @perf_org_id
    UNION ALL
    SELECT 'PURPOSE_CONSENT_MAPPING', COUNT(*) FROM PURPOSE_CONSENT_MAPPING WHERE ORG_ID = @perf_org_id
    UNION ALL
    SELECT 'CONSENT_ELEMENT_APPROVAL', COUNT(*) FROM CONSENT_ELEMENT_APPROVAL WHERE ORG_ID = @perf_org_id
    UNION ALL
    SELECT 'CONSENT_STATUS_AUDIT', COUNT(*) FROM CONSENT_STATUS_AUDIT WHERE ORG_ID = @perf_org_id;

    SELECT CURRENT_STATUS, COUNT(*) AS row_count
    FROM CONSENT
    WHERE ORG_ID = @perf_org_id
    GROUP BY CURRENT_STATUS
    ORDER BY CURRENT_STATUS;

    SELECT CONSENT_TYPE, COUNT(*) AS row_count
    FROM CONSENT
    WHERE ORG_ID = @perf_org_id
    GROUP BY CONSENT_TYPE
    ORDER BY CONSENT_TYPE;

    SELECT auth_count, COUNT(*) AS consent_count
    FROM (
        SELECT CONSENT_ID, COUNT(*) AS auth_count
        FROM CONSENT_AUTH_RESOURCE
        WHERE ORG_ID = @perf_org_id
        GROUP BY CONSENT_ID
    ) auth_counts
    GROUP BY auth_count
    ORDER BY auth_count;

    SELECT purpose_count, COUNT(*) AS consent_count
    FROM (
        SELECT CONSENT_ID, COUNT(*) AS purpose_count
        FROM PURPOSE_CONSENT_MAPPING
        WHERE ORG_ID = @perf_org_id
        GROUP BY CONSENT_ID
    ) purpose_counts
    GROUP BY purpose_count
    ORDER BY purpose_count;

    SELECT GROUP_ID, COUNT(*) AS consent_count
    FROM CONSENT
    WHERE ORG_ID = @perf_org_id
    GROUP BY GROUP_ID
    ORDER BY consent_count DESC
    LIMIT 10;

    SELECT USER_ID, COUNT(*) AS auth_count
    FROM CONSENT_AUTH_RESOURCE
    WHERE ORG_ID = @perf_org_id
    GROUP BY USER_ID
    ORDER BY auth_count DESC
    LIMIT 10;
END//

DELIMITER ;

CALL validate_perf_seed();
DROP PROCEDURE validate_perf_seed;
