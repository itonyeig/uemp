// Live smoke checks use a seeded demo account. Login replaces its existing session.
// No profile or successful course-registration changes are made by this script.
import assert from 'node:assert/strict';

const base = process.env.UEMP_API_URL || 'http://localhost:5000/api/v1';
const email = process.env.UEMP_TEST_EMAIL || 'demo.student2@example.test';
const password = process.env.UEMP_TEST_PASSWORD || 'DemoStudentPass123!';
let token;
async function request(path, method = 'GET', body, authenticated = true) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(authenticated && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  return { status: response.status, ...data };
}

try {
  const anonymous = await request('/students/me');
  assert.equal(anonymous.status, 401);
  const login = await request('/auth/login', 'POST', { email, password }, false);
  assert.equal(login.status, 200, JSON.stringify(login.message));
  token = login.data.token;
  const profile = await request('/students/me');
  assert.equal(profile.status, 200);
  assert.equal(profile.data.student.email, email);
  assert.equal(profile.data.student.passwordHash, undefined);
  const available = await request('/registration/available-courses');
  assert.equal(available.status, 200);
  assert.ok(Array.isArray(available.data.courses));
  const registered = await request('/registration');
  assert.equal(registered.status, 200);
  const history = await request('/students/me/results');
  assert.equal(history.status, 200);
  assert.equal(typeof history.data.cgpa, 'number');
  assert.ok(
    history.data.semesters.every(
      (entry) => typeof entry.gpa === 'number' && Array.isArray(entry.results),
    ),
  );
  const invalid = await request('/registration', 'POST', { offeringIds: [] });
  assert.equal(invalid.status, 400);
  console.log('Empty registration:', invalid.status, JSON.stringify(invalid.message));
  const unavailable = await request('/registration', 'POST', {
    offeringIds: ['000000000000000000000000'],
  });
  assert.equal(unavailable.status, 400);
  console.log('Unavailable course:', unavailable.status, JSON.stringify(unavailable.message));
  if (registered.data.courses.length) {
    const duplicate = await request('/registration', 'POST', {
      offeringIds: [registered.data.courses[0].offeringId],
    });
    assert.equal(duplicate.status, 409);
    console.log('Duplicate registration:', duplicate.status, JSON.stringify(duplicate.message));
  } else {
    console.log(
      'Duplicate registration check skipped: this demo account has no registered courses.',
    );
  }
  console.log(
    JSON.stringify({
      profile: 'OK',
      availableCourses: available.data.courses.length,
      registeredCourses: registered.data.courses.length,
      registeredUnits: registered.data.totalCreditUnits,
      semesters: history.data.semesters.length,
      cgpa: history.data.cgpa,
    }),
  );
  const logout = await request('/auth/logout', 'POST');
  assert.equal(logout.status, 200);
  const revoked = await request('/students/me');
  assert.equal(revoked.status, 401);
  token = undefined;
  console.log('Logout revokes the session: OK. Live API checks passed.');
} finally {
  if (token) await request('/auth/logout', 'POST');
}
