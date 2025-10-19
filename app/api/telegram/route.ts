import { NextRequest, NextResponse } from 'next/server';
import { generateRoomId } from '@/lib/client-utils';

type TelegramUpdate = {
  inline_query?: {
    id: string;
    query: string;
    from?: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
  };
};

type InlineQueryResultArticle = {
  type: 'article';
  id: string;
  title: string;
  description?: string;
  input_message_content: {
    message_text: string;
    parse_mode?: 'MarkdownV2' | 'Markdown' | 'HTML';
  };
  reply_markup?: {
    inline_keyboard: Array<
      Array<{
        text: string;
        url: string;
      }>
    >;
  };
};

async function answerInlineQuery(
  token: string,
  inlineQueryId: string,
  results: InlineQueryResultArticle[],
) {
  const payload = {
    inline_query_id: inlineQueryId,
    results,
    cache_time: 0,
    is_personal: true,
  };

  const response = await fetch(`https://api.telegram.org/bot${token}/answerInlineQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram API error: ${errorText}`);
  }
}

export async function POST(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const baseUrl = process.env.TELEGRAM_CALL_BASE_URL;

  if (!token || !baseUrl) {
    console.error('Telegram bot misconfigured: missing token or base URL');
    return NextResponse.json({ ok: false, error: 'Bot misconfigured' }, { status: 500 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch (error) {
    console.error('Failed to parse Telegram update', error);
    return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
  }

  if (!update.inline_query) {
    return NextResponse.json({ ok: true });
  }

  const roomId = generateRoomId();
  const callUrl = new URL(`/rooms/${roomId}`, baseUrl).toString();

  const result: InlineQueryResultArticle = {
    type: 'article',
    id: roomId,
    title: 'Создать созвон',
    description: 'Отправить ссылку на новую комнату',
    input_message_content: {
      message_text: `Присоединяйтесь к созвону: ${callUrl}`,
    },
    reply_markup: {
      inline_keyboard: [[{ text: 'Перейти к созвону', url: callUrl }]],
    },
  };

  try {
    await answerInlineQuery(token, update.inline_query.id, [result]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to answer inline query', error);
    return NextResponse.json({ ok: false, error: 'Failed to answer inline query' }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
