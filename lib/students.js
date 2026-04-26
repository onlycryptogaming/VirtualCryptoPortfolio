import { db } from './db';

// ── Get student by email ──────────────────────────────────────────
export async function getStudentByEmail(email) {
  const { data } = await db
    .from('students')
    .select('id, name, email, is_bot')
    .eq('email', email.toLowerCase().trim())
    .single();
  return data || null;
}

// ── Get student by name ───────────────────────────────────────────
export async function getStudentByName(name) {
  const { data } = await db
    .from('students')
    .select('id, name, email, is_bot')
    .eq('name', name)
    .single();
  return data || null;
}

// ── Get all students ──────────────────────────────────────────────
export async function getAllStudents() {
  const { data } = await db
    .from('students')
    .select('id, name, email, is_bot')
    .order('name');
  return data || [];
}

// ── Add a student ─────────────────────────────────────────────────
export async function addStudent({ name, email, isBot = false, seedMoney = 10000 }) {
  const { data: student, error } = await db
    .from('students')
    .insert({ name, email: email.toLowerCase().trim(), is_bot: isBot })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Create their portfolio with seed money
  await db.from('portfolios').insert({
    student_id: student.id,
    cash:       seedMoney,
    fees_paid:  0,
  });

  return student;
}

// ── Remove a student ──────────────────────────────────────────────
export async function removeStudent(studentId) {
  await db.from('students').delete().eq('id', studentId);
}

// ── Reset a student portfolio ─────────────────────────────────────
export async function resetStudentPortfolio(studentId, seedMoney = 10000) {
  await Promise.all([
    db.from('portfolios').upsert({ student_id: studentId, cash: seedMoney, fees_paid: 0 }),
    db.from('holdings').delete().eq('student_id', studentId),
    db.from('trades').delete().eq('student_id', studentId),
    db.from('snapshots').delete().eq('student_id', studentId),
  ]);
}

// ── Get full portfolio for a student ─────────────────────────────
export async function getStudentPortfolio(studentId) {
  const [portfolioRes, holdingsRes, tradesRes] = await Promise.all([
    db.from('portfolios').select('cash, fees_paid').eq('student_id', studentId).single(),
    db.from('holdings').select('*').eq('student_id', studentId).gt('quantity', 0),
    db.from('trades').select('*').eq('student_id', studentId).order('created_at', { ascending: false }).limit(200),
  ]);

  return {
    portfolio: portfolioRes.data || { cash: 0, fees_paid: 0 },
    holdings:  holdingsRes.data || [],
    trades:    tradesRes.data   || [],
  };
}

// ── Get portfolio history for charts ─────────────────────────────
export async function getPortfolioHistory(studentId) {
  const [intradayRes, dailyRes] = await Promise.all([
    db.from('snapshots')
      .select('total_value, created_at')
      .eq('student_id', studentId)
      .eq('snapshot_type', 'intraday')
      .order('created_at', { ascending: true })
      .limit(500),
    db.from('snapshots')
      .select('total_value, created_at')
      .eq('student_id', studentId)
      .eq('snapshot_type', 'daily')
      .order('created_at', { ascending: true })
      .limit(200),
  ]);

  return {
    intraday: (intradayRes.data || []).map(r => ({
      v: parseFloat(r.total_value),
      t: new Date(r.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    })),
    daily: (dailyRes.data || []).map(r => ({
      v: parseFloat(r.total_value),
      t: new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    })),
  };
}

// ── Save a portfolio snapshot ─────────────────────────────────────
export async function saveSnapshot(studentId, totalValue, cash, type = 'intraday') {
  await db.from('snapshots').insert({
    student_id:    studentId,
    total_value:   totalValue,
    cash,
    snapshot_type: type,
  });
}
