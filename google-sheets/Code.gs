// Điền ID Sheet riêng trong Apps Script; không đưa ID thật lên kho công khai.
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';
const TAB_NAME = 'Khách mời';
const HEADERS = ['Mã gửi', 'Thời gian', 'Tên khách', 'Tham dự', 'Tiệc nhà gái', 'Tiệc nhà trai', 'Lễ thành hôn', 'Số người mỗi buổi', 'Lời chúc / lời nhắn', 'Cho phép công khai', 'Đã thu hồi lời chúc', 'Mã xác thực băm', 'Nguồn'];

function setupWeddingSheet() {
  const book = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = book.getSheetByName(TAB_NAME);
  if (!sheet) {
    const blank = book.getSheetByName('Sheet1');
    sheet = blank && blank.getLastRow() === 0 ? blank.setName(TAB_NAME) : book.insertSheet(TAB_NAME);
  }
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  table_();
  book.setSpreadsheetTimeZone('Asia/Ho_Chi_Minh');
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length).setBackground('#eeeeee').setFontWeight('bold').setWrap(true);
  sheet.setColumnWidths(1, HEADERS.length, 150);
  sheet.setColumnWidth(9, 320);
  sheet.hideColumns(12);
  sheet.getRange('B2:B').setNumberFormat('dd/MM/yyyy HH:mm:ss');
  sheet.getRange('I2:I').setWrap(true);
  if (!sheet.getFilter()) sheet.getRange(1, 1, sheet.getMaxRows(), HEADERS.length).createFilter();
  let totals = book.getSheetByName('Tổng hợp');
  if (!totals) {
    totals = book.insertSheet('Tổng hợp');
    totals.getRange('A1:B6').setValues([
      ['Nội dung', 'Số lượng'],
      ['Lượt gửi form', '=COUNTIF(\'Khách mời\'!M2:M,"Thiệp cưới")'],
      ['Lượt xác nhận đến', '=COUNTIF(\'Khách mời\'!D2:D,"Có")'],
      ['Khách tiệc nhà gái', "=SUMIF('Khách mời'!E2:E,TRUE,'Khách mời'!H2:H)"],
      ['Khách tiệc nhà trai', "=SUMIF('Khách mời'!F2:F,TRUE,'Khách mời'!H2:H)"],
      ['Khách lễ thành hôn', "=SUMIF('Khách mời'!G2:G,TRUE,'Khách mời'!H2:H)"]
    ]);
    totals.getRange('A1:B1').setBackground('#eeeeee').setFontWeight('bold');
    totals.setColumnWidth(1, 230); totals.setColumnWidth(2, 120);
  }
}

function table_() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_NAME);
  if (!sheet || sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0].join('|') !== HEADERS.join('|')) throw Error('Bảng nhận chưa sẵn sàng.');
  return sheet;
}
function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function hash_(value) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value).map(b => (b & 255).toString(16).padStart(2, '0')).join(''); }
function text_(value, limit) {
  if (typeof value !== 'string' || value.trim().length > limit) throw Error('Thông tin không hợp lệ.');
  return value.trim();
}
function literal_(value) { return /^[=+\-@\t\r]/.test(value) ? "'" + value : value; }
function id_(value) { if (typeof value !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(value)) throw Error('Mã gửi không hợp lệ.'); return value; }
function token_(value) { if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw Error('Mã xác thực không hợp lệ.'); return value; }

function doGet() {
  try {
    const sheet = table_();
    const rows = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues();
    const wishes = rows.filter(r => r[9] === true && r[10] !== true && String(r[8]).trim())
      .reverse().map(r => ({id: String(r[0]), name: String(r[2]), message: String(r[8]), created_at: new Date(r[1]).toISOString()}));
    return json_({ok: true, wishes});
  } catch (_) { return json_({ok: false, error: 'Không tải được lời chúc.'}); }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (!e.postData || e.postData.contents.length > 6000) throw Error('Dữ liệu quá dài.');
    const data = JSON.parse(e.postData.contents);
    const id = id_(data.id), tokenHash = hash_(token_(data.token));
    lock.waitLock(15000);
    const sheet = table_();
    const rows = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues();
    const index = rows.findIndex(r => String(r[0]) === id);
    if (data.action === 'retract') {
      if (index < 0 || rows[index][11] !== tokenHash) throw Error('Không xác nhận được quyền thu hồi.');
      // Chỉ ẩn lời chúc; giữ đăng ký tham dự cho cô dâu chú rể.
      sheet.getRange(index + 2, 11).setValue(true);
      SpreadsheetApp.flush();
      return json_({ok: true, id});
    }
    if (!['submit', 'save'].includes(data.action)) throw Error('Yêu cầu không hợp lệ.');
    if (data.action === 'save' && index >= 0 && rows[index][11] !== tokenHash) throw Error('Không xác nhận được quyền chỉnh sửa.');
    if (data.action === 'submit' && index >= 0) {
      if (rows[index][11] !== tokenHash) throw Error('Mã gửi đã tồn tại.');
      return json_({ok: true, id, duplicate: true});
    }
    const name = text_(data.name, 60), message = text_(data.message, 300);
    if (!name || !['yes','no'].includes(data.attending) || typeof data.publishWish !== 'boolean') throw Error('Thông tin không hợp lệ.');
    const events = data.events;
    if (!Array.isArray(events) || events.some(x => !['bride_party','groom_party','ceremony'].includes(x)) || new Set(events).size !== events.length) throw Error('Buổi tham dự không hợp lệ.');
    const attending = data.attending === 'yes';
    if (attending ? (!events.length || !Number.isSafeInteger(data.guests) || data.guests < 1) : (events.length !== 0 || data.guests !== 0)) throw Error('Số người hoặc buổi tham dự không hợp lệ.');
    const row = [id, new Date(), literal_(name), attending ? 'Có' : 'Không', events.includes('bride_party'), events.includes('groom_party'), events.includes('ceremony'), data.guests, literal_(message), data.publishWish && !!message, false, tokenHash, 'Thiệp cưới'];
    if (data.action === 'save' && index >= 0) sheet.getRange(index + 2, 1, 1, HEADERS.length).setValues([row]);
    else sheet.appendRow(row);
    SpreadsheetApp.flush();
    return json_({ok: true, id});
  } catch (err) { return json_({ok: false, error: err instanceof SyntaxError ? 'Dữ liệu không hợp lệ.' : (err.message || 'Chưa lưu được thông tin.')}); }
  finally { if (lock.hasLock()) lock.releaseLock(); }
}
