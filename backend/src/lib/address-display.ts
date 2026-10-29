/**
 * SQL expression for a readable address. Street addresses imported from map
 * search often already contain the city and province; append those only when
 * the street text does not already include them.
 */
export function addressSql(alias = 'a'): string {
  const a = alias;
  return `TRIM(CONCAT_WS(', ',
    NULLIF(TRIM(${a}.street_address), ''),
    CASE
      WHEN ${a}.city IS NULL OR TRIM(${a}.city) = ''
        OR ${a}.street_address LIKE CONCAT('%', TRIM(${a}.city), '%')
      THEN NULL
      ELSE TRIM(${a}.city)
    END,
    CASE
      WHEN ${a}.province IS NULL OR TRIM(${a}.province) = ''
        OR ${a}.street_address LIKE CONCAT('%', TRIM(${a}.province), '%')
      THEN NULL
      ELSE TRIM(${a}.province)
    END
  ))`;
}
