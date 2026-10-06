# ตั้งค่า Login และ Permission

ระบบใช้ Supabase Auth สำหรับรหัสผ่าน, ตาราง `profiles` สำหรับข้อมูลผู้ใช้/role และ RLS สำหรับบังคับสิทธิ์ในฐานข้อมูล ไม่ได้เก็บรหัสผ่านไว้ในตารางของแอป

## 1. รัน migration

เปิด Supabase SQL Editor แล้วรันไฟล์ `scripts/create-auth-and-permissions.sql`

Migration จะสร้าง `profiles`, เพิ่มผู้ขายใน `sales`, สร้าง bucket รูปผู้ใช้ และแทน policy แบบ public เดิมด้วย policy สำหรับผู้ใช้ที่ Login แล้ว

ถ้าเคยรัน migration หลักไปแล้ว และต้องการอัปเดตสิทธิ์ Seller ให้เพิ่ม/แก้ไขข้อมูลหลังร้านได้โดยลบไม่ได้ ให้รัน `scripts/update-role-menu-permissions.sql` เพิ่มอีกหนึ่งครั้ง

## 2. Deploy ฟังก์ชันจัดการผู้ใช้

ติดตั้งและ Login Supabase CLI แล้วเชื่อม project จากนั้นรัน:

```bash
npx supabase link --project-ref <project-ref>
npx supabase functions deploy manage-users
```

ฟังก์ชันนี้เป็นจุดเดียวที่ใช้ service role เพื่อสร้างบัญชีหรือเปลี่ยน role โดยตรวจซ้ำว่าผู้เรียกเป็น Admin/Shop Owner

## 3. สร้าง Admin คนแรก

ใส่ `SUPABASE_SECRET_KEY` (หรือ `SUPABASE_SERVICE_ROLE_KEY`) ใน `.env.local` ชั่วคราว แล้วรัน:

```bash
npm run auth:create-admin -- admin "รหัสผ่านอย่างน้อย8ตัว" "ชื่อผู้ดูแล" admin
```

หลังสร้างสำเร็จสามารถลบ secret key จาก `.env.local` ได้ การเพิ่มผู้ใช้รายต่อไปทำผ่านเมนู **จัดการหลังร้าน > จัดการผู้ใช้งาน**

## สิทธิ์

- `Admin`: เห็น Dashboard, จัดการสินค้า, ลูกค้า และผู้ใช้งาน โดยซ่อนหน้าขายสินค้า ประวัติใบแจ้งหนี้ ค้นหาสินค้า รายการเติมสต็อค และข้อมูลร้านค้า/เซลล์
- `Shop Owner`: ใช้งานทุกเมนูและจัดการผู้ใช้ได้
- `Seller`: เห็นหน้าขาย/ใบแจ้งหนี้และเมนูหลังร้านทุกเมนูยกเว้นจัดการผู้ใช้ เพิ่มหรือแก้ไขได้ แต่ลบรายการที่บันทึกแล้วไม่ได้
- สินค้าในตะกร้าที่ยังไม่บันทึกสามารถเอาออกได้ทุก role

## ความปลอดภัยของแอป Desktop

ขั้นตอนเตรียม Electron จะคัดลอกเฉพาะ `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY` เข้าแอป ไม่คัดลอก secret/service-role key ลง `.exe`
