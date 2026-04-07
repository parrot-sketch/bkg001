// ES Module script

/**
 * Timing Attack Verification Script
 * 
 * Verifies that the auth endpoint mitigates email enumeration by ensuring that 
 * response times for valid vs invalid emails are statistically indistinguishable 
 * (Delta < 15ms).
 */

const ENDPOINT = 'http://localhost:3000/api/auth/login';

// Use seeded data from schema
const VALID_EMAIL = 'admin@nairobisculpt.com'; 
const INVALID_EMAIL = 'non_existent_hacker_123@example.com';
const DUMMY_PASSWORD = 'WrongPassword123!'; // We must use a wrong password to compare just the email existence check without actual login overhead

const WARMUP_ROUNDS = 5;
const TEST_ROUNDS = 20;

async function measureRequestTime(email, password) {
  const start = process.hrtime.bigint();
  
  await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  }).catch(() => {}); // ignore 401s
  
  const end = process.hrtime.bigint();
  return Number(end - start) / 1_000_000; // ms
}

async function runBenchmark() {
  console.log('--- TIMING ATTACK VERIFICATION SCRIPT ---');
  console.log(`Target: ${ENDPOINT}`);
  console.log(`Warming up (${WARMUP_ROUNDS} rounds)...`);
  
  for (let i = 0; i < WARMUP_ROUNDS; i++) {
    await measureRequestTime(VALID_EMAIL, DUMMY_PASSWORD);
    await Promise.resolve(setTimeout(() => {}, 100)); // sleep
    await measureRequestTime(INVALID_EMAIL, DUMMY_PASSWORD);
  }

  console.log(`\nBeginning Benchmark (${TEST_ROUNDS} rounds)...`);
  
  let validTotalTime = 0;
  let invalidTotalTime = 0;

  for (let i = 0; i < TEST_ROUNDS; i++) {
    // Alternate requests to normalize network jitter
    if (i % 2 === 0) {
      validTotalTime += await measureRequestTime(VALID_EMAIL, DUMMY_PASSWORD);
      await new Promise(r => setTimeout(r, 50));
      invalidTotalTime += await measureRequestTime(INVALID_EMAIL, DUMMY_PASSWORD);
    } else {
      invalidTotalTime += await measureRequestTime(INVALID_EMAIL, DUMMY_PASSWORD);
      await new Promise(r => setTimeout(r, 50));
      validTotalTime += await measureRequestTime(VALID_EMAIL, DUMMY_PASSWORD);
    }
  }

  const validAvg = validTotalTime / TEST_ROUNDS;
  const invalidAvg = invalidTotalTime / TEST_ROUNDS;
  const delta = Math.abs(validAvg - invalidAvg);

  console.log('\n--- RESULTS ---');
  console.log(`Valid Email Avg:   ${validAvg.toFixed(2)} ms`);
  console.log(`Invalid Email Avg: ${invalidAvg.toFixed(2)} ms`);
  console.log(`Delta (Difference): ${delta.toFixed(2)} ms`);

  if (delta < 15) {
    console.log(`\n✅ PASS: Timing attack mitigated (Delta < 15ms)`);
  } else {
    console.log(`\n❌ FAIL: High time variance detectable. System is vulnerable.`);
  }
}

runBenchmark().catch(console.error);
