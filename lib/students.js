import { db } from './db';

export async function getStudentByEmail(email) {
  const { data } = await db.from('students').select('id, name, email, is_bot').eq('email', email.toLowerCase().trim()).single();
  return data || null;
}

export async function getStudentClass(studentId) {
  // Get the most recently joined active class for this student
  const { data } = await db
    .from('class_students')
    .select('class_id, classes(id, name, seed_money, trade_fee, is_active)')
    .eq('student_id', studentId)
    .order('joined_at', { ascending: false })
    .limit(1)
    .single();
  return data?.classes || null;
}

export async function getStudentClasses(studentId) {
  const { data } = await db
    .from('class_students')
    .select('class_id, classes(id, name, semester, seed_money, trade_fee, is_active)')
    .eq('student_id', studentId)
    .order('joined_at', { ascending: false });
  return (data || []).map(r => r.classes);
}

export async function getStudentPortfolio(studentId, classId) {
  const [portfolioRes, holdingsRes, tradesRes] = await Promise.all([
    db.from('portfolios').select('cash, fees_paid').eq('student_id', studentId).eq('class_id', classId).single(),
    db.from('holdings').select('*').eq('student_id', studentId).eq('class_id', classId).gt('quantity', 0),
    db.from('trades').select('*').eq('student_id', studentId).eq('class_id', classId).order('created_at', { ascending: false }).limit(200),
  ]);
  return {
    portfolio: portfolioRes.data || { cash: 0, fees_paid: 0 },
    holdings:  holdingsRes.data || [],
    trades:    tradesRes.data   || [],
  };
}

export async function getPortfolioHistory(studentId, classId) {
  const [intradayRes, dailyRes] = await Promise.all([
    db.from('snapshots').select('total_value, created_at').eq('student_id', studentId).eq('class_id', classId).eq('snapshot_type', 'intraday').order('created_at').limit(500),
    db.from('snapshots').select('total_value, created_at').eq('student_id', studentId).eq('class_id', classId).eq('snapshot_type', 'daily').order('created_at').limit(200),
  ]);
  return {
    intraday: (intradayRes.data || []).map(r => ({ v: parseFloat(r.total_value), t: new Date(r.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) })),
    daily:    (dailyRes.data    || []).map(r => ({ v: parseFloat(r.total_value), t: new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })),
  };
}

export async function getClassCoins(classId) {
  const { data } = await db.from('class_coins').select('symbol, gecko_id, name, sector').eq('class_id', classId).eq('active', true).order('symbol');
  return data || [];
}

export async function getAllStudents(classId) {
  const { data } = await db.from('class_students').select('student_id, students(id, name, email, is_bot)').eq('class_id', classId);
  return (data || []).map(r => r.students);
}
