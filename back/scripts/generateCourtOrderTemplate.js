/**
 * Скрипт для генерації шаблону заяви про видачу судового наказу.
 * Запуск: node back/scripts/generateCourtOrderTemplate.js
 * Результат: back/files/courtOrder.docx
 */

const { Document, Packer, Paragraph, TextRun, AlignmentType } = require('docx');
const fs = require('fs').promises;
const path = require('path');
const { FONT, SIZE, SIZE_TITLE, SIZE_SMALL } = require('../modules/court_order/constants/documentStyles');

const emptyParagraph = () => new Paragraph({
    children: [new TextRun({ text: '', font: FONT })]
});

const doc = new Document({
    sections: [{
        properties: {},
        children: [
            // === ШАПКА: СУДУ ===
            new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                    new TextRun({ text: '{{court_name}}', font: FONT, size: SIZE, bold: true }),
                ],
            }),
            new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                    new TextRun({ text: '{{court_address}}', font: FONT, size: SIZE }),
                ],
            }),
            emptyParagraph(),

            // === СТЯГУВАЧ ===
            new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                    new TextRun({ text: 'Стягувач: ', font: FONT, size: SIZE, bold: true }),
                    new TextRun({ text: '{{community_name}}', font: FONT, size: SIZE }),
                ],
            }),
            new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                    new TextRun({ text: 'Адреса: ', font: FONT, size: SIZE, bold: true }),
                    new TextRun({ text: '{{community_address}}', font: FONT, size: SIZE }),
                ],
            }),
            new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                    new TextRun({ text: 'ЄДРПОУ: ', font: FONT, size: SIZE, bold: true }),
                    new TextRun({ text: '{{community_edrpou}}', font: FONT, size: SIZE }),
                ],
            }),
            new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                    new TextRun({ text: 'Тел.: ', font: FONT, size: SIZE, bold: true }),
                    new TextRun({ text: '{{community_phone}}', font: FONT, size: SIZE }),
                    new TextRun({ text: '  Email: ', font: FONT, size: SIZE, bold: true }),
                    new TextRun({ text: '{{community_email}}', font: FONT, size: SIZE }),
                ],
            }),
            emptyParagraph(),

            // === БОРЖНИК ===
            new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                    new TextRun({ text: 'Боржник: ', font: FONT, size: SIZE, bold: true }),
                    new TextRun({ text: '{{debtor_name}}', font: FONT, size: SIZE }),
                ],
            }),
            new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                    new TextRun({ text: 'Адреса: ', font: FONT, size: SIZE, bold: true }),
                    new TextRun({ text: '{{debtor_address}}', font: FONT, size: SIZE }),
                ],
            }),
            new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                    new TextRun({ text: 'ЄДРПОУ/ІПН: ', font: FONT, size: SIZE, bold: true }),
                    new TextRun({ text: '{{debtor_edrpou}}', font: FONT, size: SIZE }),
                ],
            }),
            new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                    new TextRun({ text: 'Засоби зв\'язку: ', font: FONT, size: SIZE, bold: true }),
                    new TextRun({ text: '{{debtor_contacts}}', font: FONT, size: SIZE }),
                ],
            }),
            emptyParagraph(),

            // === ЗАГОЛОВОК ===
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                    new TextRun({ text: 'ЗАЯВА', font: FONT, size: SIZE_TITLE, bold: true }),
                ],
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                    new TextRun({ text: 'про видачу судового наказу', font: FONT, size: SIZE, bold: true }),
                ],
            }),
            emptyParagraph(),

            // === ТІЛО ЗАЯВИ ===
            new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                children: [
                    new TextRun({ text: '{{body_paragraph_1}}', font: FONT, size: SIZE }),
                ],
            }),
            emptyParagraph(),

            new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                children: [
                    new TextRun({ text: '{{body_paragraph_2}}', font: FONT, size: SIZE }),
                ],
            }),
            emptyParagraph(),

            new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                children: [
                    new TextRun({
                        text: '          На підставі викладеного та керуючись ст. 161, 162, 164 ЦПК України,',
                        font: FONT, size: SIZE
                    }),
                ],
            }),
            emptyParagraph(),

            // === ПРОШУ ===
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                    new TextRun({ text: 'ПРОШУ:', font: FONT, size: SIZE, bold: true }),
                ],
            }),
            emptyParagraph(),

            new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                children: [
                    new TextRun({ text: '{{request_paragraph}}', font: FONT, size: SIZE }),
                ],
            }),
            emptyParagraph(),

            new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                children: [
                    new TextRun({ text: '{{court_fee_paragraph}}', font: FONT, size: SIZE }),
                ],
            }),
            emptyParagraph(),
            emptyParagraph(),

            // === ДАТА ТА ПІДПИС ===
            new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                    new TextRun({ text: '{{current_date}}', font: FONT, size: SIZE }),
                ],
            }),
            emptyParagraph(),
            new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                    new TextRun({ text: '________________________', font: FONT, size: SIZE }),
                ],
            }),
            new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                    new TextRun({ text: '(підпис)', font: FONT, size: SIZE_SMALL, italics: true }),
                ],
            }),
        ],
    }],
});

async function generate() {
    const buffer = await Packer.toBuffer(doc);
    const outputPath = path.join(__dirname, '..', 'files', 'courtOrder.docx');
    await fs.writeFile(outputPath, buffer);
    console.log(`Template saved to: ${outputPath}`);
}

generate().catch(console.error);
