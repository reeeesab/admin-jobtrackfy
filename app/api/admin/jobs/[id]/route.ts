import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';

type JobStatus = 'draft' | 'published' | 'archived';

type JobPayload = {
  company?: unknown;
  position?: unknown;
  location?: unknown;
  jobUrl?: unknown;
  description?: unknown;
  employmentType?: unknown;
  jobType?: unknown;
  salaryRange?: unknown;
  status?: unknown;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

function normalizeStatus(value: unknown): JobStatus {
  return value === 'draft' || value === 'archived' ? value : 'published';
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOptional(value: unknown): string | null {
  const text = normalizeText(value);
  return text ? text : null;
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('admin_jobs')
      .select('id, company, position, location, job_url, description, employment_type, job_type, salary_range, status, posted_at, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    return NextResponse.json({ job: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as JobPayload;

    const company = normalizeText(payload.company);
    const position = normalizeText(payload.position);
    const jobUrl = normalizeText(payload.jobUrl);
    const status = normalizeStatus(payload.status);

    if (!company) return NextResponse.json({ error: 'Company is required' }, { status: 400 });
    if (!position) return NextResponse.json({ error: 'Position is required' }, { status: 400 });
    if (!jobUrl) return NextResponse.json({ error: 'Job URL is required' }, { status: 400 });

    const updatePayload = {
      company,
      position,
      job_url: jobUrl,
      location: normalizeOptional(payload.location),
      description: normalizeOptional(payload.description),
      employment_type: normalizeOptional(payload.employmentType),
      job_type: normalizeOptional(payload.jobType),
      salary_range: normalizeOptional(payload.salaryRange),
      status,
      updated_at: new Date().toISOString(),
    };

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('admin_jobs')
      .update(updatePayload)
      .eq('id', id)
      .select('id, company, position, location, job_url, description, employment_type, job_type, salary_range, status, posted_at, created_at, updated_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    return NextResponse.json({ job: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from('admin_jobs').delete().eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
