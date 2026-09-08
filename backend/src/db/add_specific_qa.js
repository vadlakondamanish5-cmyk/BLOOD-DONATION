const pool = require("./pool");

const recordsToAdd = [
  {
    category: "Donor Safety and Medication",
    subcategory: "Analgesics and Antipyretics",
    question: "Can I donate blood after taking paracetamol?",
    answer: "Yes, taking paracetamol (acetaminophen) for mild headache or minor pain does not defer you from donating whole blood, provided you feel completely well on donation day and do not have an active fever or infection. However, if you are donating platelets via apheresis, or took medication containing aspirin or NSAIDs, deferral rules may apply. Always disclose all medications taken within the last 48 hours to the medical officer during pre-donation screening.",
    keywords: "paracetamol,acetaminophen,crocin,medication,painkiller,fever,donor eligibility",
    difficulty: "intermediate",
    source: "National Blood Transfusion Council (NBTC) / WHO Guidelines",
    source_url: "https://nbtc.mohfw.gov.in"
  },
  {
    category: "Blood Groups and Rh Factor",
    subcategory: "Rhesus Antigen System",
    question: "What is the Rh factor?",
    answer: "The Rh factor (Rhesus factor) is an inherited protein antigen (specifically the D antigen) located on the membrane of red blood cells. If your erythrocytes possess this antigen, you are Rh-positive (e.g., A+, B+, O+, AB+); if they lack it, you are Rh-negative (e.g., A-, B-, O-, AB-). Knowing Rh status is essential in transfusions to prevent hemolytic transfusion reactions and in pregnancy to monitor and prevent hemolytic disease of the fetus and newborn (HDFN).",
    keywords: "Rh factor,rhesus,D antigen,Rh positive,Rh negative,erythrocyte,blood grouping",
    difficulty: "beginner",
    source: "World Health Organization (WHO) / AABB",
    source_url: "https://www.who.int"
  },
  {
    category: "Blood Compatibility and Transfusion",
    subcategory: "Universal Donor Red Cells",
    question: "Why can O negative blood be given to almost anyone?",
    answer: "O-negative (O-) red blood cells lack A antigens, B antigens, and Rh(D) surface antigens. Because the recipient's immune system attacks foreign blood surface antigens using antibodies (anti-A, anti-B, anti-D), O-negative red cells do not trigger an immediate hemolytic immune reaction when infused into recipients of any ABO/Rh blood group. This makes O-negative the universal red blood cell donor for emergency trauma transfusions before crossmatching is complete.",
    keywords: "O negative,universal donor,erythrocytes,A antigen,B antigen,Rh antigen,transfusion,emergency",
    difficulty: "beginner",
    source: "American Red Cross / AABB / WHO",
    source_url: "https://www.redcrossblood.org"
  },
  {
    category: "Rare Blood Types and Bombay Group",
    subcategory: "H Antigen Deficiency (Oh)",
    question: "What is Bombay blood group?",
    answer: "The Bombay blood group (hh phenotype or Oh) is an exceptionally rare genetic blood type discovered in Bombay (now Mumbai) in 1952. Individuals with this phenotype lack the H antigen on their red blood cells, which is the foundational precursor required to build A and B antigens. Consequently, Bombay blood group individuals carry potent anti-H, anti-A, and anti-B antibodies in their plasma, meaning they can only safely receive blood from another donor with the exact Bombay blood group.",
    keywords: "Bombay blood group,hh phenotype,Oh blood,H antigen,rare blood group,mumbai,anti-H",
    difficulty: "intermediate",
    source: "National Blood Transfusion Council (NBTC India) / WHO",
    source_url: "https://nbtc.mohfw.gov.in"
  },
  {
    category: "HexaVision Platform Security",
    subcategory: "Healthcare Privacy and Cryptography",
    question: "How does HexaVision protect blood donation data?",
    answer: "HexaVision safeguards donor and hospital data using a multi-layered healthcare security architecture: 1) End-to-end TLS 1.3 cryptographic encryption in transit and AES-256 at rest; 2) An immutable Consent Vault recording donor authorization logs and privacy preferences; 3) Identity pseudonymization during automated radius matching so donor contact details are never exposed to public inquiries; 4) Role-based access control (RBAC) ensuring only verified trauma and transfusion coordinators can request contact dispatches; and 5) Full compliance with international digital health privacy standards.",
    keywords: "HexaVision,data protection,security,privacy,encryption,consent vault,donor confidentiality",
    difficulty: "intermediate",
    source: "HexaVision Clinical Security Framework",
    source_url: "https://hexavision.health/security"
  }
];

async function insertRecords() {
  console.log("Inserting high-priority verified Q&A records into blood_knowledge...");
  for (const r of recordsToAdd) {
    const checkSql = `SELECT id FROM blood_knowledge WHERE question ILIKE $1`;
    const checkRes = await pool.query(checkSql, [r.question]);

    if (checkRes.rows.length > 0) {
      await pool.query(
        `UPDATE blood_knowledge 
         SET category = $1, subcategory = $2, answer = $3, keywords = $4, difficulty = $5, source = $6, source_url = $7
         WHERE id = $8`,
        [r.category, r.subcategory, r.answer, r.keywords, r.difficulty, r.source, r.source_url, checkRes.rows[0].id]
      );
      console.log(`Updated existing record ID ${checkRes.rows[0].id}: "${r.question}"`);
    } else {
      const insertSql = `
        INSERT INTO blood_knowledge (category, subcategory, question, answer, keywords, difficulty, source, source_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      await pool.query(insertSql, [r.category, r.subcategory, r.question, r.answer, r.keywords, r.difficulty, r.source, r.source_url]);
      console.log(`Inserted new record: "${r.question}"`);
    }
  }
  console.log("Done inserting/updating records.");
  process.exit(0);
}

insertRecords().catch(err => {
  console.error("Error inserting records:", err);
  process.exit(1);
});
