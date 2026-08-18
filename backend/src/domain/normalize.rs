/// Normalizes an email for exact-match comparison: lowercase only.
/// MUST stay in sync with the DB expression index `LOWER(user_email)`
/// (see db/migrations/001_indexes.sql) — a mismatch silently degrades the
/// email lookup from an index scan to a sequential scan.
pub fn normalize_email(input: &str) -> String {
    input.trim().to_lowercase()
}

/// Normalizes a phone number for exact-match comparison: digits only.
/// MUST stay in sync with the generated column expression
/// `regexp_replace(msisdn, '[^0-9]', '', 'g')` used to populate `msisdn_norm`.
/// Deliberately does NOT strip/rewrite country codes (e.g. 0 vs 62 vs +62):
/// doing so would create false equivalence between numbers that were never
/// actually confirmed to be the same subscriber.
pub fn normalize_phone(input: &str) -> String {
    input.chars().filter(|c| c.is_ascii_digit()).collect()
}

/// Lowercases a name for trigram similarity comparisons, matching the
/// `LOWER(full_name)` expression backing idx_ws_user_fullname_trgm / _gist.
pub fn normalize_name(input: &str) -> String {
    input.trim().to_lowercase()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn email_lowercases_and_trims() {
        assert_eq!(normalize_email("  Budi@Email.COM "), "budi@email.com");
    }

    #[test]
    fn phone_strips_all_non_digits() {
        assert_eq!(normalize_phone("+62 812-3456-7890"), "6281234567890");
        assert_eq!(normalize_phone("(081) 234-5678"), "0812345678");
        assert_eq!(normalize_phone(""), "");
    }

    #[test]
    fn name_lowercases_and_trims() {
        assert_eq!(normalize_name("  Komang Pipit  "), "komang pipit");
    }
}
