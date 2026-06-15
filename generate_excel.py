import zipfile
import io
import os

# A minimal xlsx structure for a single sheet with some data
content_types = b'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>'''

rels = b'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'''

workbook_rels = b'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>'''

workbook = b'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>'''

shared_strings = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="{count}" uniqueCount="{count}">
{strings}
</sst>'''

worksheet = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
{rows}
</sheetData></worksheet>'''

data = [
    ['word', 'ipa', 'partOfSpeech', 'meaning', 'viMeaning', 'folder', 'topic', 'exampleEn', 'exampleVi'],
    ['ubiquitous', '/juːˈbɪkwɪtəs/', 'adjective', 'present, appearing, or found everywhere', 'có mặt ở khắp nơi', 'Advanced', 'Technology', 'Computers are becoming increasingly ubiquitous.', 'Máy tính đang ngày càng trở nên phổ biến ở khắp nơi.'],
    ['mitigate', '/ˈmɪtɪɡeɪt/', 'verb', 'make less severe, serious, or painful', 'làm giảm nhẹ, làm dịu bớt', 'Advanced', 'Environment', 'Action is needed to mitigate the effects of climate change.', 'Cần có hành động để giảm thiểu tác động của biến đổi khí hậu.'],
    ['sustainable', '/səˈsteɪnəbl/', 'adjective', 'able to be maintained at a certain rate or level', 'bền vững', 'Basic', 'Environment', 'We need to find sustainable sources of energy.', 'Chúng ta cần tìm ra các nguồn năng lượng bền vững.']
]

flat_strings = []
for r in data:
    for c in r:
        flat_strings.append(str(c))

ss_xml = ''
for s in flat_strings:
    # Need to escape ampersands, less than, greater than, etc for XML just in case
    s_escaped = s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    ss_xml += f'<si><t>{s_escaped}</t></si>'

shared_strings_final = shared_strings.format(count=len(flat_strings), strings=ss_xml).encode('utf-8')

rows_xml = ''
idx = 0
for r_num, r in enumerate(data, 1):
    rows_xml += f'<row r="{r_num}">'
    for c_num, c in enumerate(r):
        col_letter = chr(65 + c_num)
        rows_xml += f'<c r="{col_letter}{r_num}" t="s"><v>{idx}</v></c>'
        idx += 1
    rows_xml += '</row>'

worksheet_final = worksheet.format(rows=rows_xml).encode('utf-8')

out_path = os.path.join('AimHigh-IELTS-Website', 'admin', 'sample_vocabulary.xlsx')
with zipfile.ZipFile(out_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
    zf.writestr('[Content_Types].xml', content_types)
    zf.writestr('_rels/.rels', rels)
    zf.writestr('xl/_rels/workbook.xml.rels', workbook_rels)
    zf.writestr('xl/workbook.xml', workbook)
    zf.writestr('xl/sharedStrings.xml', shared_strings_final)
    zf.writestr('xl/worksheets/sheet1.xml', worksheet_final)

print('Excel generated at:', out_path)
