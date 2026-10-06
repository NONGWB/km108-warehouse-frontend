import { createClient } from '@supabase/supabase-js';

const [usernameArg, password, nameArg, roleArg = 'admin'] = process.argv.slice(2);
const username = String(usernameArg || '').trim().toLowerCase();
const name = String(nameArg || '').trim();
const role = String(roleArg || 'admin');

if (!/^[a-z0-9._-]{3,50}$/.test(username) || !name || !password || password.length < 8 || !['admin', 'shop_owner'].includes(role)) {
  console.error('Usage: npm run auth:create-admin -- <username> <password-min-8> <display-name> [admin|shop_owner]');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data, error } = await admin.auth.admin.createUser({
  email: `${username}@pos.km108.local`,
  password,
  email_confirm: true,
  user_metadata: { name },
  app_metadata: { username, role },
});

if (error || !data.user) {
  console.error(error?.message || 'Unable to create first admin');
  process.exit(1);
}

const { error: profileError } = await admin.from('profiles').upsert({
  id: data.user.id,
  username,
  name,
  role,
  is_active: true,
});
if (profileError) {
  await admin.auth.admin.deleteUser(data.user.id);
  console.error(profileError.message);
  process.exit(1);
}

console.log(`Created ${role} account: ${username}`);
