import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuthenticatedUser } from '@/lib/api/auth';

export const runtime = 'nodejs';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const SEARCH_QUERY_MAX_LENGTH = 200;
const GENERATION_LIST_SELECT_COLUMNS =
  'id, title, model, attempt_index, prefs, composition_key:composition->>key, created_at';

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

const sanitizeSearchQuery = (raw: string) =>
  raw
    .replace(/[%_]/g, '')
    .replace(/[(),]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export async function GET(req: Request) {
  const supabase = await createClient();
  const authResult = await requireAuthenticatedUser(supabase, 'Unauthorized.');
  if (authResult.ok === false) {
    return authResult.response;
  }
  const user = authResult.user;

  const requestUrl = new URL(req.url);
  const requestedLimit = parsePositiveInt(
    requestUrl.searchParams.get('limit') ?? '',
    DEFAULT_LIMIT
  );
  const requestedOffset = parsePositiveInt(
    requestUrl.searchParams.get('offset') ?? '',
    0
  );
  const searchQuery = (requestUrl.searchParams.get('q') ?? '').trim();

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

  if (searchQuery.length > SEARCH_QUERY_MAX_LENGTH) {
    return NextResponse.json(
      { error: `q must be ${SEARCH_QUERY_MAX_LENGTH} characters or less.` },
      { status: 400 }
    );
  }

  const limit = requestedLimit;
  const offset = requestedOffset;
  const queryEnd = offset + limit;
  let query = supabase
    .from('generations')
    .select(GENERATION_LIST_SELECT_COLUMNS)
    .eq('user_id', user.id);

  if (searchQuery.length > 0) {
    const normalizedSearch = sanitizeSearchQuery(searchQuery);
    if (normalizedSearch.length === 0) {
      return NextResponse.json({
        generations: [],
        pagination: {
          offset,
          limit,
          hasMore: false,
          nextOffset: null
        }
      });
    }

    const searchPattern = `%${normalizedSearch}%`;
    query = query.or(
      `title.ilike.${searchPattern},model.ilike.${searchPattern},prefs->>prompt.ilike.${searchPattern},composition->>key.ilike.${searchPattern}`
    );
  }

  const { data, error } = await query
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
  const authResult = await requireAuthenticatedUser(supabase, 'Unauthorized.');
  if (authResult.ok === false) {
    return authResult.response;
  }
  const user = authResult.user;

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
