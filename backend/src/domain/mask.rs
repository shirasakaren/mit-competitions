/// Deterministically masks a phone number for display: keeps a short prefix
/// and suffix (enough to visually confirm "this is the number I searched
/// for") and replaces the middle with a fixed-width run of asterisks. Applied
/// to the raw stored value (not the normalized digits) so the original
/// separators/format aren't altered — the source value itself is never
/// mutated, only the string returned to API/UI callers.
pub fn mask_phone(raw: &str) -> String {
    let chars: Vec<char> = raw.chars().collect();
    let n = chars.len();
    if n == 0 {
        return String::new();
    }
    if n <= 4 {
        // Too short to safely reveal any part without exposing the whole number.
        return "*".repeat(n);
    }
    let prefix_len = 4.min(n);
    let suffix_len = if n > prefix_len + 2 { 2 } else { 0 };
    let prefix: String = chars[..prefix_len].iter().collect();
    let suffix: String = if suffix_len > 0 {
        chars[n - suffix_len..].iter().collect()
    } else {
        String::new()
    };
    format!("{prefix}****{suffix}")
}

/// Masks an email's local part, keeping the first character and the full
/// domain visible (e.g. "k***@email.com"). Used only where an endpoint
/// exposes an *other* user's email as context (never for the record the
/// caller directly searched for).
pub fn mask_email(raw: &str) -> String {
    match raw.split_once('@') {
        Some((local, domain)) if !local.is_empty() => {
            let first: String = local.chars().take(1).collect();
            format!("{first}***@{domain}")
        }
        _ => "***".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn masks_typical_indonesian_number() {
        assert_eq!(mask_phone("081234567890"), "0812****90");
    }

    #[test]
    fn masks_short_number_entirely() {
        assert_eq!(mask_phone("123"), "***");
    }

    #[test]
    fn masks_email_local_part() {
        assert_eq!(mask_email("komang@email.com"), "k***@email.com");
    }

    #[test]
    fn handles_empty() {
        assert_eq!(mask_phone(""), "");
        assert_eq!(mask_email(""), "***");
    }
}
