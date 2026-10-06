import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { Sale } from '@/types/sale';

const formatMoney = (value: number) =>
  Number(value || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatThaiDate = (value: string) =>
  new Date(value).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const formatThaiDateTime = (value: string) =>
  new Date(value).toLocaleString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export function buildSaleA4Document(sale: Sale): TDocumentDefinitions {
    const documentType = sale.document_type === 'company_receipt' ? 'company_receipt' : 'invoice';
    const isInvoice = documentType === 'invoice';
    const documentTitle = isInvoice ? 'ใบแจ้งหนี้' : 'ใบเสร็จรับเงิน';
    const documentTitleEn = isInvoice ? 'INVOICE' : 'RECEIPT';
    const documentNumber = sale.document_number || `INV-${sale.id?.substring(0, 8).toUpperCase() || '-'}`;
    const isPaid = !isInvoice || sale.payment_status === 'paid';
    const isVoided = sale.status === 'voided';

    const itemRows: TableCell[][] = sale.items.map((item, index) => [
      { text: String(index + 1), alignment: 'center' },
      {
        stack: [
          { text: item.product_name, bold: true },
          ...(item.barcode ? [{ text: `บาร์โค้ด: ${item.barcode}`, color: '#71717a', fontSize: 8 }] : []),
        ],
      },
      { text: formatMoney(item.unit_price), alignment: 'right' },
      { text: String(item.quantity), alignment: 'center' },
      { text: formatMoney(item.total_price), alignment: 'right', bold: true },
    ]);

    const paymentStatus: Content = {
      table: {
        widths: ['*'],
        body: [[{
          text: isVoided
            ? `สถานะ: ยกเลิกแล้ว${sale.voided_at ? ` เมื่อ ${formatThaiDate(sale.voided_at)}` : ''}${sale.void_reason ? `\nเหตุผล: ${sale.void_reason}` : ''}`
            : isPaid
            ? `สถานะ: ชำระแล้ว${sale.paid_at ? ` เมื่อ ${formatThaiDate(sale.paid_at)}` : ''}`
            : 'สถานะ: ยังไม่ชำระเงิน',
          bold: true,
          alignment: 'center',
          color: '#18181b',
          fillColor: '#f4f4f5',
          margin: [8, 7],
        }]],
      },
      layout: 'noBorders',
      margin: [0, 14, 0, 0],
    };

    return {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [42, 38, 42, 52],
      watermark: isVoided
        ? {
            text: 'ยกเลิก',
            color: '#18181b',
            opacity: 0.16,
            bold: true,
            font: 'GoogleSans',
            fontSize: 96,
            angle: -30,
          }
        : isInvoice && isPaid
        ? {
            text: 'ชำระแล้ว',
            color: '#18181b',
            opacity: 0.12,
            bold: true,
            font: 'GoogleSans',
            fontSize: 88,
            angle: -30,
          }
        : undefined,
      info: {
        title: `${documentTitle} ${documentNumber}`,
        author: 'KM 108 Shop',
        subject: documentTitle,
      },
      defaultStyle: {
        font: 'GoogleSans',
        fontSize: 10,
        color: '#18181b',
        lineHeight: 1.2,
      },
      footer: (currentPage, pageCount) => ({
        columns: [
          { text: 'KM 108 Shop | โทร. 065-0346095', color: '#71717a', fontSize: 8 },
          { text: `หน้า ${currentPage} / ${pageCount}`, alignment: 'right', color: '#71717a', fontSize: 8 },
        ],
        margin: [42, 12, 42, 0],
      }),
      content: [
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'KM 108 SHOP', style: 'brand' },
                {
                  text: 'เบอร์ติดต่อ: 065-0346095',
                  color: '#52525b',
                  fontSize: 9,
                  margin: [0, 2, 0, 0],
                },
                {
                  text: '273 ม.6 ต.คลองศก อ.พนม จ.สุราษฎร์ธานี 84250',
                  color: '#52525b',
                  fontSize: 9,
                  margin: [0, 4, 0, 0],
                },
              ],
            },
            {
              width: 210,
              stack: [
                { text: documentTitle, style: 'documentTitle', alignment: 'right' },
                { text: documentTitleEn, style: 'documentTitleEn', alignment: 'right' },
              ],
            },
          ],
        },
        {
          table: {
            widths: ['*'],
            body: [['']],
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 0,
            hLineColor: () => '#18181b',
            paddingTop: () => 6,
            paddingBottom: () => 6,
          },
          margin: [0, 5, 0, 8],
        },
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'ข้อมูลลูกค้า', style: 'sectionTitle' },
                { text: sale.customer_name || 'ลูกค้าทั่วไป', bold: true, fontSize: 12, margin: [0, 5, 0, 0] },
                ...(sale.customer_phone ? [{
                  text: [
                    { text: 'เบอร์ติดต่อ: ', bold: true },
                    sale.customer_phone,
                  ],
                  margin: [0, 12, 0, 0] as [number, number, number, number],
                }] : []),
                ...(sale.customer_address ? [{
                  text: [
                    { text: 'ที่อยู่: ', bold: true },
                    sale.customer_address,
                  ],
                  margin: [0, sale.customer_phone ? 4 : 12, 0, 0] as [number, number, number, number],
                }] : []),
              ],
            },
            {
              width: 220,
              table: {
                widths: [85, '*'],
                body: [
                  [{ text: 'เลขที่เอกสาร', color: '#71717a' }, { text: documentNumber, alignment: 'right', bold: true }],
                  [{ text: 'วันที่ออกเอกสาร', color: '#71717a' }, { text: formatThaiDate(sale.sale_date), alignment: 'right' }],
                  [{ text: 'ผู้ขาย', color: '#71717a' }, { text: sale.seller_name || '-', alignment: 'right' }],
                  [{ text: 'วิธีชำระ', color: '#71717a' }, { text: isInvoice ? 'เครดิต' : 'เงินสด', alignment: 'right' }],
                ],
              },
              layout: 'noBorders',
            },
          ],
          columnGap: 24,
          margin: [0, 4, 0, 22],
        },
        {
          table: {
            headerRows: 1,
            widths: [28, '*', 72, 50, 82],
            body: [
              [
                { text: 'ลำดับ', style: 'tableHeader', alignment: 'center' },
                { text: 'รายการสินค้า', style: 'tableHeader' },
                { text: 'ราคา/หน่วย', style: 'tableHeader', alignment: 'right' },
                { text: 'จำนวน', style: 'tableHeader', alignment: 'center' },
                { text: 'จำนวนเงิน', style: 'tableHeader', alignment: 'right' },
              ],
              ...itemRows,
            ],
          },
          layout: {
            hLineWidth: (index) => (index === 0 || index === 1 ? 0 : 0.6),
            vLineWidth: () => 0,
            hLineColor: () => '#d4d4d8',
            paddingLeft: () => 7,
            paddingRight: () => 7,
            paddingTop: () => 8,
            paddingBottom: () => 8,
          },
        },
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: isInvoice ? 'หมายเหตุ / เงื่อนไขการชำระเงิน' : 'หมายเหตุ', style: 'sectionTitle' },
                {
                  text: isVoided
                    ? `เอกสารนี้ถูกยกเลิก${sale.voided_by_name ? ` โดย ${sale.voided_by_name}` : ''}`
                    : isInvoice
                    ? isPaid
                      ? 'ได้รับชำระเงินครบถ้วนแล้ว'
                      : 'กรุณาชำระเงินตามเงื่อนไขที่ตกลงกัน เอกสารนี้ยังไม่ใช่หลักฐานการรับชำระเงิน'
                    : 'ได้รับชำระเงินสดเรียบร้อยแล้ว',
                  color: '#52525b',
                  margin: [0, 6, 25, 0],
                },
              ],
            },
            {
              width: 230,
              table: {
                widths: ['*', 100],
                body: [
                  ['ยอดรวม', { text: `${formatMoney(sale.total_amount)} บาท`, alignment: 'right' }],
                  ['ส่วนลด', { text: `${formatMoney(sale.discount)} บาท`, alignment: 'right' }],
                  [
                    { text: 'ยอดสุทธิ', bold: true, fontSize: 12, fillColor: '#f4f4f5', margin: [5, 5] },
                    { text: `${formatMoney(sale.net_amount)} บาท`, bold: true, fontSize: 12, alignment: 'right', fillColor: '#f4f4f5', margin: [5, 5] },
                  ],
                ],
              },
              layout: 'noBorders',
            },
          ],
          columnGap: 18,
          margin: [0, 18, 0, 0],
        },
        paymentStatus,
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'ลงชื่อ ........................................................', alignment: 'center' },
                { text: '(ผู้รับเอกสาร)', alignment: 'center', color: '#71717a', margin: [0, 7, 0, 0] },
              ],
            },
            {
              width: '*',
              stack: [
                { text: 'ลงชื่อ ........................................................', alignment: 'center' },
                { text: '(ผู้มีอำนาจลงนาม)', alignment: 'center', color: '#71717a', margin: [0, 7, 0, 0] },
              ],
            },
          ],
          columnGap: 35,
          margin: [0, 60, 0, 0],
        },
      ],
      styles: {
        brand: {
          fontSize: 20,
          bold: true,
          color: '#18181b',
        },
        documentTitle: {
          fontSize: 24,
          bold: true,
          color: '#18181b',
        },
        documentTitleEn: {
          fontSize: 10,
          bold: true,
          color: '#71717a',
          characterSpacing: 1.6,
        },
        sectionTitle: {
          fontSize: 10,
          bold: true,
          color: '#18181b',
        },
        tableHeader: {
          bold: true,
          color: '#ffffff',
          fillColor: '#18181b',
          margin: [0, 2],
        },
      },
    };
}

export function buildSale80mmDocument(sale: Sale): TDocumentDefinitions {
  const documentNumber = `SLIP-${sale.id?.substring(0, 8).toUpperCase() || '-'}`;
  const transactionDate = sale.created_at || sale.sale_date;
  const divider = (): Content => ({
    text: '------------------------------------------',
    alignment: 'center',
    color: '#52525b',
    fontSize: 7,
    characterSpacing: 0.4,
    margin: [0, 3, 0, 3],
  });

  const itemContent: Content[] = sale.items.flatMap((item) => [
    {
      text: item.product_name,
      bold: true,
      fontSize: 9,
      margin: [0, 2, 0, 1],
    },
    ...(item.barcode ? [{
      text: `บาร์โค้ด: ${item.barcode}`,
      color: '#52525b',
      fontSize: 7,
      margin: [0, 0, 0, 1] as [number, number, number, number],
    }] : []),
    {
      columns: [
        { text: `${item.quantity} x ${formatMoney(item.unit_price)}`, width: '*' },
        { text: formatMoney(item.total_price), width: 'auto', alignment: 'right', bold: true },
      ],
      fontSize: 8,
      margin: [0, 0, 0, 2],
    },
  ]);

  return {
    pageSize: {
      width: 226.77,
      height: 'auto',
    },
    pageMargins: [10, 10, 10, 12],
    info: {
      title: documentNumber,
      author: 'KM 108 Shop',
      subject: 'Receipt',
    },
    defaultStyle: {
      font: 'GoogleSans',
      fontSize: 8,
      color: '#18181b',
      lineHeight: 1.1,
    },
    content: [
      { text: 'KM 108 SHOP', alignment: 'center', bold: true, fontSize: 14 },
      {
        text: '273 ม.6 ต.คลองศก อ.พนม จ.สุราษฎร์ธานี 84250',
        alignment: 'center',
        fontSize: 7,
        margin: [4, 2, 4, 0],
      },
      { text: 'โทร. 065-0346095', alignment: 'center', fontSize: 7, margin: [0, 1, 0, 0] },
      divider(),
      {
        table: {
          widths: [45, '*'],
          body: [
            ['เลขที่', { text: documentNumber, alignment: 'right', bold: true }],
            ['วันที่', { text: formatThaiDateTime(transactionDate), alignment: 'right' }],
            ['ผู้ขาย', { text: sale.seller_name || '-', alignment: 'right' }],
            ['ลูกค้า', { text: sale.customer_name || 'ลูกค้าทั่วไป', alignment: 'right' }],
            ['ชำระโดย', { text: sale.payment_type === 'cash' ? 'เงินสด' : 'เครดิต', alignment: 'right' }],
          ],
        },
        layout: 'noBorders',
      },
      divider(),
      { text: 'รายการสินค้า', bold: true, fontSize: 9, margin: [0, 0, 0, 2] },
      ...itemContent,
      divider(),
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            ['ยอดรวม', { text: `${formatMoney(sale.total_amount)} บาท`, alignment: 'right' }],
            ['ส่วนลด', { text: `${formatMoney(sale.discount)} บาท`, alignment: 'right' }],
            [
              { text: 'ยอดสุทธิ', bold: true, fontSize: 10, margin: [0, 3, 0, 0] },
              { text: `${formatMoney(sale.net_amount)} บาท`, bold: true, fontSize: 10, alignment: 'right', margin: [0, 3, 0, 0] },
            ],
            ...(sale.payment_type === 'cash' ? [
              ['รับเงินมา', { text: `${formatMoney(sale.amount_paid || 0)} บาท`, alignment: 'right' }],
              [
                { text: 'เงินทอน', bold: true },
                { text: `${formatMoney(sale.change_amount || 0)} บาท`, alignment: 'right', bold: true },
              ],
            ] as TableCell[][] : []),
          ],
        },
        layout: 'noBorders',
      },
      divider(),
      { text: 'ขอบคุณที่อุดหนุน', alignment: 'center', bold: true, margin: [0, 2, 0, 0] },
      {
        text: 'โปรดเก็บสลิปไว้เป็นหลักฐานในการเปลี่ยนหรือคืนสินค้า',
        alignment: 'center',
        color: '#52525b',
        fontSize: 7,
        margin: [3, 2, 3, 0],
      },
    ],
  };
}

async function loadPdfMake() {
  const pdfMakeModule = await import('pdfmake/build/pdfmake');
  const pdfMake = pdfMakeModule.default;
  const fontBaseUrl = `${window.location.origin}/fonts`;

  pdfMake.addFonts({
    GoogleSans: {
      normal: `${fontBaseUrl}/GoogleSans-Regular.ttf`,
      bold: `${fontBaseUrl}/GoogleSans-Bold.ttf`,
      italics: `${fontBaseUrl}/GoogleSans-Regular.ttf`,
      bolditalics: `${fontBaseUrl}/GoogleSans-Bold.ttf`,
    },
  });

  return pdfMake;
}

export async function createSaleA4PdfPreviewUrl(sale: Sale) {
  const pdfMake = await loadPdfMake();
  const blob = await pdfMake.createPdf(buildSaleA4Document(sale)).getBlob();
  return URL.createObjectURL(blob);
}

export async function createSale80mmPdfPreviewUrl(sale: Sale) {
  const pdfMake = await loadPdfMake();
  const blob = await pdfMake.createPdf(buildSale80mmDocument(sale)).getBlob();
  return URL.createObjectURL(blob);
}

export async function printSale80mmPdf(sale: Sale) {
  const previewWindow = window.open('', '_blank');
  if (!previewWindow) {
    throw new Error('Popup was blocked');
  }

  try {
    const pdfMake = await loadPdfMake();
    await pdfMake.createPdf(buildSale80mmDocument(sale)).print(previewWindow);
  } catch (error) {
    previewWindow.close();
    throw error;
  }
}
