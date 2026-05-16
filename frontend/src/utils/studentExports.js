const encoder = new TextEncoder();

const toBytes = (value) => encoder.encode(value);

const concatBytes = (chunks) => {
  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
};

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[index] = value >>> 0;
  }
  return table;
})();

const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const writeUint16 = (value) => {
  const buffer = new Uint8Array(2);
  new DataView(buffer.buffer).setUint16(0, value, true);
  return buffer;
};

const writeUint32 = (value) => {
  const buffer = new Uint8Array(4);
  new DataView(buffer.buffer).setUint32(0, value, true);
  return buffer;
};

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const escapePdfText = (value) =>
  String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replace(/[\u0000-\u001f\u007f]/g, " ");

const truncate = (value, maxLength = 110) => {
  const text = String(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
};

const chunk = (items, size) => {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const getGradeName = (student) => student.sectionRecord?.gradeLevel?.name || student.className || "";
const getSectionName = (student) => student.sectionRecord?.name || student.section || "";
const getRegistrationNumber = (student) => student.registrationNumber || "-";
const getStudentName = (student) => `${student.firstName || ""} ${student.lastName || ""}`.trim();

const buildPdfPageContent = (students, pageNumber, totalPages) => {
  const rowsPerPage = 22;
  const commands = [
    "BT /F1 18 Tf 40 560 Td (Student List Export) Tj ET",
    `BT /F1 10 Tf 40 542 Td (${escapePdfText(`Total students: ${students.length}`)}) Tj ET`,
    "BT /F1 9 Tf 40 522 Td (No.  Name  Grade  Section  Registration Number) Tj ET",
  ];

  students.forEach((student, index) => {
    const lineNumber = index + 1 + (pageNumber - 1) * rowsPerPage;
    const line = `${lineNumber}. ${getStudentName(student)} | ${getGradeName(student)} | ${getSectionName(student)} | ${getRegistrationNumber(student)}`;
    const y = 500 - index * 18;
    commands.push(`BT /F1 9 Tf 40 ${y} Td (${escapePdfText(truncate(line, 125))}) Tj ET`);
  });

  commands.push(`BT /F1 8 Tf 40 20 Td (${escapePdfText(`Page ${pageNumber} of ${totalPages}`)}) Tj ET`);
  return commands.join("\n");
};

const buildPdfBytes = (students) => {
  const rowsPerPage = 22;
  const pages = chunk(students, rowsPerPage);
  const objectMap = new Map();
  const pageObjectNumbers = [];

  objectMap.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objectMap.set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  pages.forEach((pageStudents, index) => {
    const contentObjectNumber = 4 + index * 2;
    const pageObjectNumber = 5 + index * 2;
    pageObjectNumbers.push(pageObjectNumber);

    const content = buildPdfPageContent(pageStudents, index + 1, pages.length);
    const contentBytes = toBytes(content);
    objectMap.set(
      contentObjectNumber,
      `<< /Length ${contentBytes.length} >>\nstream\n${content}\nendstream`,
    );
    objectMap.set(
      pageObjectNumber,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`,
    );
  });

  objectMap.set(2, `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(" ")}] /Count ${pageObjectNumbers.length} >>`);

  const orderedObjects = Array.from(objectMap.entries()).sort(([left], [right]) => left - right);
  const header = toBytes("%PDF-1.4\n%SchoolConnectAI\n");
  const bodyParts = [header];
  const offsets = [0];
  let currentOffset = header.length;

  for (const [number, content] of orderedObjects) {
    const objectString = `${number} 0 obj\n${content}\nendobj\n`;
    const objectBytes = toBytes(objectString);
    offsets[number] = currentOffset;
    currentOffset += objectBytes.length;
    bodyParts.push(objectBytes);
  }

  const xrefOffset = currentOffset;
  const totalObjects = orderedObjects.length + 1;
  const xrefLines = [`xref`, `0 ${totalObjects}`, `0000000000 65535 f `];
  for (let number = 1; number <= orderedObjects.length; number += 1) {
    const offset = offsets[number] || 0;
    xrefLines.push(`${String(offset).padStart(10, "0")} 00000 n `);
  }

  const trailer = [
    "trailer",
    `<< /Size ${totalObjects} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
  ].join("\n");

  return concatBytes([...bodyParts, toBytes(`${xrefLines.join("\n")}\n${trailer}`)]);
};

const buildDocxParagraph = (text) =>
  `<w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;

const buildDocxBytes = (students) => {
  const lines = [
    buildDocxParagraph("Student List Export"),
    buildDocxParagraph(`Total students: ${students.length}`),
    buildDocxParagraph("Name | Grade | Section | Registration Number"),
    ...students.map((student, index) =>
      buildDocxParagraph(
        `${index + 1}. ${getStudentName(student)} | ${getGradeName(student)} | ${getSectionName(student)} | ${getRegistrationNumber(student)}`,
      ),
    ),
  ];

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 wp14">
  <w:body>
    ${lines.join("\n    ")}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840" />
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0" />
    </w:sectPr>
  </w:body>
</w:document>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml" />
</Relationships>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="xml" ContentType="application/xml" />
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml" />
</Types>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal" />
    <w:qFormat />
  </w:style>
</w:styles>`;

  const entries = [
    { name: "[Content_Types].xml", content: contentTypesXml },
    { name: "_rels/.rels", content: relsXml },
    { name: "word/document.xml", content: documentXml },
    { name: "word/styles.xml", content: stylesXml },
  ];

  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  entries.forEach((entry) => {
    const nameBytes = toBytes(entry.name);
    const contentBytes = toBytes(entry.content);
    const crc = crc32(contentBytes);

    const localHeader = concatBytes([
      writeUint32(0x04034b50),
      writeUint16(20),
      writeUint16(0),
      writeUint16(0),
      writeUint16(0),
      writeUint16(0),
      writeUint32(crc),
      writeUint32(contentBytes.length),
      writeUint32(contentBytes.length),
      writeUint16(nameBytes.length),
      writeUint16(0),
    ]);

    localParts.push(localHeader, nameBytes, contentBytes);

    const centralHeader = concatBytes([
      writeUint32(0x02014b50),
      writeUint16(20),
      writeUint16(20),
      writeUint16(0),
      writeUint16(0),
      writeUint16(0),
      writeUint16(0),
      writeUint32(crc),
      writeUint32(contentBytes.length),
      writeUint32(contentBytes.length),
      writeUint16(nameBytes.length),
      writeUint16(0),
      writeUint16(0),
      writeUint16(0),
      writeUint16(0),
      writeUint32(0),
      writeUint32(localOffset),
    ]);

    centralParts.push(centralHeader, nameBytes);
    localOffset += localHeader.length + nameBytes.length + contentBytes.length;
  });

  const centralDirectory = concatBytes(centralParts);
  const endOfCentralDirectory = concatBytes([
    writeUint32(0x06054b50),
    writeUint16(0),
    writeUint16(0),
    writeUint16(entries.length),
    writeUint16(entries.length),
    writeUint32(centralDirectory.length),
    writeUint32(localOffset),
    writeUint16(0),
  ]);

  return concatBytes([...localParts, centralDirectory, endOfCentralDirectory]);
};

const buildExportFileName = (prefix, extension, students) => {
  if (!students.length) return `${prefix}-empty.${extension}`;
  const gradeNames = [...new Set(students.map((student) => getGradeName(student)).filter(Boolean))];
  const suffix = gradeNames.length === 1 ? gradeNames[0].replace(/\s+/g, "-").toLowerCase() : "selected";
  return `${prefix}-${suffix}.${extension}`;
};

export const exportStudentsAsPdf = (students) => {
  const bytes = buildPdfBytes(students);
  const blob = new Blob([bytes], { type: "application/pdf" });
  downloadBlob(blob, buildExportFileName("students", "pdf", students));
};

export const exportStudentsAsDocx = (students) => {
  const bytes = buildDocxBytes(students);
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  downloadBlob(blob, buildExportFileName("students", "docx", students));
};
