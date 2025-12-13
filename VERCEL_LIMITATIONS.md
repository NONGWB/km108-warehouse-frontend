# Vercel Deployment Limitations

## ปัญหา: ไม่สามารถเพิ่ม/แก้ไข/ลบสินค้าบน Vercel ได้

### สาเหตุ
Vercel ใช้ระบบ Serverless ซึ่งมี **read-only filesystem** หมายความว่า:
- ✅ อ่านไฟล์ CSV ได้ (ข้อมูลที่ deploy ไปพร้อมโปรเจค)
- ❌ เขียนไฟล์ CSV ไม่ได้ (ไม่สามารถบันทึกข้อมูลใหม่)
- ❌ เพิ่ม/แก้ไข/ลบสินค้าทำไม่ได้บน production

Error ที่จะเห็น:
```
500 Internal Server Error
"Cannot write to filesystem in serverless environment. Data is read-only on Vercel."
```

## วิธีแก้ปัญหาชั่วคราว

### สำหรับ Development (Localhost)
ใช้งานได้ปกติ เพราะเป็น Node.js server ปกติที่มี filesystem

### สำหรับ Production (Vercel)
มี 2 ตัวเลือก:

#### ตัวเลือก 1: ใช้ CSV แบบ Read-only (วิธีง่าย)
1. **จัดการข้อมูลบน localhost**
   ```
   - เพิ่ม/แก้ไข/ลบสินค้าบน localhost
   - Export CSV (ปุ่ม "Export CSV" ในหน้า Manage Products)
   ```

2. **แทนที่ไฟล์ CSV ใน project**
   ```
   - คัดลอกไฟล์ CSV ที่ export ไปแทนที่ data/products.csv
   - Commit และ push ไป GitHub
   ```

3. **Deploy ใหม่**
   ```
   - Vercel จะ auto-deploy เมื่อมีการ push
   - หรือกด "Redeploy" ใน Vercel Dashboard
   ```

**ข้อดี:**
- ไม่ต้องเปลี่ยน code
- ไม่มีค่าใช้จ่าย
- เหมาะกับข้อมูลที่อัพเดทไม่บ่อย

**ข้อเสีย:**
- ต้อง deploy ใหม่ทุกครั้งที่แก้ข้อมูล
- ไม่สามารถให้ user เพิ่มข้อมูลบน production ได้

#### ตัวเลือก 2: ใช้ Database (แนะนำสำหรับระยะยาว)

##### 2.1 Vercel Postgres (ฟรี 60 ชั่วโมงคอมพิวต์/เดือน)
```bash
# ติดตั้ง Vercel CLI
npm i -g vercel

# Link project
vercel link

# เพิ่ม Postgres
vercel postgres create
```

##### 2.2 Supabase (ฟรี 500MB, unlimited API requests)
1. สมัคร [Supabase](https://supabase.com)
2. สร้าง project
3. สร้าง table:
```sql
CREATE TABLE products (
  product_name TEXT PRIMARY KEY,
  sale_price NUMERIC,
  store1_name TEXT,
  store1_price NUMERIC,
  store2_name TEXT,
  store2_price NUMERIC,
  store3_name TEXT,
  store3_price NUMERIC,
  store4_name TEXT,
  store4_price NUMERIC
);
```
4. ติดตั้ง client:
```bash
npm install @supabase/supabase-js
```

##### 2.3 Vercel KV (Redis, ฟรี 256MB)
```bash
vercel kv create
```

## สรุป

| วิธี | ความง่าย | ราคา | เหมาะกับ |
|------|---------|------|----------|
| CSV Read-only | ⭐⭐⭐⭐⭐ | ฟรี | ข้อมูลเปลี่ยนไม่บ่อย, admin เท่านั้น |
| Vercel Postgres | ⭐⭐⭐ | ฟรี (จำกัด) | App ที่ต้องการ CRUD แบบ real-time |
| Supabase | ⭐⭐⭐⭐ | ฟรี (generous) | App ที่ต้องการ database จริงๆ |
| Vercel KV | ⭐⭐⭐ | ฟรี (256MB) | Key-value storage, cache |

## ทำไมต้องเป็นแบบนี้?

Vercel เป็น **Serverless Platform** ซึ่ง:
- Functions ทำงานใน container ที่เป็น read-only
- ทุก request อาจไปที่ container คนละตัว (ไม่มี shared filesystem)
- ออกแบบมาให้ scalable และ stateless
- ข้อมูลต้องเก็บใน database หรือ external storage เท่านั้น

ถ้าต้องการให้ CRUD ทำงานได้บน production **จำเป็นต้องใช้ database**
