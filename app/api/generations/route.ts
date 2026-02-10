import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const parsePositiveInt = (value: string, fallback: number) => {
  if (!value) {
    return fallback;
  }

  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
};

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const requestUrl = new URL(req.url);
  const requestedLimit = parsePositiveInt(
    requestUrl.searchParams.get('limit') ?? '',
    DEFAULT_LIMIT
  );
  const requestedOffset = parsePositiveInt(
    requestUrl.searchParams.get('offset') ?? '',
    0
  );

  if (
    requestedLimit === null ||
    requestedLimit < 1 ||
    requestedLimit > MAX_LIMIT ||
    requestedOffset === null
  ) {
    return NextResponse.json(
      {
        error: `limit must be an integer between 1 and ${MAX_LIMIT}, and offset must be a non-negative integer.`
      },
      { status: 400 }
    );
  }

  const limit = requestedLimit;
  const offset = requestedOffset;
  const queryEnd = offset + limit;

  const { data, error } = await supabase
    .from('generations')
    .select('id, title, model, attempt_index, prefs, composition, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, queryEnd);

  if (error) {
    console.error('Failed to fetch generations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch generations.' },
      { status: 500 }
    );
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const generations = hasMore ? rows.slice(0, limit) : rows;

  return NextResponse.json({
    generations,
    pagination: {
      offset,
      limit,
      hasMore,
      nextOffset: hasMore ? offset + limit : null
    }
  });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { count, error: countError } = await supabase
    .from('generations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (countError) {
    console.error('Failed to count generations before delete:', countError);
    return NextResponse.json(
      { error: 'Failed to delete generations.' },
      { status: 500 }
    );
  }

  const { error } = await supabase
    .from('generations')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to delete generations:', error);
    return NextResponse.json(
      { error: 'Failed to delete generations.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ deleted: true, deletedCount: count ?? 0 });
}
