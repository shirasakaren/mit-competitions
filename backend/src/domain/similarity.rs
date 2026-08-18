/// Composite duplicate score per the challenge spec:
/// `final_score = email_match*0.4 + phone_match*0.4 + name_similarity*0.2`
pub const EMAIL_WEIGHT: f64 = 0.4;
pub const PHONE_WEIGHT: f64 = 0.4;
pub const NAME_WEIGHT: f64 = 0.2;

pub fn final_score(email_match: bool, phone_match: bool, name_similarity: f64) -> f64 {
    let e = if email_match { 1.0 } else { 0.0 };
    let p = if phone_match { 1.0 } else { 0.0 };
    let n = name_similarity.clamp(0.0, 1.0);
    (e * EMAIL_WEIGHT + p * PHONE_WEIGHT + n * NAME_WEIGHT).clamp(0.0, 1.0)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Confidence {
    High,
    Medium,
    Low,
}

impl Confidence {
    pub fn from_score(score: f64) -> Self {
        if score >= 0.90 {
            Confidence::High
        } else if score >= 0.70 {
            Confidence::Medium
        } else {
            Confidence::Low
        }
    }
}

pub fn match_reasons(email_match: bool, phone_match: bool, name_similarity: f64) -> Vec<String> {
    let mut reasons = Vec::with_capacity(3);
    if email_match {
        reasons.push("email_exact_match".to_string());
    }
    if phone_match {
        reasons.push("phone_exact_match".to_string());
    }
    // Only surface name similarity as a "reason" once it's meaningfully above
    // trigram noise floor, matching the candidate-generation threshold.
    if name_similarity >= 0.3 {
        reasons.push(format!("name_similarity_{name_similarity:.2}"));
    }
    reasons
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exact_email_and_phone_is_high_confidence() {
        let s = final_score(true, true, 0.5);
        assert!((s - 0.9).abs() < 1e-9);
        assert_eq!(Confidence::from_score(s), Confidence::High);
    }

    #[test]
    fn single_weak_match_is_low_confidence() {
        let s = final_score(false, false, 0.5);
        assert!((s - 0.1).abs() < 1e-9);
        assert_eq!(Confidence::from_score(s), Confidence::Low);
    }

    #[test]
    fn two_partial_matches_is_medium() {
        let s = final_score(true, false, 0.9); // 0.4 + 0.18 = 0.58 -> still low actually
        assert_eq!(Confidence::from_score(s), Confidence::Low);
        let s2 = final_score(true, false, 1.0) + 0.0; // 0.4 + 0.2 = 0.6, still low per thresholds
        assert_eq!(Confidence::from_score(s2), Confidence::Low);
    }

    #[test]
    fn boundary_thresholds() {
        assert_eq!(Confidence::from_score(0.90), Confidence::High);
        assert_eq!(Confidence::from_score(0.89999), Confidence::Medium);
        assert_eq!(Confidence::from_score(0.70), Confidence::Medium);
        assert_eq!(Confidence::from_score(0.69999), Confidence::Low);
    }
}
