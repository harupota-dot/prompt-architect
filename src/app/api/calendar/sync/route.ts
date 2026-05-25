import { NextRequest, NextResponse } from 'next/server';

interface SyncTask {
  title:         string;
  description?:  string;
  scheduledDate: string;        // YYYY-MM-DD
  scheduledTime?: string;       // HH:MM
  estimatedMin?:  number;
  recurrence?:    'none' | 'daily' | 'weekly';
}

interface SyncResult {
  title:    string;
  success:  boolean;
  eventId?: string;
  error?:   string;
}

/**
 * POST /api/calendar/sync
 * Body: { tasks: SyncTask[], accessToken: string, calendarId?: string }
 *
 * アプリ内タスクをGoogleカレンダーにイベントとして登録する。
 * accessToken は localStorage 'gcal_access_token' から取得してフロントが渡す。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      tasks:       SyncTask[];
      accessToken: string;
      calendarId?: string;
    };

    const { tasks, accessToken, calendarId = 'primary' } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Googleアクセストークンがありません。「Googleと連携」ボタンから再認証してください。' },
        { status: 401 }
      );
    }

    if (!tasks?.length) {
      return NextResponse.json({ error: '同期するタスクがありません' }, { status: 400 });
    }

    const results: SyncResult[] = [];

    for (const task of tasks) {
      try {
        const event = buildCalendarEvent(task);
        const apiRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
          {
            method:  'POST',
            headers: {
              Authorization:  `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          }
        );

        if (!apiRes.ok) {
          const errData = await apiRes.json() as { error?: { message?: string } };
          const errMsg  = errData.error?.message ?? `HTTP ${apiRes.status}`;
          results.push({ title: task.title, success: false, error: errMsg });
        } else {
          const created = await apiRes.json() as { id?: string };
          results.push({ title: task.title, success: true, eventId: created.id });
        }
      } catch (taskErr) {
        results.push({ title: task.title, success: false, error: String(taskErr) });
      }
    }

    const succeeded = results.filter(r => r.success).length;
    return NextResponse.json({
      results,
      succeeded,
      total: tasks.length,
      message: `${succeeded}/${tasks.length}件をGoogleカレンダーに同期しました！`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '不明なエラー';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Google Calendar イベントオブジェクト生成 ─────────────────────────

function buildCalendarEvent(task: SyncTask): Record<string, unknown> {
  // 繰り返し設定
  let recurrence: string[] | undefined;
  if (task.recurrence === 'daily')  recurrence = ['RRULE:FREQ=DAILY'];
  if (task.recurrence === 'weekly') recurrence = ['RRULE:FREQ=WEEKLY'];

  // 時間指定あり → datetime イベント
  if (task.scheduledTime) {
    const durationMin = task.estimatedMin ?? 60;
    const [h, m]      = task.scheduledTime.split(':').map(Number);
    const endTotalMin = h * 60 + m + durationMin;
    const endH        = Math.floor(endTotalMin / 60);
    const endM        = endTotalMin % 60;
    const endTime     = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    const startDT = `${task.scheduledDate}T${task.scheduledTime}:00`;
    const endDT   = `${task.scheduledDate}T${endTime}:00`;

    return {
      summary:     `🔥 ${task.title}`,
      description: task.description
        ? `${task.description}\n\n（スパルタAIから同期）`
        : 'スパルタAIから同期',
      start:     { dateTime: startDT, timeZone: 'Asia/Tokyo' },
      end:       { dateTime: endDT,   timeZone: 'Asia/Tokyo' },
      colorId:   '11', // Tomato
      ...(recurrence ? { recurrence } : {}),
    };
  }

  // 時間指定なし → 終日イベント
  return {
    summary:     `🔥 ${task.title}`,
    description: task.description
      ? `${task.description}\n\n（スパルタAIから同期）`
      : 'スパルタAIから同期',
    start:   { date: task.scheduledDate },
    end:     { date: task.scheduledDate },
    colorId: '11',
    ...(recurrence ? { recurrence } : {}),
  };
}
