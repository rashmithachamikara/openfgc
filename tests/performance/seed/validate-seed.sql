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
END//

DELIMITER ;

CALL validate_perf_seed();
DROP PROCEDURE validate_perf_seed;
