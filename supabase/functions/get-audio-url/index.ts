import { createClient } from 'jsr:@supabase/supabase-js@2';
import { S3Client, GetObjectCommand } from 'npm:@aws-sdk/client-s3@3';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3';

const r2 = new S3Client({
  region: 'auto',
  endpoint: Deno.env.get('R2_ENDPOINT')!,
  credentials: {
    accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!,
    secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
  },
});

const BUCKET = Deno.env.get('R2_BUCKET_NAME')!;
const URL_TTL = 300; // 5 minutes

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Non autorisé' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return json({ error: 'Non autorisé' }, 401);

  let r2_key: string;
  try {
    ({ r2_key } = await req.json());
  } catch {
    return json({ error: 'Corps de requête invalide' }, 400);
  }

  if (!r2_key || typeof r2_key !== 'string') {
    return json({ error: 'r2_key manquant' }, 400);
  }

  try {
    const url = await getSignedUrl(
      r2,
      new GetObjectCommand({ Bucket: BUCKET, Key: r2_key }),
      { expiresIn: URL_TTL }
    );
    return json({ url });
  } catch {
    return json({ error: 'Erreur génération URL' }, 500);
  }
});
