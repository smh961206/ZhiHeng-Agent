import {zipSync,strToU8} from 'fflate';
export const officeArchive=files=>zipSync(Object.fromEntries(Object.entries(files).map(([name,text])=>[name,strToU8(text)])));
export const materialDocx=officeArchive({'word/document.xml':'<w:document xmlns:w="word"><w:body><w:p><w:r><w:t>现金流研究笔记</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>营业收入</w:t><w:tab/><w:t>100</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:p><w:del><w:r><w:delText>已删除文字</w:delText></w:r></w:del><w:r><w:t>需要核对原件</w:t></w:r></w:p></w:body></w:document>'});
export const materialXlsx=officeArchive({
 'xl/workbook.xml':'<workbook xmlns:r="rels"><sheets><sheet name="现金流" r:id="rId2"/><sheet name="盈利" r:id="rId1"/></sheets></workbook>',
 'xl/_rels/workbook.xml.rels':'<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>',
 'xl/sharedStrings.xml':'<sst><si><t>经营现金流</t></si></sst>',
 'xl/worksheets/sheet1.xml':'<worksheet><sheetData><row><c r="A1" t="inlineStr"><is><t>净利润</t></is></c><c r="C1"><v>15</v><f>SUM(A2:B2)</f></c></row></sheetData></worksheet>',
 'xl/worksheets/sheet2.xml':'<worksheet><sheetData><row><c r="A1" t="s"><v>0</v></c><c r="C1"><v>100</v></c></row></sheetData></worksheet>'
});
export const materialPptx=officeArchive({
 'ppt/presentation.xml':'<p:presentation xmlns:p="presentation" xmlns:r="rels"><p:sldIdLst><p:sldId id="257" r:id="rId2"/><p:sldId id="256" r:id="rId1"/></p:sldIdLst></p:presentation>',
 'ppt/_rels/presentation.xml.rels':'<Relationships><Relationship Id="rId1" Target="slides/slide1.xml"/><Relationship Id="rId2" Target="slides/slide2.xml"/></Relationships>',
 'ppt/slides/slide1.xml':'<p:sld xmlns:p="presentation" xmlns:a="drawing"><a:p><a:r><a:t>第二页：风险假设</a:t></a:r></a:p></p:sld>',
 'ppt/slides/slide2.xml':'<p:sld xmlns:p="presentation" xmlns:a="drawing"><a:p><a:r><a:t>第一页：研究结论</a:t></a:r></a:p></p:sld>'
});
export function materialPdf(text='Annual cash flow: 100; review original evidence.'){
 const stream=`BT /F1 12 Tf 50 750 Td (${text}) Tj ET`;
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
 let pdf='%PDF-1.4\n',offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}
 const xref=pdf.length;pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
 return Buffer.from(pdf);
}
