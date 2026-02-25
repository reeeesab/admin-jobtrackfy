import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';

const DEFAULT_BUCKET = 'blog-images';

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image');

    if (!(image instanceof File)) {
      return NextResponse.json({ error: 'Image file is required.' }, { status: 400 });
    }

    if (!image.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image uploads are allowed.' }, { status: 400 });
    }

    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be 5MB or smaller.' }, { status: 400 });
    }

    const bucket = process.env.SUPABASE_BLOG_IMAGES_BUCKET || DEFAULT_BUCKET;
    const ext = image.name.includes('.') ? image.name.split('.').pop() : 'png';
    const safeName = sanitizeFileName(image.name.replace(/\.[^.]+$/, '')) || 'image';
    const path = `posts/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}.${ext}`;

    const supabase = createSupabaseAdminClient();
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: image.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl, path, bucket }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload image';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
