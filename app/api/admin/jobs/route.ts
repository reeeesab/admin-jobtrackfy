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

type JobUpsertData = {
  company: string;
  position: string;
  location: string | null;
  job_url: string;
  description: string | null;
  employment_type: string | null;
  job_type: string | null;
  salary_range: string | null;
  status: JobStatus;
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

function validatePayload(payload: JobPayload): { data?: JobUpsertData; error?: string } {
  const company = normalizeText(payload.company);
  const position = normalizeText(payload.position);
  const jobUrl = normalizeText(payload.jobUrl);
  const status = normalizeStatus(payload.status);

  if (!company) return { error: 'Company is required' };
  if (!position) return { error: 'Position is required' };
  if (!jobUrl) return { error: 'Job URL is required' };

  return {
    data: {
      company,
      position,
      job_url: jobUrl,
      location: normalizeOptional(payload.location),
      description: normalizeOptional(payload.description),
      employment_type: normalizeOptional(payload.employmentType),
      job_type: normalizeOptional(payload.jobType),
      salary_range: normalizeOptional(payload.salaryRange),
      status,
    },
  };
}

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('admin_jobs')
      .select('id, company, position, location, job_url, description, employment_type, job_type, salary_range, status, posted_at, created_at, updated_at')
      .order('posted_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ jobs: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as JobPayload;
    const parsed = validatePayload(payload);
    if (!parsed.data) {
      return NextResponse.json({ error: parsed.error || 'Invalid payload' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('admin_jobs')
      .insert(parsed.data)
      .select('id, company, position, location, job_url, description, employment_type, job_type, salary_range, status, posted_at, created_at, updated_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ job: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
