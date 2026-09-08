/**
 * Medical Safety & Intent Classification Layer for Blood Knowledge AI
 * 
 * Classifies inquiries into:
 * 1. EMERGENCY: Acute trauma, severe bleeding, or emergency blood need -> Immediate 108/911 redirect.
 * 2. ELIGIBILITY: Inquiries about criteria, health conditions, medications, deferrals to donate -> General guidance + pre-screening notice.
 * 3. PERSONAL_MEDICAL: Requests to diagnose, prescribe medicine, or treat conditions -> Refusal to prescribe + doctor consultation.
 * 4. EDUCATIONAL: Blood science, blood types, components, storage, safety, diet, recovery, HexaVision security -> Verified clinical knowledge.
 * 5. UNSUPPORTED: Irrelevant, out-of-scope, or unsafe non-medical queries -> Out of scope notice.
 */

function classifyMessage(message) {
    if (!message || typeof message !== "string") {
        return { 
            type: "UNSUPPORTED", 
            confidence: 1.0, 
            reason: "Empty or invalid query",
            advisory: "Please provide a valid question about blood, donation, or blood safety." 
        };
    }

    const text = message.toLowerCase().trim();

    // 1. EMERGENCY CHECK (Acute life threat, heavy bleeding, accident trauma, critical blood need)
    const emergencyPatterns = [
        /\bbleeding\s+(heavily|profusely|severe|severely|uncontrolled|out)\b/i,
        /\b(accident|trauma|critical|emergency|hemorrhage|crash)\b.*(bleeding|blood|ambulance|help|what should i do)/i,
        /\bbleeding.*(accident|emergency|what should i do)/i,
        /\bneed blood (immediately|now|urgent|urgently|asap|in \d+ min)/i,
        /\bemergency blood (transfusion|needed|required)\b/i,
        /\bpatient is dying\b/i,
        /\bneed \d+ (units|pints|bags) (asap|immediately|now|urgently)\b/i,
        /\bpatient is in icu need blood\b/i,
        /\bsend blood to hospital\b/i,
        /\bcall (an ambulance|108|911|112)\b/i
    ];

    for (const pattern of emergencyPatterns) {
        if (pattern.test(text)) {
            return {
                type: "EMERGENCY",
                reason: "Acute emergency or uncontrolled hemorrhage detected",
                advisory: "🚨 ACUTE MEDICAL EMERGENCY: If you or someone near you is in critical distress or bleeding heavily, immediately call Emergency Services (108 / 112 in India, 911 / 999) or visit the nearest trauma emergency room. Blood Knowledge AI is an educational assistant and cannot dispatch emergency blood or medical teams."
            };
        }
    }

    // 2. PERSONAL MEDICAL & PRESCRIPTION REFUSAL CHECK
    // (Requests to prescribe drugs, dosages, diagnose symptoms, or cure illnesses)
    const personalMedicalPatterns = [
        /\bprescribe\b/i,
        /\b(what|which) medicine (should|can) i take\b/i,
        /\bwhat medication (should|can) i take\b/i,
        /\b(give|recommend) me (a prescription|medicine|drug|pills|dosage)\b/i,
        /\bdiagnose (me|my condition|my symptoms)\b/i,
        /\bhow (can|do) i cure (my|anemia|diabetes|hypertension)\b/i,
        /\bwhat is my diagnosis\b/i,
        /\binterpret my lab report\b/i,
        /\bhow much dosage of\b/i
    ];

    for (const pattern of personalMedicalPatterns) {
        if (pattern.test(text)) {
            return {
                type: "PERSONAL_MEDICAL",
                reason: "Request for medical prescription, dosage, or diagnostic treatment",
                advisory: "⚠️ CLINICAL NOTICE: Blood Knowledge AI provides educational information only and strictly cannot prescribe medications, recommend pharmaceutical dosages, or provide clinical diagnoses. Always consult a qualified physician for personal medical evaluation."
            };
        }
    }

    // 3. DONOR ELIGIBILITY CHECK
    // (Questions asking if the user or someone else can donate blood, including deferrals, weight, age, tattoo, pregnancy, malaria, diseases)
    const eligibilityPatterns = [
        /\bcan i donate\b/i,
        /\bcan a person (with|having) .* donate\b/i,
        /\bcan a .* donate blood\b/i,
        /\bcan someone (with|who) .* donate\b/i,
        /\bam i (eligible|qualified|allowed) to donate\b/i,
        /\bwho can donate\b/i,
        /\bwho cannot donate\b/i,
        /\beligibility criteria\b/i,
        /\bminimum weight requirement\b/i,
        /\bweight (limit|requirement) for blood donation\b/i,
        /\bage (limit|requirement) for blood donation\b/i,
        /\bhow long must i wait after\b/i,
        /\bhow long after (getting a tattoo|tattoo|piercing|surgery|malaria|covid|vaccine)\b/i,
        /\bwait.*(tattoo|piercing|surgery)\b/i,
        /\btattoo.*donate\b/i,
        /\bdeferral (period|rules|guidelines)\b/i,
        /\bpregnant.*donate\b/i,
        /\bdiabetes.*donate\b/i,
        /\bhypertension.*donate\b/i,
        /\bparacetamol.*donate\b/i,
        /\bmalaria.*donate\b/i,
        /\bdefinitely eligible\b/i,
        /\bwill i be accepted as a donor\b/i
    ];

    for (const pattern of eligibilityPatterns) {
        if (pattern.test(text)) {
            return {
                type: "ELIGIBILITY",
                reason: "Donor eligibility or deferral assessment inquiry",
                advisory: "🛡️ ELIGIBILITY NOTICE: General criteria provide educational guidelines. Actual individual eligibility is verified through a confidential pre-donation questionnaire, hemoglobin test, and vitals check by medical staff at the licensed blood center."
            };
        }
    }

    // 4. CHECK IF RELEVANT TO BLOOD SCIENCE, DONATION OR HEXAVISION
    const relevantKeywords = [
        "blood", "plasma", "platelet", "rbc", "wbc", "hemoglobin", "haemoglobin",
        "transfusion", "donor", "donat", "abo", "rh", "rhesus", "antigen",
        "antibody", "anemia", "anaemia", "leukocyte", "erythrocyte", "thrombocyte",
        "crossmatch", "vein", "artery", "serology", "hematocrit", "thalassemia",
        "sickle cell", "hemophilia", "clot", "coagulation", "ferritin", "iron",
        "circulation", "bone marrow", "apheresis", "blood bank", "bombay",
        "hexavision", "universal", "shelf life", "store", "stored", "safety",
        "dizzy", "faint", "eat", "drink", "food", "fluid", "hydration", "recovery",
        "test", "testing", "hiv", "hepatitis", "syphilis", "screen", "screening"
    ];

    const isRelevant = relevantKeywords.some(kw => text.includes(kw));

    if (!isRelevant && text.length > 20) {
        return {
            type: "UNSUPPORTED",
            reason: "Query outside the scope of blood science and blood donation",
            advisory: "This inquiry appears outside the clinical scope of Blood Knowledge AI. Please ask about blood groups, donation rules, blood safety, transfusion science, or HexaVision."
        };
    }

    // 5. DEFAULT: EDUCATIONAL
    return {
        type: "EDUCATIONAL",
        reason: "General educational blood science inquiry",
        advisory: null
    };
}

module.exports = { classifyMessage };
