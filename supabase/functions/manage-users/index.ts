import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const roles = new Set(['admin', 'shop_owner', 'seller']);
const managerRoles = ['admin', 'shop_owner'];
const usernamePattern = /^[a-z0-9._-]{3,50}$/;
const internalEmail = (username: string) => `${username.trim().toLowerCase()}@pos.km108.local`;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Authentication required' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: 'Authentication required' }, 401);

  const { data: actor } = await admin.from('profiles').select('role, is_active').eq('id', user.id).single();
  if (!actor?.is_active || !managerRoles.includes(actor.role)) return json({ error: 'Permission denied' }, 403);

  try {
    const body = await request.json();
    if (body.action === 'create') {
      const username = String(body.username || '').trim().toLowerCase();
      const password = String(body.password || '');
      const name = String(body.name || '').trim();
      const role = String(body.role || '');
      if (!usernamePattern.test(username) || password.length < 8 || !name || name.length > 255 || !roles.has(role)) {
        return json({ error: 'ข้อมูลผู้ใช้ไม่ถูกต้อง' }, 400);
      }

      const { data: created, error } = await admin.auth.admin.createUser({
        email: internalEmail(username),
        password,
        email_confirm: true,
        user_metadata: { name },
        app_metadata: { username, role },
      });
      if (error || !created.user) return json({ error: error?.message || 'สร้างผู้ใช้ไม่สำเร็จ' }, 400);

      const { data: profile, error: profileError } = await admin.from('profiles').upsert({
        id: created.user.id,
        username,
        name,
        role,
        is_active: true,
      }).select('*').single();
      if (profileError) {
        await admin.auth.admin.deleteUser(created.user.id);
        return json({ error: profileError.message }, 500);
      }
      return json({ profile }, 201);
    }

    if (body.action === 'update') {
      const id = String(body.id || '');
      const name = String(body.name || '').trim();
      const role = String(body.role || '');
      const password = typeof body.password === 'string' ? body.password : '';
      const isActive = body.is_active !== false;
      if (!id || !name || name.length > 255 || !roles.has(role) || (password && password.length < 8)) {
        return json({ error: 'ข้อมูลผู้ใช้ไม่ถูกต้อง' }, 400);
      }
      if (id === user.id && !isActive) return json({ error: 'ไม่สามารถปิดบัญชีที่กำลังใช้งานอยู่' }, 400);

      const { data: target } = await admin.from('profiles').select('username, role, is_active').eq('id', id).single();
      if (!target) return json({ error: 'ไม่พบผู้ใช้' }, 404);
      if (target.is_active && managerRoles.includes(target.role) && (!isActive || !managerRoles.includes(role))) {
        const { count } = await admin.from('profiles').select('*', { count: 'exact', head: true })
          .eq('is_active', true).in('role', managerRoles);
        if ((count || 0) <= 1) return json({ error: 'ต้องมี Admin หรือ Shop Owner ที่ใช้งานได้อย่างน้อย 1 คน' }, 400);
      }

      const { data: profile, error: profileError } = await admin.from('profiles')
        .update({ name, role, is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id).select('*').single();
      if (profileError) return json({ error: profileError.message }, 500);

      const attributes: {
        user_metadata: { name: string };
        app_metadata: { username: string; role: string };
        ban_duration: string;
        password?: string;
      } = {
        user_metadata: { name },
        app_metadata: { username: target.username, role },
        ban_duration: isActive ? 'none' : '876000h',
      };
      if (password) attributes.password = password;
      const { error: authError } = await admin.auth.admin.updateUserById(id, attributes);
      if (authError) return json({ error: authError.message }, 500);
      return json({ profile });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
});
