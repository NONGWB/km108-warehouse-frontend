# KM 108 Shop - ระบบค้นหาและเปรียบเทียบราคาสินค้า

โปรเจกต์นี้เป็น Responsive Single Page Application สำหรับร้าน KM 108 Shop เพื่อใช้ในการค้นหาสินค้าและเปรียบเทียบราคาจากหลายร้าน พัฒนาด้วย Next.js, TypeScript และ Material-UI

## คุณสมบัติหลัก

### 1. หน้าค้นหาข้อมูลสินค้า
- ค้นหาสินค้าตามชื่อ
- แสดงราคาขายของสินค้า
- แสดงราคาจากร้านทั้ง 4 ร้าน
- แสดงราคาต่ำสุดและร้านที่ถูกที่สุด
- Responsive design สำหรับใช้งานบนมือถือ

### 2. หน้าจัดการข้อมูลสินค้า
- เพิ่มสินค้าใหม่
- แก้ไขข้อมูลสินค้า
- ลบสินค้า
- แสดงรายการสินค้าทั้งหมด

## โครงสร้างข้อมูล

ข้อมูลสินค้าจัดเก็บในไฟล์ CSV (`data/products.csv`) ที่มีฟิลด์ดังนี้:
1. **ProductName** - ชื่อสินค้า
2. **SalePrice** - ราคาขาย
3. **Store1Name** - ชื่อร้านที่ 1
4. **Store1Price** - ราคาที่ร้านที่ 1
5. **Store2Name** - ชื่อร้านที่ 2
6. **Store2Price** - ราคาที่ร้านที่ 2
7. **Store3Name** - ชื่อร้านที่ 3
8. **Store3Price** - ราคาที่ร้านที่ 3
9. **Store4Name** - ชื่อร้านที่ 4
10. **Store4Price** - ราคาที่ร้านที่ 4

แต่ละสินค้าสามารถเปรียบเทียบราคาจาก 4 ร้านได้ โดยแต่ละร้านจะมีชื่อและราคาของตัวเอง

## เทคโนโลยีที่ใช้

- **Next.js 15** - React Framework
- **TypeScript** - Type-safe JavaScript
- **Material-UI (MUI)** - UI Component Library
- **PapaParse** - CSV Parser
- **Emotion** - CSS-in-JS Library

## การติดตั้งและรันโปรเจกต์

### 1. ติดตั้ง Dependencies

```bash
npm install
```

### 2. รันโปรเจกต์ในโหมด Development

```bash
npm run dev
```

เปิดเบราว์เซอร์และเข้าไปที่ [http://localhost:3000](http://localhost:3000)

### 3. Build สำหรับ Production

```bash
npm run build
npm start
```

## โครงสร้างโปรเจกต์

```
KM108Warehouse-frontend/
├── app/
│   ├── api/
│   │   └── products/
│   │       └── route.ts          # API Routes สำหรับ CRUD
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # หน้าหลัก (Search + Manage)
├── components/
│   └── ManageProducts.tsx        # Component จัดการสินค้า
├── data/
│   └── products.csv              # ข้อมูลสินค้า
├── lib/
│   └── csv.ts                    # CSV utilities
├── types/
│   └── product.ts                # TypeScript types
├── theme.ts                      # MUI theme configuration
├── package.json
├── tsconfig.json
└── next.config.js
```

## API Endpoints

### GET /api/products
ดึงข้อมูลสินค้าทั้งหมด

### POST /api/products
เพิ่มสินค้าใหม่
```json
{
  "ProductName": "ชื่อสินค้า",
  "SalePrice": 100,
  "Store1Name": "ร้านสยาม",
  "Store1Price": 80,
  "Store2Name": "ร้านเอกชัย",
  "Store2Price": 75,
  "Store3Name": "ร้านไทยไทย",
  "Store3Price": 78,
  "Store4Name": "ร้านอรุณ",
  "Store4Price": 82
}
```

### PUT /api/products
แก้ไขข้อมูลสินค้า
```json
{
  "oldName": "ชื่อเดิม",
  "ProductName": "ชื่อใหม่",
  "SalePrice": 100,
  "Store1Name": "ร้านสยาม",
  "Store1Price": 80,
  "Store2Name": "ร้านเอกชัย",
  "Store2Price": 75,
  "Store3Name": "ร้านไทยไทย",
  "Store3Price": 78,
  "Store4Name": "ร้านอรุณ",
  "Store4Price": 82
}
```

### DELETE /api/products?name={productName}
ลบสินค้า

## Features Responsive Design

- ใช้ MUI Grid และ responsive breakpoints
- ซ่อนคอลัมน์บางส่วนบนหน้าจอเล็ก
- Navigation ที่ใช้งานง่ายบนมือถือ
- Form และ Dialog ที่รองรับหน้าจอทุกขนาด

## การพัฒนาเพิ่มเติม

### เพิ่มสินค้า
1. ไปที่แท็บ "จัดการสินค้า"
2. คลิกปุ่ม "เพิ่มสินค้า"
3. กรอกข้อมูลสินค้า
4. คลิก "เพิ่ม"

### แก้ไขสินค้า
1. คลิกไอคอน Edit (ดินสอ) ในตารางสินค้า
2. แก้ไขข้อมูล
3. คลิก "บันทึก"

### ลบสินค้า
1. คลิกไอคอน Delete (ถังขยะ) ในตารางสินค้า
2. ยืนยันการลบ

## License

MIT
