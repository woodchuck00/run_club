import { json } from '../../_lib/http.js';
import { getSql } from '../../_lib/db.js';
import { requireClub, requireMembership } from '../../_lib/clubs.js';

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

export async function onRequestGet(context) {
  requireMembership(context);
  const club = requireClub(context);
  const { env } = context;
  const sql = getSql(env);

  const totalsRows = await sql`
    WITH eligible AS (
      SELECT id, session_date, title
      FROM sessions
      WHERE club_id = ${club.id}
        AND status = 'scheduled'
        AND session_date <= (now() AT TIME ZONE ${club.timezone})::date
    ), counts AS (
      SELECT e.id, COUNT(a.id)::int AS headcount
      FROM eligible e
      LEFT JOIN attendance a ON a.session_id = e.id
      GROUP BY e.id
    ), series AS (
      SELECT e.session_date, e.title, c.headcount
      FROM eligible e
      JOIN counts c ON c.id = e.id
      ORDER BY e.session_date DESC
      LIMIT 12
    )
    SELECT
      (SELECT COUNT(*)::int FROM eligible) AS sessions_count,
      (
        SELECT COUNT(*)::int
        FROM members
        WHERE club_id = ${club.id}
          AND status = 'active'
      ) AS active_members,
      (
        SELECT COUNT(*)::int
        FROM attendance a
        JOIN eligible e ON e.id = a.session_id
      ) AS total_checkins,
      COALESCE((SELECT ROUND(AVG(headcount))::int FROM counts), 0) AS avg_headcount,
      COALESCE((
        SELECT json_agg(
          json_build_object(
            'date', session_date,
            'title', title,
            'headcount', headcount
          )
          ORDER BY session_date
        )
        FROM series
      ), '[]'::json) AS series,
      COALESCE((
        SELECT json_agg(session_date ORDER BY session_date DESC)
        FROM eligible
      ), '[]'::json) AS all_dates,
      (now() AT TIME ZONE ${club.timezone})::date AS today
  `;

  const leaderboardRows = await sql`
    WITH eligible AS (
      SELECT id, session_date
      FROM sessions
      WHERE club_id = ${club.id}
        AND status = 'scheduled'
        AND session_date <= (now() AT TIME ZONE ${club.timezone})::date
    ), attendance_dates AS (
      SELECT a.member_id, e.session_date
      FROM attendance a
      JOIN eligible e ON e.id = a.session_id
      WHERE a.member_id IS NOT NULL
    )
    SELECT
      m.id::text AS id,
      m.display_name,
      COUNT(ad.session_date)::int AS attended,
      COALESCE(
        json_agg(ad.session_date ORDER BY ad.session_date DESC)
          FILTER (WHERE ad.session_date IS NOT NULL),
        '[]'::json
      ) AS dates
    FROM members m
    LEFT JOIN attendance_dates ad ON ad.member_id = m.id
    WHERE m.club_id = ${club.id}
      AND m.status = 'active'
    GROUP BY m.id
    ORDER BY attended DESC, lower(m.display_name)
    LIMIT 10
  `;

  const totals = totalsRows[0];
  const allDates = asArray(totals.all_dates).map(String);
  const today = String(totals.today);
  const leaderboard = leaderboardRows.map((row) => {
    const attendedDates = new Set(asArray(row.dates).map(String));
    let streak = 0;

    for (const date of allDates) {
      if (date === today && !attendedDates.has(date)) {
        continue;
      }

      if (!attendedDates.has(date)) {
        break;
      }

      streak += 1;
    }

    return {
      id: row.id,
      name: row.display_name,
      attended: row.attended,
      streak,
    };
  });

  return json({
    totals: {
      sessions: totals.sessions_count,
      activeMembers: totals.active_members,
      checkIns: totals.total_checkins,
      averageHeadcount: totals.avg_headcount,
    },
    series: asArray(totals.series),
    leaderboard,
  });
}
