use `consent_mgt`;

SET SESSION autocommit = 0;

-- Keep these smaller so each chunk finishes quickly
SET @TARGET_ROWS = 1000000;
SET @BATCH_SIZE  = 10000;
SET @ORG_ID      = 'ORG-001';

DROP TEMPORARY TABLE IF EXISTS tmp_seq;
CREATE TEMPORARY TABLE tmp_seq (
  n INT PRIMARY KEY
) ENGINE=InnoDB;

INSERT INTO tmp_seq (n)
SELECT
  d0.d + d1.d * 10 + d2.d * 100 + d3.d * 1000 + d4.d * 10000 + d5.d * 100000 AS n
FROM
  (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
   UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d0
CROSS JOIN
  (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
   UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d1
CROSS JOIN
  (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
   UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d2
CROSS JOIN
  (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
   UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d3
CROSS JOIN
  (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
   UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d4
CROSS JOIN
  (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
   UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d5
WHERE
  d0.d + d1.d * 10 + d2.d * 100 + d3.d * 1000 + d4.d * 10000 + d5.d * 100000 < @TARGET_ROWS
ORDER BY 1;

DROP TEMPORARY TABLE IF EXISTS tmp_batch;
CREATE TEMPORARY TABLE tmp_batch (
  consent_id VARCHAR(36) NOT NULL,
  created_time BIGINT NOT NULL,
  updated_time BIGINT NOT NULL,
  client_id VARCHAR(255) NOT NULL,
  consent_type VARCHAR(255) NOT NULL,
  current_status VARCHAR(20) NOT NULL,
  consent_frequency INT NULL,
  validity_time BIGINT NULL,
  recurring_indicator BOOLEAN NOT NULL,
  data_access_validity_duration BIGINT NOT NULL,
  org_id VARCHAR(36) NOT NULL,
  auth_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  auth_status VARCHAR(20) NOT NULL,
  resources JSON NOT NULL,
  PRIMARY KEY (consent_id),
  UNIQUE KEY uq_auth_id (auth_id)
) ENGINE=InnoDB;

DELIMITER //

DROP PROCEDURE IF EXISTS load_random_consents_with_auth //
CREATE PROCEDURE load_random_consents_with_auth(IN p_total INT, IN p_batch INT)
BEGIN
  DECLARE v_start INT DEFAULT 0;
  DECLARE v_end INT;
  DECLARE v_done INT DEFAULT 0;

  WHILE v_start < p_total DO
    SET v_end = v_start + p_batch - 1;

    TRUNCATE TABLE tmp_batch;

    INSERT INTO tmp_batch (
      consent_id,
      created_time,
      updated_time,
      client_id,
      consent_type,
      current_status,
      consent_frequency,
      validity_time,
      recurring_indicator,
      data_access_validity_duration,
      org_id,
      auth_id,
      user_id,
      auth_status,
      resources
    )
    SELECT
      UUID() AS consent_id,
      UNIX_TIMESTAMP() - FLOOR(RAND(n * 17 + 11) * 86400 * 180) AS created_time,
      UNIX_TIMESTAMP() - FLOOR(RAND(n * 19 + 13) * 86400 * 30) AS updated_time,
      CONCAT('TPP-PERF-', LPAD(1 + FLOOR(RAND(n * 23 + 17) * 500), 3, '0')) AS client_id,
      ELT(
        1 + FLOOR(RAND(n * 29 + 19) * 6),
        'data_access','marketing','analytics','notification','payment','bulk_test'
      ) AS consent_type,
      CASE
        WHEN RAND(n * 31 + 23) < 0.80 THEN 'ACTIVE'
        WHEN RAND(n * 31 + 23) < 0.95 THEN 'APPROVED'
        ELSE 'CREATED'
      END AS current_status,
      CASE
        WHEN RAND(n * 37 + 29) < 0.35 THEN NULL
        ELSE FLOOR(RAND(n * 41 + 31) * 2)
      END AS consent_frequency,
      CASE
        WHEN RAND(n * 43 + 37) < 0.90
          THEN UNIX_TIMESTAMP() - FLOOR(RAND(n * 47 + 41) * 86400 * 120) - 60
        ELSE UNIX_TIMESTAMP() + FLOOR(RAND(n * 53 + 43) * 86400 * 60) + 60
      END AS validity_time,
      (RAND(n * 59 + 47) < 0.5) AS recurring_indicator,
      ELT(1 + FLOOR(RAND(n * 61 + 53) * 4), 0, 86400, 2592000, 7776000) AS data_access_validity_duration,
      @ORG_ID AS org_id,
      UUID() AS auth_id,
      CONCAT('perf_user_', LPAD(FLOOR(RAND(n * 67 + 59) * 300000), 6, '0'), '@example.com') AS user_id,
      CASE
        WHEN RAND(n * 71 + 61) < 0.75 THEN 'APPROVED'
        WHEN RAND(n * 71 + 61) < 0.90 THEN 'CREATED'
        WHEN RAND(n * 71 + 61) < 0.96 THEN 'REJECTED'
        ELSE 'REVOKED'
      END AS auth_status,
      JSON_OBJECT(
        'accountIds',
        JSON_ARRAY(
          CONCAT('acc-', LPAD(FLOOR(RAND(n * 73 + 67) * 1000000), 7, '0')),
          CONCAT('acc-', LPAD(FLOOR(RAND(n * 79 + 71) * 1000000), 7, '0'))
        ),
        'scopes',
        JSON_ARRAY('scope:read', 'scope:write')
      ) AS resources
    FROM tmp_seq
    WHERE n BETWEEN v_start AND v_end;

    INSERT INTO CONSENT (
      CONSENT_ID, CREATED_TIME, UPDATED_TIME, CLIENT_ID, CONSENT_TYPE, CURRENT_STATUS,
      CONSENT_FREQUENCY, VALIDITY_TIME, RECURRING_INDICATOR, DATA_ACCESS_VALIDITY_DURATION, ORG_ID
    )
    SELECT
      consent_id, created_time, updated_time, client_id, consent_type, current_status,
      consent_frequency, validity_time, recurring_indicator, data_access_validity_duration, org_id
    FROM tmp_batch;

    INSERT INTO CONSENT_AUTH_RESOURCE (
      AUTH_ID, CONSENT_ID, AUTH_TYPE, USER_ID, AUTH_STATUS, UPDATED_TIME, RESOURCES, ORG_ID
    )
    SELECT
      auth_id, consent_id, 'authorisation', user_id, auth_status, updated_time, resources, org_id
    FROM tmp_batch;

    COMMIT;

    SET v_done = LEAST(v_start + p_batch, p_total);
    -- progress result each chunk helps avoid idle timeout in some clients
    SELECT CONCAT('processed=', v_done, '/', p_total) AS progress;

    SET v_start = v_start + p_batch;
  END WHILE;
END //

DELIMITER ;

CALL load_random_consents_with_auth(@TARGET_ROWS, @BATCH_SIZE);

DROP PROCEDURE load_random_consents_with_auth;
DROP TEMPORARY TABLE tmp_batch;
DROP TEMPORARY TABLE tmp_seq;

COMMIT;