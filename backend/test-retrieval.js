const { searchKnowledge } = require("./src/services/knowledgeService");
const { classifyMessage } = require("./src/services/safetyService");

async function test() {
  const tests = [
    "Can I donate blood if I have hypertension?",
    "Can I donate blood after taking paracetamol?",
    "Who is the universal red cell donor?",
    "Who is the universal plasma donor?",
    "What is the minimum weight requirement for blood donation in India?",
    "How long must I wait after getting a tattoo?",
    "Can a pregnant woman donate blood?",
    "What are the 4 main blood groups?",
    "What is the Rh factor?",
    "Why can O negative blood be given to almost anyone?",
    "What is Bombay blood group?",
    "What tests are performed on donated blood before transfusion?",
    "How are platelets stored and what is their shelf life?",
    "What should I eat before donating blood?",
    "What should I do if I feel dizzy after donating?",
    "Can a person with diabetes donate blood?",
    "I'm bleeding heavily from an accident, what should I do?",
    "Prescribe medicine for low hemoglobin",
    "Can I donate blood if I had malaria?",
    "How does HexaVision protect blood donation data?"
  ];

  for (const q of tests) {
    const cls = classifyMessage(q);
    const res = await searchKnowledge(q, { limit: 2 });
    console.log(`\nQ: "${q}"`);
    console.log(`  Classification: ${cls.type} (${cls.reason})`);
    console.log(`  Found records: ${res.records.length}`);
    if (res.records.length > 0) {
      console.log(`  Top match: [${res.records[0].category}] ${res.records[0].question}`);
      console.log(`  Answer preview: ${res.records[0].answer.slice(0, 100)}...`);
    }
  }
  process.exit(0);
}

test();
