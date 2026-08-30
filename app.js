// ===========================
// PRICING DATA (PEA 2566)
// ===========================

const PEA_COVER_RATE = 100;       // ฿ per piece per day
const PEA_INSTALL_COST = 3500;    // ฿ fixed (install/remove)
const VAT_RATE = 0.07;

// Generator rental data
const rentData = {
    'A': {
        120: [2000, 3500, 4700, 5900, 7100],
        300: [4600, 8100, 10900, 13700, 16500],
        500: [7100, 12500, 16800, 21100, 25400],
        800: [12500, 21800, 29300, 36800, 44300]
    },
    'B': {
        120: [3000, 5300, 7100, 8900, 10700],
        300: [6800, 12000, 16200, 20400, 24600],
        500: [10600, 18700, 25200, 31700, 38200],
        800: [18400, 32400, 43600, 54800, 66000]
    }
};

const getRentalCost = (type, size, days) => {
    if (days <= 0) return 0;
    const rates = rentData[type][size];
    if (days <= 5) return rates[days - 1];
    const diff = rates[4] - rates[3];
    return rates[4] + diff * (days - 5);
};

const getTransportCost = (size, distance) => {
    let tier = distance <= 50 ? 0 : distance <= 100 ? 1 : distance <= 150 ? 2 : 3;
    return size <= 300 ? [1000, 1500, 2000, 2500][tier] : [1200, 1800, 2400, 3000][tier];
};

const getControlCost = (days) => 3200 * days;

// Full Generator Fuel Consumption Data (liters/hr at 25/50/75/100% load)
// Source: PEA Generator Fuel Consumption Chart
const fuelTable = {
    // size: [25%, 50%, 75%, 100%]
     60: [7,  11, 14, 18],
     80: [9,  13, 17, 23],
    120: [11, 16, 22, 28],
    175: [16, 26, 37, 48],
    200: [18, 29, 42, 55],
    230: [20, 33, 47, 63],
    250: [22, 36, 51, 68],
    300: [26, 43, 61, 81],
    350: [30, 50, 71, 95],
    400: [34, 56, 81, 108],
    500: [42, 70, 100, 135],
    600: [50, 83, 119, 162],
    750: [62, 104, 149, 202],
    800: [66, 110, 158, 215]
};

// Available rental sizes (must match rentData keys)
const RENTAL_SIZES = [120, 300, 500, 800];

// Get fuel consumption rate (liters/hr) for a given generator size and load %
// Uses the closest available size in fuelTable
const getFuelRateForSize = (genSize, loadPct) => {
    // Find closest matching size in fuelTable
    const sizes = Object.keys(fuelTable).map(Number).sort((a,b)=>a-b);
    let closest = sizes[0];
    for (const s of sizes) { if (s <= genSize) closest = s; else break; }
    const r = fuelTable[closest];
    const p = loadPct * 100;
    if (p <= 25) return r[0] * (p / 25);
    if (p <= 50) return r[0] + (r[1] - r[0]) * ((p - 25) / 25);
    if (p <= 75) return r[1] + (r[2] - r[1]) * ((p - 50) / 25);
    return r[2] + (r[3] - r[2]) * ((p - 75) / 25);
};

const getFuelRate = (size, loadPct) => {
    return getFuelRateForSize(size, loadPct);
};

const getLocalDateString = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
const fmtDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr; // Safe fallback for already formatted range strings
    const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
};

const fmtDateRange = (startDateStr, endDateStr) => {
    if (!startDateStr) return '';
    if (!endDateStr || startDateStr === endDateStr) return fmtDate(startDateStr);
    return `${fmtDate(startDateStr)} ถึง ${fmtDate(endDateStr)}`;
};

// ===========================
// FLEET & QUEUE MANAGER DATA (กฟฉ.1 — ข้อมูลจริง)
// ===========================
const DISTRICT_HUBS = [
    // สำนักงานการไฟฟ้าเขต
    { id: 'hub_pea_r1',         name: 'กฟฉ.1 (อุดรธานี)',        lat: 17.4152, lng: 102.7833 },
    // การไฟฟ้าจังหวัด
    { id: 'hub_khonkaen',       name: 'กฟจ.ขอนแก่น',              lat: 16.4419, lng: 102.8359 },
    { id: 'hub_chumphae',       name: 'กฟอ.ชุมแพ',                lat: 16.5411, lng: 102.0980 },
    { id: 'hub_banphai',        name: 'กฟอ.บ้านไผ่',              lat: 16.0700, lng: 102.7236 },
    { id: 'hub_nakhonphanom',   name: 'กฟจ.นครพนม',               lat: 17.4042, lng: 104.7818 },
    { id: 'hub_nongkhai',       name: 'กฟจ.หนองคาย',              lat: 17.8783, lng: 102.7411 },
    { id: 'hub_nongbualamphu',  name: 'กฟจ.หนองบัวลำภู',          lat: 17.2049, lng: 102.4379 },
    { id: 'hub_buengkan',       name: 'กฟจ.บึงกาฬ',               lat: 18.3638, lng: 103.6548 },
    { id: 'hub_udonthani1',     name: 'กฟจ.อุดรธานี 1',            lat: 17.4157, lng: 102.7900 },
    { id: 'hub_udonthani2',     name: 'กฟจ.อุดรธานี 2',            lat: 17.3833, lng: 102.8167 },
    { id: 'hub_loei',           name: 'กฟจ.เลย',                  lat: 17.4861, lng: 101.7223 },
    { id: 'hub_sakonnakhon',    name: 'กฟจ.สกลนคร',               lat: 17.1455034, lng: 104.1069212 },
    { id: 'hub_phangkhon',      name: 'กฟอ.พังโคน',               lat: 17.3836871, lng: 103.7130564 },
    { id: 'hub_sawangdaendin',  name: 'กฟอ.สว่างแดนดิน',           lat: 17.4594606, lng: 103.4348865 },
    { id: 'hub_khonkaen2',      name: 'กฟจ.ขอนแก่น 2',            lat: 16.4600, lng: 102.8200 },
    // การไฟฟ้าสาขา (เพิ่มใหม่)
    { id: 'hub_kumphawapi',     name: 'กฟอ.กุมภวาปี',              lat: 17.1167, lng: 103.0059 },
    { id: 'hub_wangsaphung',    name: 'กฟอ.วังสะพุง',              lat: 17.2981, lng: 101.7619 },
    { id: 'hub_nonghan',        name: 'กฟอ.หนองหาน',              lat: 17.3624792, lng: 103.1240484 }
];

const TARGET_SITES = {
    'udonthani':        { name: 'อ.เมืองอุดรธานี',         lat: 17.4152, lng: 102.7833 },
    'khonkaen':         { name: 'อ.เมืองขอนแก่น',           lat: 16.4419, lng: 102.8359 },
    'nongkhai':         { name: 'อ.เมืองหนองคาย',           lat: 17.8783, lng: 102.7411 },
    'nakhonphanom':     { name: 'อ.เมืองนครพนม',            lat: 17.4042, lng: 104.7818 },
    'sakonnakhon':      { name: 'อ.เมืองสกลนคร',            lat: 17.1636, lng: 104.1451 },
    'buengkan':         { name: 'อ.เมืองบึงกาฬ',             lat: 18.3638, lng: 103.6548 },
    'loei':             { name: 'อ.เมืองเลย',               lat: 17.4861, lng: 101.7223 },
    'nongbualamphu':    { name: 'อ.เมืองหนองบัวลำภู',        lat: 17.2049, lng: 102.4379 },
    'chumphae':         { name: 'อ.ชุมแพ',                  lat: 16.5411, lng: 102.0980 },
    'banphai':          { name: 'อ.บ้านไผ่',                 lat: 16.0700, lng: 102.7236 },
    'phangkhon':        { name: 'อ.พังโคน',                  lat: 17.3742, lng: 103.9614 },
    'sawangdaendin':    { name: 'อ.สว่างแดนดิน',              lat: 17.4597, lng: 103.7161 },
    'kumphawapi':       { name: 'อ.กุมภวาปี',                lat: 17.1167, lng: 103.0059 },
    'wangsaphung':      { name: 'อ.วังสะพุง',                lat: 17.2981, lng: 101.7619 },
    'nonghan':          { name: 'อ.หนองหาน',                 lat: 17.3481, lng: 103.1000 }
};

// ข้อมูลเครื่องกำเนิดไฟฟ้าจริง กฟฉ.1 — รวม 24 เครื่อง (รหัสตามเอกสารแผนงาน)
let GENERATOR_FLEET = [
    // กฟฉ.1 (อุดรธานี) — 800 kW x1, 500 kW x2, 300 kW x2, 120 kW x2
    { id: 'gen_r1_800_1',   name: 'NE1-GEN-800-01',  size: 800, hubId: 'hub_pea_r1',        status: 'Standby' },
    { id: 'gen_r1_500_1',   name: 'NE1-GEN-500-01',  size: 500, hubId: 'hub_pea_r1',        status: 'Standby' },
    { id: 'gen_r1_500_2',   name: 'NE1-GEN-500-02',  size: 500, hubId: 'hub_pea_r1',        status: 'Standby' },
    { id: 'gen_r1_300_1',   name: 'NE1-GEN-300-01',  size: 300, hubId: 'hub_pea_r1',        status: 'Standby' },
    { id: 'gen_r1_300_2',   name: 'NE1-GEN-300-02',  size: 300, hubId: 'hub_pea_r1',        status: 'Standby' },
    { id: 'gen_r1_120_1',   name: 'NE1-GEN-120-01',  size: 120, hubId: 'hub_pea_r1',        status: 'Standby' },
    { id: 'gen_r1_120_2',   name: 'NE1-GEN-120-02',  size: 120, hubId: 'hub_pea_r1',        status: 'Standby' },
    // กฟจ.ขอนแก่น — 500 kW x1
    { id: 'gen_kk_500_1',   name: 'KKN-GEN-500',     size: 500, hubId: 'hub_khonkaen',      status: 'Standby' },
    // กฟอ.ชุมแพ — 60 kW x1
    { id: 'gen_cp_60_1',    name: 'CMP-GEN-060',     size: 60,  hubId: 'hub_chumphae',      status: 'Standby' },
    // กฟอ.บ้านไผ่ — 60 kW x1
    { id: 'gen_bp_60_1',    name: 'BPI-GEN-060',     size: 60,  hubId: 'hub_banphai',        status: 'Standby' },
    // กฟจ.นครพนม — 500 kW x1
    { id: 'gen_np_500_1',   name: 'NPN-GEN-500',     size: 500, hubId: 'hub_nakhonphanom',  status: 'Standby' },
    // กฟจ.หนองคาย — 500 kW x1
    { id: 'gen_nk_500_1',   name: 'NKY-GEN-500',     size: 500, hubId: 'hub_nongkhai',      status: 'Standby' },
    // กฟจ.หนองบัวลำภู — 500 kW x1
    { id: 'gen_nbl_500_1',  name: 'NBP-GEN-500',     size: 500, hubId: 'hub_nongbualamphu', status: 'Standby' },
    // กฟจ.บึงกาฬ — 500 kW x1
    { id: 'gen_bk_500_1',   name: 'BKA-GEN-500',     size: 500, hubId: 'hub_buengkan',      status: 'Standby' },
    // กฟจ.อุดรธานี 1 — 500 kW x1
    { id: 'gen_ud1_500_1',  name: 'UDN-GEN-500',     size: 500, hubId: 'hub_udonthani1',    status: 'Standby' },
    // กฟจ.อุดรธานี 2 — 500 kW x1
    { id: 'gen_ud2_500_1',  name: 'UD2-GEN-500',     size: 500, hubId: 'hub_udonthani2',    status: 'Standby' },
    // กฟจ.เลย — 500 kW x1
    { id: 'gen_ly_500_1',   name: 'LOE-GEN-500',     size: 500, hubId: 'hub_loei',           status: 'Standby' },
    // กฟจ.สกลนคร — 500 kW x1
    { id: 'gen_sk_500_1',   name: 'SKK-GEN-500',     size: 500, hubId: 'hub_sakonnakhon',   status: 'Standby' },
    // กฟอ.พังโคน — 60 kW x1
    { id: 'gen_pk_60_1',    name: 'PKN-GEN-060',     size: 60,  hubId: 'hub_phangkhon',     status: 'Standby' },
    // กฟอ.สว่างแดนดิน — 60 kW x1
    { id: 'gen_sd_60_1',    name: 'SDD-GEN-060',     size: 60,  hubId: 'hub_sawangdaendin', status: 'Standby' },
    // กฟจ.ขอนแก่น 2 — 500 kW x1
    { id: 'gen_kk2_500_1',  name: 'KK2-GEN-500',     size: 500, hubId: 'hub_khonkaen2',     status: 'Standby' },
    // กฟอ.กุมภวาปี — 60 kW x1
    { id: 'gen_kwp_60_1',   name: 'KWP-GEN-500',     size: 60,  hubId: 'hub_kumphawapi',    status: 'Standby' },
    // กฟอ.วังสะพุง — 60 kW x1
    { id: 'gen_wsp_60_1',   name: 'WSP-GEN-500',     size: 60,  hubId: 'hub_wangsaphung',   status: 'Standby' },
    // กฟอ.หนองหาน — 60 kW x1
    { id: 'gen_nhn_60_1',   name: 'NHN-GEN-500',     size: 60,  hubId: 'hub_nonghan',       status: 'Standby' }
];

// Supabase Initialization
const supabaseUrl = 'https://zqgxufzvghzvdkoyiynw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxZ3h1Znp2Z2h6dmRrb3lpeW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwNDYwOTUsImV4cCI6MjEwMzYyMjA5NX0.GKOnpHzWxdBe79TQUCHdK0O56psZVivN-mBYGptIydM';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let fleetBookings = [];
let quoteHistory = [];

async function initSupabaseData() {
    try {
        const [quotesRes, bookingsRes, fleetRes] = await Promise.all([
            db.from('quote_history').select('*').order('created_at', { ascending: false }),
            db.from('fleet_bookings').select('*').order('created_at', { ascending: false }),
            db.from('generator_fleet').select('*')
        ]);

        if (quotesRes.data) quoteHistory = quotesRes.data.map(q => q.data);
        if (bookingsRes.data) fleetBookings = bookingsRes.data.map(b => b.data);
        if (fleetRes.data && fleetRes.data.length > 0) GENERATOR_FLEET = fleetRes.data.map(f => f.data);

        renderHistory();
        if (typeof updateFleetStats === 'function') updateFleetStats();
        if (typeof updateMapMarkers === 'function') updateMapMarkers();
        if (typeof initDashboardMap === 'function') initDashboardMap();
        if (typeof renderRecentQuotesFeed === 'function') renderRecentQuotesFeed();
    } catch(e) {
        alert("ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาตรวจสอบว่าคุณได้รันคำสั่ง SQL สร้างตารางใน Supabase แล้วหรือไม่");
        console.error("Error loading data from Supabase", e);
    }
}


const saveHistory = (entry) => {
    const entryCopy = JSON.parse(JSON.stringify(entry));
    entryCopy.id = Date.now();
    entryCopy.createdAt = new Date().toISOString();

    if (entryCopy.type === 'generator') {
        let lat = entryCopy.lat;
        let lng = entryCopy.lng;
        let genId = entryCopy.genId;
        let genName = entryCopy.genName;
        let hubName = entryCopy.hubName;

        if (!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
            let matchedHub = null;
            if (entryCopy.location) {
                const loc = entryCopy.location;
                matchedHub = DISTRICT_HUBS.find(h => {
                    const cleanName = h.name.replace('กฟจ.', '').replace('กฟส.', '').replace('กฟฉ.1', '').replace('(', '').replace(')', '').trim();
                    return loc.includes(cleanName) || loc.includes(h.name);
                });
            }
            if (!matchedHub && genId) {
                const g = GENERATOR_FLEET.find(x => x.id === genId);
                if (g) matchedHub = DISTRICT_HUBS.find(h => h.id === g.hubId);
            }
            if (!matchedHub) {
                const g = GENERATOR_FLEET.find(x => x.size === entryCopy.genSize);
                if (g) matchedHub = DISTRICT_HUBS.find(h => h.id === g.hubId);
            }
            if (!matchedHub) matchedHub = DISTRICT_HUBS[0];

            lat = matchedHub.lat;
            lng = matchedHub.lng;
            if (!hubName) hubName = matchedHub.name;
        }

        if (!genId) {
            const g = GENERATOR_FLEET.find(x => x.size === entryCopy.genSize) || GENERATOR_FLEET[0];
            genId = g.id;
            genName = g.name;
            if (!hubName) {
                const hub = DISTRICT_HUBS.find(h => h.id === g.hubId);
                hubName = hub ? hub.name : 'กฟจ.อุดรธานี';
            }
        }

        entryCopy.lat = parseFloat(lat);
        entryCopy.lng = parseFloat(lng);
        entryCopy.genId = genId;
        entryCopy.genName = genName;
        entryCopy.hubName = hubName;

        const bookingId = 'q_' + entryCopy.id;
        const bookingObj = {
            id: bookingId,
            projectName: entryCopy.purpose || entryCopy.custName || 'งานบริการเครื่องกำเนิดไฟฟ้า',
            locationName: entryCopy.location || 'จุดติดตั้งปฏิบัติงาน',
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            genId: genId,
            genName: genName || `GEN-${entryCopy.genSize}`,
            genSize: entryCopy.genSize || 300,
            hubName: hubName || 'กฟจ.อุดรธานี',
            startDate: entryCopy.startDate || getLocalDateString(),
            endDate: entryCopy.endDate || getLocalDateString(),
            status: 'Active',
            responsible: entryCopy.custName || 'แผนกปฏิบัติการระบบไฟฟ้า'
        };

        const existingIdx = fleetBookings.findIndex(b => b.id === bookingId);
        if (existingIdx > -1) {
            fleetBookings[existingIdx] = bookingObj;
        } else {
            fleetBookings.unshift(bookingObj);
        }
        
        // Save to Supabase
        db.from('fleet_bookings').upsert({ id: bookingId, data: bookingObj }).then(res => {
            if (res.error) alert('Error saving fleet booking: ' + res.error.message);
        });
    }

    quoteHistory.unshift(entryCopy);
    // Save to Supabase
    db.from('quote_history').upsert({ id: entryCopy.id, type: entryCopy.type, data: entryCopy }).then(res => {
        if (res.error) alert('Error saving quote history: ' + res.error.message);
    });
    
    renderHistory();
};

const escapeHTML = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

window.renderHistory = () => {
    const container = document.getElementById('history-list');
    if (!container) return;

    if (quoteHistory.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>ยังไม่มีประวัติการคำนวณราคา</p>
            </div>`;
        return;
    }

    container.innerHTML = quoteHistory.map(q => {
        let details = '';
        let extensionHTML = '';
        if (q.type === 'generator') {
            const grandTotal = q.grandTotal || (q.totalPea + (q.totalFuelCost || 0));
            details = `ขนาด ${q.genSize} kW | ${q.days} วัน (${q.hours} ชม./วัน) | ค่าบริการรวม ${fmt(grandTotal)} ฿`;
            
            if (q.serviceDate) {
                const parts = q.serviceDate.split(' - ');
                const sDate = parts[0] || '';
                const eDate = parts[1] || parts[0] || '';
                
                if (q.originalDays && q.originalDays !== q.days) {
                    extensionHTML = `
                    <div style="margin-top: 6px;">
                        <span class="badge" style="background: #F1F5F9; color: #475569; font-size: 0.75rem; font-weight: normal; border: 1px solid #CBD5E1; display: inline-flex; align-items: center; gap: 4px;">
                            ℹ️ ระยะเวลาเช่า: ${q.days} วัน (เริ่ม ${escapeHTML(sDate)} ถึง ${escapeHTML(eDate)})
                        </span>
                    </div>`;
                } else {
                    extensionHTML = `
                    <div style="margin-top: 6px;">
                        <span class="badge" style="background: #FEF2F2; color: #EF4444; font-size: 0.75rem; font-weight: normal; border: 1px solid #FECACA; display: inline-flex; align-items: center; gap: 4px;">
                            ⚠️ ขยายสัญญาออนไลน์ไม่ได้ ต้องแจ้งล่วงหน้าอย่างน้อย 2 วันก่อนหมดสัญญา (เริ่ม ${sDate} ถึง ${eDate})
                        </span>
                    </div>`;
                }
            }
        } else {
            details = `ฉนวน ${q.wireQty} ชิ้น × ${q.days} วัน | รวม ${fmt(q.total)} ฿ | ${new Date(q.createdAt).toLocaleDateString('th-TH')}`;
        }
        return `
        <div class="history-item" data-id="${q.id}" onclick="inspectQuoteDetails(${q.id})">
            <div class="history-item-info">
                <h4>${q.custName || '(ไม่ระบุชื่อ)'} ${q.custId ? `<small style="font-weight:normal;color:#666;">(ผู้ใช้ไฟ: ${q.custId})</small>` : ''}</h4>
                <p>${details}</p>
                ${extensionHTML}
            </div>
            <div class="history-item-actions">
                <button class="btn btn-outline btn-xs" onclick="event.stopPropagation(); reprintQuote(${q.id})">พิมพ์</button>
                <button class="btn btn-outline btn-xs" style="color:#e74c3c;border-color:#e74c3c;" onclick="event.stopPropagation(); deleteQuote(${q.id})">ยกเลิก</button>
            </div>
        </div>
        `;
    }).join('');
};

window.inspectQuote = window.inspectQuoteDetails = (id) => {
    const q = quoteHistory.find(x => String(x.id) === String(id));
    if (!q) {
        alert('ไม่พบข้อมูลใบเสนอราคารายการนี้');
        return;
    }
    
    // Find matching booking in fleetBookings if available
    const booking = fleetBookings.find(b => b.id === 'q_' + q.id);

    const formatThaiDate = (dStr) => {
        if (!dStr) return '-';
        if (typeof dStr === 'string' && dStr.includes('-')) {
            const parts = dStr.split('-');
            if (parts.length === 3) {
                const y = parseInt(parts[0]);
                const m = parseInt(parts[1]) - 1;
                const d = parseInt(parts[2]);
                const monthsThai = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                if (!isNaN(y) && !isNaN(m) && !isNaN(d) && monthsThai[m]) {
                    return `${d} ${monthsThai[m]} ${y > 2500 ? y : y + 543}`;
                }
            }
        }
        const dt = new Date(dStr);
        return isNaN(dt.getTime()) ? dStr : dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const startDateRaw = q.startDate || (booking ? booking.startDate : '');
    const endDateRaw = q.endDate || (booking ? booking.endDate : '');

    document.getElementById('iq-cust-name').value = q.custName || (booking ? booking.responsible : '-');
    document.getElementById('iq-cust-id').value = q.custId || '-';
    document.getElementById('iq-type').value = q.type === 'generator' ? 'เช่าเครื่องกำเนิดไฟฟ้า' : 'เช่าอุปกรณ์ครอบฉนวน';
    document.getElementById('iq-purpose').value = q.purpose || (booking ? booking.projectName : '-');
    document.getElementById('iq-location').value = q.location || q.custAddress || (booking ? booking.locationName : '-');
    
    if (q.type === 'generator') {
        document.getElementById('iq-gen-size').value = q.genSize ? `${q.genSize} kW` : (booking ? `${booking.genSize} kW` : '-');
    } else {
        document.getElementById('iq-gen-size').value = q.wireQty ? `ฉนวนครอบ ${q.wireQty} ชิ้น` : '-';
    }

    document.getElementById('iq-days').value = q.days ? `${q.days} วัน` : '-';
    document.getElementById('iq-start-date').value = formatThaiDate(startDateRaw);
    document.getElementById('iq-end-date').value = formatThaiDate(endDateRaw);
    
    if (q.createdAt) {
        const createDt = new Date(q.createdAt);
        document.getElementById('iq-created-at').value = isNaN(createDt.getTime()) ? q.createdAt : createDt.toLocaleString('th-TH');
    } else {
        document.getElementById('iq-created-at').value = '-';
    }
    
    // Costs
    document.getElementById('iq-gen-costs').style.display = q.type === 'generator' ? 'block' : 'none';
    document.getElementById('iq-pea-costs').style.display = q.type !== 'generator' ? 'block' : 'none';
    
    if (q.type === 'generator') {
        document.getElementById('iq-cost-rental').textContent = `${fmt(q.rentalCost || 0)} ฿`;
        document.getElementById('iq-cost-fuel').textContent = `${fmt(q.fuelCost || q.totalFuelCost || 0)} ฿`;
        document.getElementById('iq-cost-transport').textContent = `${fmt(q.transportCost || 0)} ฿`;
        document.getElementById('iq-cost-op').textContent = `${fmt(q.opCost || 0)} ฿`;
        document.getElementById('iq-cost-vat').textContent = `${fmt(q.vatPea || q.vat || 0)} ฿`;
        document.getElementById('iq-cost-total').textContent = `${fmt(q.totalPea || q.grandTotal || q.total || 0)} ฿`;
    } else {
        document.getElementById('iq-pea-cost-rental').textContent = `${fmt(q.total || 0)} ฿`;
        document.getElementById('iq-cost-total').textContent = `${fmt(q.total || 0)} ฿`;
    }
    
    document.getElementById('inspect-quote-modal').style.display = 'flex';
};

window.closeInspectQuoteModal = () => {
    document.getElementById('inspect-quote-modal').style.display = 'none';
};


window.extendQuote = (id) => {
    const q = quoteHistory.find(x => x.id === id);
    if (!q) return;
    window._currentExtendingQuoteId = id;
    
    document.getElementById('ext-start-date').value = q.startDate;
    document.getElementById('ext-end-date').value = q.endDate;
    document.getElementById('ext-days').value = q.days;
    
    // Add event listeners to auto-calculate days
    const recalcDays = () => {
        const s = document.getElementById('ext-start-date').value;
        const e = document.getElementById('ext-end-date').value;
        if (s && e) {
            const start = new Date(s);
            const end = new Date(e);
            if (end >= start) {
                document.getElementById('ext-days').value = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            }
        }
    };
    document.getElementById('ext-start-date').onchange = recalcDays;
    document.getElementById('ext-end-date').onchange = recalcDays;
    
    document.getElementById('ext-days').oninput = () => {
        const s = document.getElementById('ext-start-date').value;
        const d = parseInt(document.getElementById('ext-days').value) || 0;
        if (s && d > 0) {
            const start = new Date(s);
            start.setDate(start.getDate() + d - 1);
            document.getElementById('ext-end-date').value = start.toISOString().split('T')[0];
        }
    };
    
    document.getElementById('extend-rental-modal').style.display = 'flex';
};

window.closeExtendRentalModal = () => {
    document.getElementById('extend-rental-modal').style.display = 'none';
    window._currentExtendingQuoteId = null;
};

window.submitExtendRental = () => {
    if (!window._currentExtendingQuoteId) return;
    
    const qId = window._currentExtendingQuoteId;
    const qIndex = quoteHistory.findIndex(x => String(x.id) === String(qId));
    if (qIndex === -1) return;
    
    const q = quoteHistory[qIndex];
    
    const newStart = document.getElementById('ext-start-date').value;
    const newEnd = document.getElementById('ext-end-date').value;
    const newDays = parseInt(document.getElementById('ext-days').value) || 0;
    
    if (!newStart || !newEnd || newDays <= 0) {
        alert('กรุณากรอกข้อมูลวันที่และระยะเวลาเช่าให้ครบถ้วน');
        return;
    }
    if (newStart > newEnd) {
        alert('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด');
        return;
    }
    
    if (!q.originalDays) {
        q.originalDays = q.days;
    }
    
    q.startDate = newStart;
    q.endDate = newEnd;
    q.days = newDays;
    
    const typeKey = q.rawType === 'A_EXEMPT' ? 'A' : q.rawType;
    let newRentalCost = getRentalCost(typeKey, q.genSize, newDays);
    if (q.rawType === 'A_EXEMPT') newRentalCost = 0;
    
    const newOpCost = getControlCost(newDays);
    const newSubtotalPea = newRentalCost + q.transportCost + newOpCost;
    const newVatPea = newSubtotalPea * VAT_RATE;
    const newTotalPea = newSubtotalPea + newVatPea;
    
    const totalFuelLit = q.fuelRate * q.hours * newDays;
    const totalFuelCost = totalFuelLit * q.fuelPrice;
    const newGrandTotal = newTotalPea + totalFuelCost;
    
    q.rentalCost = newRentalCost;
    q.opCost = newOpCost;
    q.subtotalPea = newSubtotalPea;
    q.vatPea = newVatPea;
    q.totalPea = newTotalPea;
    q.totalFuelCost = totalFuelCost;
    q.grandTotal = newGrandTotal;
    
    quoteHistory[qIndex] = q;
    db.from('quote_history').upsert({ id: q.id, type: q.type, data: q }).then();
    
    const fIdx = fleetBookings.findIndex(b => b.id === 'q_' + qId);
    if (fIdx > -1) {
        fleetBookings[fIdx].startDate = newStart;
        fleetBookings[fIdx].endDate = newEnd;
        db.from('fleet_bookings').upsert({ id: fleetBookings[fIdx].id, data: fleetBookings[fIdx] }).then();
    }
    
    renderHistory();
    if (typeof updateFleetStats === 'function') updateFleetStats();
    if (typeof updateMapMarkers === 'function') updateMapMarkers();
    
    closeExtendRentalModal();
    alert('บันทึกการขยายระยะเวลาเช่าเรียบร้อยแล้ว และระบบได้คำนวณราคาใหม่ให้โดยอัตโนมัติ');
};

window.deleteQuote = (id) => {
    if (!confirm('ต้องการลบรายการนี้?')) return;
    quoteHistory = quoteHistory.filter(q => String(q.id) !== String(id));
    db.from('quote_history').delete().eq('id', id).then(res => {
        if (res.error) alert('Delete Error (quote): ' + res.error.message);
    });
    
    fleetBookings = fleetBookings.filter(b => b.id !== 'q_' + id);
    db.from('fleet_bookings').delete().eq('id', 'q_' + id).then(res => {
        if (res.error) alert('Delete Error (fleet): ' + res.error.message);
    });
    
    renderHistory();
    if (typeof updateFleetStats === 'function') {
        const fDateEl = document.getElementById('filter-schedule-date');
        updateFleetStats();
        if (typeof updateMapMarkers === 'function') updateMapMarkers();
        if (typeof renderScheduleList === 'function') renderScheduleList(fDateEl ? fDateEl.value : '');
    }
};

window.reprintQuote = (id) => {
    const q = quoteHistory.find(x => String(x.id) === String(id));
    if (!q) {
        alert('ไม่พบข้อมูลใบเสนอราคาที่จะพิมพ์');
        return;
    }
    if (q.type === 'generator') {
        genExportPDF(q);
    } else {
        populateAndPrint(q);
    }
};

// ===========================
// SIGNATORIES HELPER
// ===========================
const fmtParentheses = (name) => {
    if (!name) return '';
    name = name.trim();
    if (!name.startsWith('(')) name = '(' + name;
    if (!name.endsWith(')')) name = name + ')';
    return name;
};

const applySignatoriesToPDF = (data = {}) => {
    const estName = (data.estimatorName || document.getElementById('gen-estimator-name')?.value || document.getElementById('pea-estimator-name')?.value || 'นางสาวกรรณธ์ญาณัฐษ์ โพธิสว่าง').trim();
    const estPos  = (data.estimatorPos  || document.getElementById('gen-estimator-pos')?.value  || document.getElementById('pea-estimator-pos')?.value  || 'วิศวกร').trim();
    const estDept = (data.estimatorDept || document.getElementById('gen-estimator-dept')?.value || document.getElementById('pea-estimator-dept')?.value || 'แผนกปฏิบัติการและบำรุงรักษาระบบไฟฟ้า').trim();
    const chkName = (data.checkerName   || document.getElementById('gen-checker-name')?.value   || document.getElementById('pea-checker-name')?.value   || 'นายปฐมทรรศน์ ชงัดเวช').trim();
    const chkPos  = (data.checkerPos    || document.getElementById('gen-checker-pos')?.value    || document.getElementById('pea-checker-pos')?.value    || 'หัวหน้าแผนกปฏิบัติการและบำรุงรักษาระบบไฟฟ้า').trim();
    const chkDept = (data.checkerDept   || document.getElementById('gen-checker-dept')?.value   || document.getElementById('pea-checker-dept')?.value   || '').trim();

    document.querySelectorAll('.sig-estimator-name').forEach(el => el.textContent = fmtParentheses(estName));
    document.querySelectorAll('.sig-estimator-pos').forEach(el => el.textContent = estPos);
    document.querySelectorAll('.sig-estimator-dept').forEach(el => el.textContent = estDept);
    document.querySelectorAll('.sig-checker-name').forEach(el => el.textContent = fmtParentheses(chkName));
    document.querySelectorAll('.sig-checker-pos').forEach(el => el.textContent = chkPos);
    document.querySelectorAll('.sig-checker-dept').forEach(el => el.textContent = chkDept);
};

const genExportPDF = async (data) => {
    let d = (data && !(data instanceof Event)) ? data : window._currentGenData;
    if (!d) {
        const calcBtn = document.getElementById('gen-calculate-btn');
        if (calcBtn) calcBtn.click();
        d = window._currentGenData;
    }
    if (!d) {
        alert('กรุณากรอกข้อมูลและคำนวณราคาก่อนพิมพ์ใบเสนอราคา');
        return;
    }
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    const genSizeVal = d.genSize || 300;

    // --- Page 1: Rental Estimate ---
    set('gpr-gen-size', genSizeVal + '');
    document.querySelectorAll('.gpr-gen-size-val').forEach(el => el.textContent = genSizeVal + '');
    set('gpr-cust-id', d.custId || '-');
    set('gpr-cust-name', d.custName || '-');
    set('gpr-purpose', d.purpose || '-');
    set('gpr-service-date', d.serviceDate ? (typeof d.serviceDate === 'string' && d.serviceDate.includes(' - ') ? d.serviceDate : fmtDate(d.serviceDate)) : '-');
    set('gpr-location', d.location || '-');

    const typeDesc = {
        'A': 'ประเภท ก (หน่วยงานรัฐ, ศาสนสถาน)',
        'A_EXEMPT': 'ประเภท ก (งานสาธารณประโยชน์ - ยกเว้นค่าเช่า)',
        'B': 'ประเภท ข (นิติบุคคล, เอกชน)'
    };
    set('gpr-rent-label', 'ค่าเช่า (' + (typeDesc[d.rawType] || 'ประเภท ข') + ')');
    set('gpr-rent-days', (d.days || 1) + '');
    set('gpr-op-days', (d.days || 1) + '');

    set('gpr-rent-cost', fmt(d.rentalCost || 0));
    set('gpr-op-cost', fmt(d.opCost || 0));
    set('gpr-trans-cost', fmt(d.transportCost || 0));
    set('gpr-subtotal', fmt(d.subtotalPea || 0));
    set('gpr-vat', fmt(d.vatPea || 0));
    set('gpr-total', fmt(d.totalPea || 0));

    // --- Page 2: Fuel Estimate ---
    set('gpf-gen-size',   genSizeVal + '');
    document.querySelectorAll('.gpf-gen-size-val').forEach(el => el.textContent = genSizeVal + '');
    set('gpf-load-kw',    (d.loadKw != null ? d.loadKw.toFixed(1) : '0.0'));
    set('gpf-fuel-rate',  (d.fuelRate != null ? d.fuelRate.toFixed(1) : '0.0'));
    set('gpf-fuel-price', (d.fuelPrice != null ? d.fuelPrice.toFixed(2) : '30.00'));
    set('gpf-date',       d.startDate ? fmtDate(d.startDate) : (d.serviceDate || ''));
    set('gpf-purpose',    d.purpose || '-');
    set('gpf-service-date-line', d.serviceDate ? (typeof d.serviceDate === 'string' && d.serviceDate.includes(' - ') ? d.serviceDate : fmtDate(d.serviceDate)) : '-');

    // Update price header
    const hdr = document.getElementById('gpf-price-header');
    const fPrice = d.fuelPrice != null ? d.fuelPrice : 30.00;
    if (hdr) hdr.textContent = `ประมาณการค่าน้ำมัน (${fPrice.toFixed(2)} บ./ลิตร)`;

    // Build fuel table: rows 1 hour to maxHours (max 12 hours)
    const maxHours = Math.min(Math.max(parseInt(d.hours) || 8, 1), 12);
    const tbody = document.getElementById('gp-fuel-tbody');
    if (tbody) {
        tbody.innerHTML = '';
        for (let h = 1; h <= maxHours; h++) {
            const liters = (d.fuelRate || 0) * h;
            const cost   = liters * fPrice;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${h}</td>
                <td>${fmtInt(liters)}</td>
                <td>${fmtInt(cost)} บาท</td>
            `;
            tbody.appendChild(tr);
        }
    }

    // -------------------------------------------------------
    // STEP 1: Fetch PEA logo as base64 data URI BEFORE opening
    // popup — avoids URL resolution, onerror hiding, and timing
    // issues caused by the 1.7MB image not loading in time.
    // -------------------------------------------------------
    let logoDataUri = '';
    try {
        const logoUrl = new URL('pea_logo.jpg.jpg', window.location.href).href;
        const resp = await fetch(logoUrl);
        if (resp.ok) {
            const blob = await resp.blob();
            logoDataUri = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        }
    } catch (e) {
        console.warn('PEA logo fetch failed:', e);
    }

    // -------------------------------------------------------
    // STEP 2: Show area → apply signatories → clone → hide
    // (applySignatoriesToPDF MUST run while area is visible
    //  and AFTER await so text is captured correctly in clone)
    // -------------------------------------------------------
    const genArea = document.getElementById('gen-print-area');
    if (!genArea) { alert('ไม่พบหน้าพิมพ์'); return; }

    genArea.style.display = 'block';

    // Apply signatories NOW (area visible, after await) so clone captures them
    applySignatoriesToPDF(d);

    const genClone = genArea.cloneNode(true);
    genArea.style.display = 'none';

    // Replace every logo <img> src with the pre-fetched base64 data URI
    genClone.querySelectorAll('.gp-logo img').forEach(img => {
        img.removeAttribute('onerror');          // don't silently hide on error
        img.style.display = 'block';
        img.style.height  = '20mm';
        img.style.width   = 'auto';
        img.style.margin  = '0 auto';
        if (logoDataUri) img.setAttribute('src', logoDataUri);
    });

    const genHTML = genClone.outerHTML;

    // -------------------------------------------------------
    // STEP 3: Open popup and print
    // -------------------------------------------------------
    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) {
        alert('กรุณาอนุญาต Popup สำหรับหน้านี้ แล้วลองใหม่อีกครั้ง');
        return;
    }

    printWin.document.write(`<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ประมาณการเครื่องกำเนิดไฟฟ้า</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
    @page { size: A4 portrait; margin: 0; }
    *, *::before, *::after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        box-sizing: border-box;
    }
    html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #FFFFFF !important;
        font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', 'Prompt', sans-serif;
    }
    @media print {
        html, body { margin: 0 !important; padding: 0 !important; }
        #gen-print-area { display: block !important; }
        #gen-print-area .gp {
            width: 210mm !important;
            min-height: 285mm !important;
            padding: 10mm 16mm 8mm 20mm !important;
            box-sizing: border-box !important;
            position: relative !important;
            background: #FFFFFF !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: visible !important;
        }
        #gen-print-area .gp:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
        }
    }
</style>
</head>
<body>
${genHTML}
</body>
</html>`);

    printWin.document.close();
    printWin.focus();
    // Image is already embedded as base64 — no network wait needed
    setTimeout(() => {
        printWin.print();
        setTimeout(() => printWin.close(), 500);
    }, 400);
};



// ===========================
// POPULATE + PRINT QUOTATION (PEA Cover)
// ===========================
const populateAndPrint = (data) => {
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    set('q-cust-id', data.custId || '');
    set('q-cust-name', data.custName || '');
    set('q-cust-address', data.custAddress || '');
    set('q-service-date', data.serviceDate ? fmtDate(data.serviceDate) : '');
    set('q-location', data.location || '');

    // Wire insulator row
    if (data.wireQty > 0) {
        set('q-wire-qty', data.wireQty);
        set('q-wire-days', data.days);
        set('q-wire-rate', '100');
        set('q-wire-amount', fmt(data.wireCost));
    } else {
        set('q-wire-qty', '-');
        set('q-wire-days', '-');
        set('q-wire-rate', '-');
        set('q-wire-amount', '0.00');
    }

    // Insulator row
    if (data.insQty > 0) {
        set('q-ins-qty', data.insQty);
        set('q-ins-days', data.days);
        set('q-ins-rate', '100');
        set('q-ins-amount', fmt(data.insCost));
    } else {
        set('q-ins-qty', '-');
        set('q-ins-days', '-');
        set('q-ins-rate', '-');
        set('q-ins-amount', '0.00');
    }

    set('q-subtotal', fmt(data.subtotal));
    set('q-vat', fmt(data.vat));
    set('q-total', fmt(data.total));

    // Apply dynamic signatories
    applySignatoriesToPDF(data);

    // Print (use class to avoid printing both areas at once)
    document.body.classList.add('print-pea');
    document.body.classList.remove('print-gen');
    const printArea = document.getElementById('print-area');
    if (printArea) printArea.style.display = 'block';

    const cleanupPrintPea = () => {
        if (printArea) printArea.style.display = 'none';
        document.body.classList.remove('print-pea');
        window.removeEventListener('afterprint', cleanupPrintPea);
    };
    window.addEventListener('afterprint', cleanupPrintPea);

    setTimeout(() => {
        window.print();
        setTimeout(cleanupPrintPea, 1000);
    }, 150);
};

// ===========================
// SIGNATORIES PERSISTENCE & SYNC
// ===========================
const initSignatoriesSync = () => {
    const defaultSigs = {
        estimatorName: 'นางสาวกรรณธ์ญาณัฐษ์ โพธิสว่าง',
        estimatorPos:  'วิศวกร',
        estimatorDept: 'แผนกปฏิบัติการและบำรุงรักษาระบบไฟฟ้า',
        checkerName:   'นายปฐมทรรศน์ ชงัดเวช',
        checkerPos:    'หัวหน้าแผนกปฏิบัติการและบำรุงรักษาระบบไฟฟ้า',
        checkerDept:   ''
    };

    let saved = {};
    try {
        saved = JSON.parse(localStorage.getItem('wequote_signatories') || '{}');
    } catch (e) { saved = {}; }

    const sigs = { ...defaultSigs, ...saved };

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };

    // Populate PEA Cover inputs
    setVal('pea-estimator-name', sigs.estimatorName);
    setVal('pea-estimator-pos',  sigs.estimatorPos);
    setVal('pea-estimator-dept', sigs.estimatorDept);
    setVal('pea-checker-name',   sigs.checkerName);
    setVal('pea-checker-pos',    sigs.checkerPos);
    setVal('pea-checker-dept',   sigs.checkerDept);

    // Populate Gen Rental inputs
    setVal('gen-estimator-name', sigs.estimatorName);
    setVal('gen-estimator-pos',  sigs.estimatorPos);
    setVal('gen-estimator-dept', sigs.estimatorDept);
    setVal('gen-checker-name',   sigs.checkerName);
    setVal('gen-checker-pos',    sigs.checkerPos);
    setVal('gen-checker-dept',   sigs.checkerDept);

    // Sync helper
    const handleSync = (srcId, targetId, key) => {
        const src = document.getElementById(srcId);
        const tgt = document.getElementById(targetId);
        if (src) {
            src.addEventListener('input', () => {
                if (tgt) tgt.value = src.value;
                sigs[key] = src.value;
                localStorage.setItem('wequote_signatories', JSON.stringify(sigs));
                applySignatoriesToPDF(sigs);
            });
        }
    };

    handleSync('gen-estimator-name', 'pea-estimator-name', 'estimatorName');
    handleSync('pea-estimator-name', 'gen-estimator-name', 'estimatorName');
    handleSync('gen-estimator-pos',  'pea-estimator-pos',  'estimatorPos');
    handleSync('pea-estimator-pos',  'gen-estimator-pos',  'estimatorPos');
    handleSync('gen-estimator-dept', 'pea-estimator-dept', 'estimatorDept');
    handleSync('pea-estimator-dept', 'gen-estimator-dept', 'estimatorDept');

    handleSync('gen-checker-name',   'pea-checker-name',   'checkerName');
    handleSync('pea-checker-name',   'gen-checker-name',   'checkerName');
    handleSync('gen-checker-pos',    'pea-checker-pos',    'checkerPos');
    handleSync('pea-checker-pos',    'gen-checker-pos',    'checkerPos');
    handleSync('gen-checker-dept',   'pea-checker-dept',   'checkerDept');
    handleSync('pea-checker-dept',   'gen-checker-dept',   'checkerDept');

    // Initial apply to PDF template
    applySignatoriesToPDF(sigs);
};

// ===========================
// FETCH REAL-TIME DIESEL PRICE
// ===========================
const fetchRealTimeDieselPrice = (isManual = false) => {
    const btn1 = document.getElementById('btn-fetch-fuel-price');
    const btn2 = document.getElementById('btn-fetch-fuel-price-addon');
    const infoBadge = document.getElementById('fuel-price-source-info');
    const input = document.getElementById('gen-fuel-price');

    if (btn1) btn1.disabled = true;
    if (btn2) btn2.disabled = true;
    if (infoBadge) {
        infoBadge.innerHTML = '⏳ กำลังดึงข้อมูลราคาน้ำมันดีเซลจริงล่าสุดจากเซิร์ฟเวอร์...';
        infoBadge.style.color = 'var(--text-muted)';
    }

    const setFinishState = () => {
        if (btn1) btn1.disabled = false;
        if (btn2) btn2.disabled = false;
    };

    const updateDieselPriceInput = (price, source) => {
        if (input) {
            input.value = price.toFixed(2);
            // Trigger calculation update event
            input.dispatchEvent(new Event('input'));
        }
        if (infoBadge) {
            infoBadge.innerHTML = `🟢 <b>ราคาน้ำมันดีเซลล่าสุด (${source}):</b> ${price.toFixed(2)} บาท/ลิตร`;
            infoBadge.style.color = '#10B981';
        }
        setFinishState();
        if (isManual) {
            alert(`ดึงราคาน้ำมันดีเซลล่าสุดสำเร็จ!\nแหล่งข้อมูล: ${source}\nราคา: ${price.toFixed(2)} บาท/ลิตร`);
        }
    };

    // 1. Direct fetch from Thai Oil API
    fetch('https://api.chnwt.dev/thai-oil-api/latest')
        .then(res => res.json())
        .then(data => {
            if (data && data.status === 'success' && data.response && data.response.stations) {
                const ptt = data.response.stations.ptt;
                const bc  = data.response.stations.bangchak;
                const dieselData = (ptt && (ptt.diesel || ptt.diesel_b7 || ptt.diesel_b20)) ||
                                   (bc && (bc.diesel || bc.diesel_b7 || bc.diesel_b20));
                if (dieselData && dieselData.price) {
                    const price = parseFloat(dieselData.price);
                    if (!isNaN(price) && price > 0) {
                        updateDieselPriceInput(price, 'ปตท./บางจาก Real-time');
                        return;
                    }
                }
            }
            throw new Error('Thai Oil API empty or invalid');
        })
        .catch(err => {
            console.warn('Direct Thai Oil API failed, trying Bangchak API...', err);
            // 2. Try Bangchak API direct
            fetch('https://oil-price.bangchak.co.th/ApiOilPrice2/th')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data) && data.length > 0 && data[0].OilList) {
                        const oilList = JSON.parse(data[0].OilList);
                        const dieselOil = oilList.find(o => o.OilName && (o.OilName.includes('ดีเซล') || o.OilName.includes('ไฮดีเซล S')));
                        if (dieselOil && dieselOil.PriceToday) {
                            const price = parseFloat(dieselOil.PriceToday);
                            if (!isNaN(price) && price > 0) {
                                updateDieselPriceInput(price, 'บางจาก Real-time');
                                return;
                            }
                        }
                    }
                    throw new Error('Bangchak direct failed');
                })
                .catch(err2 => {
                    console.warn('Bangchak direct failed, trying proxy...', err2);
                    // 3. Try CORS proxy
                    fetch('https://corsproxy.io/?' + encodeURIComponent('https://api.chnwt.dev/thai-oil-api/latest'))
                        .then(res => res.json())
                        .then(data => {
                            if (data && data.status === 'success' && data.response && data.response.stations && data.response.stations.ptt) {
                                const price = parseFloat(data.response.stations.ptt.diesel?.price || data.response.stations.ptt.diesel_b7?.price);
                                if (!isNaN(price) && price > 0) {
                                    updateDieselPriceInput(price, 'ปตท. (Proxy)');
                                    return;
                                }
                            }
                            throw new Error('Proxy failed');
                        })
                        .catch(err3 => {
                            console.error('All fetch attempts failed, using current/default price', err3);
                            setFinishState();
                            const currentVal = parseFloat(input?.value) || 38.39;
                            if (infoBadge) {
                                infoBadge.innerHTML = `ℹ️ <b>ราคาน้ำมันดีเซลปัจจุบัน:</b> ${currentVal.toFixed(2)} บาท/ลิตร (โหมดออฟไลน์/ค่ากำหนดเอง)`;
                                infoBadge.style.color = 'var(--text-muted)';
                            }
                            if (isManual) {
                                alert(`ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ราคาน้ำมันได้ในขณะนี้\nระบบจะใช้ค่าราคาเดิม: ${currentVal.toFixed(2)} บาท/ลิตร หรือท่านสามารถระบุราคาเองได้`);
                            }
                        });
                });
        });
};

// ===========================
// DOM READY
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Supabase Data First
    initSupabaseData();

    // Initialize Signatories Sync and LocalStorage
    initSignatoriesSync();

    // Fetch and apply real-time diesel price
    fetchRealTimeDieselPrice(false);

    // Live Diesel Price Manual Fetch Buttons
    const btnFetchFuel = document.getElementById('btn-fetch-fuel-price');
    if (btnFetchFuel) btnFetchFuel.addEventListener('click', () => fetchRealTimeDieselPrice(true));

    const btnFetchFuelAddon = document.getElementById('btn-fetch-fuel-price-addon');
    if (btnFetchFuelAddon) btnFetchFuelAddon.addEventListener('click', () => fetchRealTimeDieselPrice(true));

    // Set default dates
    const todayStr = getLocalDateString();
    
    // PEA Cover: Default 2 days (today and tomorrow)
    const custStartInput = document.getElementById('cust-start-date');
    const custEndInput = document.getElementById('cust-end-date');
    if (custStartInput) custStartInput.value = todayStr;
    if (custEndInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        custEndInput.value = tomorrow.toISOString().split('T')[0];
    }

    // Generator: Default 3 days (today to today + 2 days)
    const genStartInput = document.getElementById('gen-start-date');
    const genEndInput = document.getElementById('gen-end-date');
    if (genStartInput) genStartInput.value = todayStr;
    if (genEndInput) {
        const dayThree = new Date();
        dayThree.setDate(dayThree.getDate() + 2);
        genEndInput.value = dayThree.toISOString().split('T')[0];
    }

    // Auto-calculate days when dates change
    const updatePeaDays = () => {
        const startVal = document.getElementById('cust-start-date').value;
        const endVal = document.getElementById('cust-end-date').value;
        if (startVal && endVal) {
            const start = new Date(startVal);
            const end = new Date(endVal);
            if (end >= start) {
                const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                document.getElementById('pea-days').value = diffDays;
            }
        }
    };
    if (custStartInput && custEndInput) {
        custStartInput.addEventListener('change', updatePeaDays);
        custEndInput.addEventListener('change', updatePeaDays);
    }

    const updateGenDays = () => {
        const startVal = document.getElementById('gen-start-date').value;
        const endVal = document.getElementById('gen-end-date').value;
        if (startVal && endVal) {
            const start = new Date(startVal);
            const end = new Date(endVal);
            if (end >= start) {
                const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                document.getElementById('gen-days').value = diffDays;
            }
        }
    };
    if (genStartInput && genEndInput) {
        genStartInput.addEventListener('change', updateGenDays);
        genEndInput.addEventListener('change', updateGenDays);
    }

    // Two-way bind: update end date when days change manually
    const peaDaysInput = document.getElementById('pea-days');
    if (peaDaysInput) {
        peaDaysInput.addEventListener('input', () => {
            const startVal = document.getElementById('cust-start-date').value;
            const days = parseInt(peaDaysInput.value) || 0;
            if (startVal && days > 0) {
                const start = new Date(startVal);
                const end = new Date(start);
                end.setDate(start.getDate() + days - 1);
                document.getElementById('cust-end-date').value = end.toISOString().split('T')[0];
            }
        });
    }

    const genDaysInput = document.getElementById('gen-days');
    if (genDaysInput) {
        genDaysInput.addEventListener('input', () => {
            const startVal = document.getElementById('gen-start-date').value;
            const days = parseInt(genDaysInput.value) || 0;
            if (startVal && days > 0) {
                const start = new Date(startVal);
                const end = new Date(start);
                end.setDate(start.getDate() + days - 1);
                document.getElementById('gen-end-date').value = end.toISOString().split('T')[0];
            }
        });
    }

    // Render history
    renderHistory();


    // ---- ApexCharts Instances ----
    let revenueChartInstance = null;
    let fleetStatusChartInstance = null;

    const initApexCharts = (peaRev, genRev, standbyCnt, activeCnt, maintCnt) => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#94A3B8' : '#64748B';
        const borderColor = isDark ? '#334155' : '#E2E8F0';

        // 1. Revenue Trends & Breakdown Area/Bar Chart
        const revenueChartEl = document.getElementById('chart-revenue-trends');
        if (revenueChartEl) {
            const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonthIdx = now.getMonth();
            const last6Months = [];
            const monthKeys = [];

            for (let i = 5; i >= 0; i--) {
                const d = new Date(currentYear, currentMonthIdx - i, 1);
                const y = d.getFullYear();
                const m = d.getMonth();
                last6Months.push(months[m]);
                monthKeys.push(`${y}-${String(m + 1).padStart(2, '0')}`);
            }

            // Real revenue distribution per month based on active quoteHistory
            const peaDataSeries = [0, 0, 0, 0, 0, 0];
            const genDataSeries = [0, 0, 0, 0, 0, 0];

            if (Array.isArray(quoteHistory) && quoteHistory.length > 0) {
                quoteHistory.forEach(q => {
                    const dateStr = q.createdAt || q.startDate || q.serviceDate || getLocalDateString();
                    let qKey = '';
                    if (typeof dateStr === 'string') {
                        const match = dateStr.match(/(\d{4})-(\d{2})/);
                        if (match) qKey = `${match[1]}-${match[2]}`;
                    }
                    if (!qKey) {
                        const dt = new Date(dateStr);
                        if (!isNaN(dt.getTime())) {
                            qKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
                        }
                    }

                    let idx = monthKeys.indexOf(qKey);
                    // If within range or newly created in current period
                    if (idx === -1) idx = 5;

                    if (q.type === 'cover') {
                        peaDataSeries[idx] += Math.round(q.total || 0);
                    } else if (q.type === 'generator') {
                        genDataSeries[idx] += Math.round(q.totalPea || q.total || 0);
                    }
                });
            }

            const revenueOptions = {
                series: [{
                    name: 'ครอบการ์ด (฿)',
                    data: peaDataSeries
                }, {
                    name: 'เช่าเครื่องกำเนิดไฟฟ้า (฿)',
                    data: genDataSeries
                }],
                chart: {
                    type: 'area',
                    height: 280,
                    toolbar: { show: false },
                    fontFamily: 'Prompt, sans-serif',
                    background: 'transparent'
                },
                colors: ['#10B981', '#3B82F6'],
                dataLabels: { enabled: false },
                stroke: { curve: 'smooth', width: 2.5 },
                fill: {
                    type: 'gradient',
                    gradient: {
                        shadeIntensity: 1,
                        opacityFrom: 0.45,
                        opacityTo: 0.05,
                        stops: [0, 95, 100]
                    }
                },
                grid: {
                    borderColor: borderColor,
                    strokeDashArray: 4
                },
                xaxis: {
                    categories: last6Months,
                    labels: { style: { colors: textColor, fontSize: '12px', fontFamily: 'Prompt, sans-serif' } },
                    axisBorder: { color: borderColor },
                    axisTicks: { color: borderColor }
                },
                yaxis: {
                    min: 0,
                    forceNiceScale: true,
                    labels: {
                        style: { colors: textColor, fontSize: '11px', fontFamily: 'Prompt, sans-serif' },
                        formatter: (val) => val >= 1000 ? (val / 1000).toFixed(0) + 'k ฿' : (val || 0) + ' ฿'
                    }
                },
                tooltip: {
                    theme: isDark ? 'dark' : 'light',
                    y: { formatter: (val) => fmt(val) + ' บาท' }
                },
                legend: {
                    position: 'top',
                    horizontalAlign: 'right',
                    labels: { colors: textColor, useSeriesColors: false }
                }
            };

            if (revenueChartInstance) {
                revenueChartInstance.updateOptions({
                    theme: { mode: isDark ? 'dark' : 'light' },
                    grid: { borderColor: borderColor },
                    xaxis: { categories: last6Months, labels: { style: { colors: textColor } } },
                    yaxis: { labels: { style: { colors: textColor } } },
                    legend: { labels: { colors: textColor } }
                });
                revenueChartInstance.updateSeries([
                    { name: 'ครอบการ์ด (฿)', data: peaDataSeries },
                    { name: 'เช่าเครื่องกำเนิดไฟฟ้า (฿)', data: genDataSeries }
                ]);
            } else {
                revenueChartInstance = new ApexCharts(revenueChartEl, revenueOptions);
                revenueChartInstance.render();
            }
        }

        // 2. Fleet Status Donut Chart
        const fleetChartEl = document.getElementById('chart-fleet-status');
        if (fleetChartEl) {
            const fleetOptions = {
                series: [standbyCnt, activeCnt, maintCnt],
                labels: ['ว่าง / Standby', 'กำลังปฏิบัติงาน', 'ซ่อมบำรุง'],
                chart: {
                    type: 'donut',
                    height: 280,
                    fontFamily: 'Prompt, sans-serif',
                    background: 'transparent'
                },
                colors: ['#10B981', '#F59E0B', '#F43F5E'],
                plotOptions: {
                    pie: {
                        donut: {
                            size: '72%',
                            labels: {
                                show: true,
                                name: { fontSize: '13px', color: textColor },
                                value: {
                                    fontSize: '22px',
                                    fontWeight: 700,
                                    color: isDark ? '#F8FAFC' : '#0F172A',
                                    formatter: (val) => val + ' เครื่อง'
                                },
                                total: {
                                    show: true,
                                    label: 'รวมทั้งหมด',
                                    color: textColor,
                                    fontSize: '12px',
                                    formatter: (w) => w.globals.seriesTotals.reduce((a, b) => a + b, 0) + ' เครื่อง'
                                }
                            }
                        }
                    }
                },
                stroke: { show: true, width: 2, colors: [isDark ? '#1E293B' : '#FFFFFF'] },
                legend: {
                    position: 'bottom',
                    labels: { colors: textColor },
                    markers: { radius: 12 }
                },
                tooltip: {
                    theme: isDark ? 'dark' : 'light',
                    y: { formatter: (val) => val + ' เครื่อง' }
                },
                dataLabels: { enabled: false }
            };

            if (fleetStatusChartInstance) {
                fleetStatusChartInstance.updateOptions({
                    theme: { mode: isDark ? 'dark' : 'light' },
                    stroke: { colors: [isDark ? '#1E293B' : '#FFFFFF'] },
                    legend: { labels: { colors: textColor } },
                    plotOptions: {
                        pie: {
                            donut: {
                                labels: {
                                    name: { color: textColor },
                                    value: { color: isDark ? '#F8FAFC' : '#0F172A' },
                                    total: { color: textColor }
                                }
                            }
                        }
                    }
                });
                fleetStatusChartInstance.updateSeries([standbyCnt, activeCnt, maintCnt]);
            } else {
                fleetStatusChartInstance = new ApexCharts(fleetChartEl, fleetOptions);
                fleetStatusChartInstance.render();
            }
        }
    };

    const renderRecentQuotesFeed = () => {
        const tbody = document.getElementById('dash-recent-quotes-tbody');
        if (!tbody) return;
        
        const history = quoteHistory;
        if (history.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align:center; padding:24px; color:var(--text-muted);">
                        ยังไม่มีรายการใบเสนอราคาในระบบ
                    </td>
                </tr>`;
            return;
        }

        const recent = history.slice(0, 5);
        tbody.innerHTML = recent.map(q => {
            const isCover = q.type === 'cover';
            const badgeClass = isCover ? 'badge-green' : 'badge-orange';
            const badgeText = isCover ? 'ครอบการ์ด' : `${q.genSize || ''} kW`;
            const name = q.custName || q.projectName || 'ไม่ระบุชื่อ';
            const amount = isCover ? q.total : (q.totalPea || 0);

            return `
                <tr>
                    <td><span class="badge ${badgeClass}">${badgeText}</span></td>
                    <td>
                        <div style="font-weight:600; color:var(--text-main);">${name}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${q.custId ? 'CA: ' + q.custId : (q.serviceDate || '')}</div>
                    </td>
                    <td style="font-weight:700; color:var(--text-main); font-family:'Prompt',sans-serif;">
                        ${fmt(amount)} ฿
                    </td>
                    <td>
                        <div style="display:flex; gap:6px;">
                            <button class="btn btn-xs btn-outline" style="cursor:pointer; padding:4px 8px; font-size:0.85rem;" onclick="inspectQuote('${q.id}')" title="ตรวจสอบรายละเอียดใบเสนอราคา">
                                📋
                            </button>
                            <button class="btn btn-xs btn-outline" style="cursor:pointer; padding:4px 8px; font-size:0.85rem;" onclick="reprintQuote('${q.id}')" title="พิมพ์ใบเสนอราคา (PDF)">
                                🖨️
                            </button>
                        </div>
                    </td>
                </tr>`;
        }).join('');
    };

    // ---- Dashboard Logic ----
    let dashboardMap = null;
    let dashboardMarkersGroup = null;

    const initDashboardMap = () => {
        const mapContainer = document.getElementById('dashboard-map');
        if (!mapContainer) return;
        
        if (!dashboardMap) {
            if (mapContainer.offsetHeight === 0) return; // Must be visible for FIRST initialization
            dashboardMap = L.map('dashboard-map').setView([17.6500, 103.2000], 8);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(dashboardMap);
            dashboardMarkersGroup = L.layerGroup().addTo(dashboardMap);
        } else {
            if (dashboardMarkersGroup) {
                dashboardMarkersGroup.clearLayers();
            } else {
                dashboardMarkersGroup = L.layerGroup().addTo(dashboardMap);
            }
            setTimeout(() => { if (dashboardMap) dashboardMap.invalidateSize(); }, 50);
        }

        // Render hubs
        DISTRICT_HUBS.forEach(hub => {
            const standby = GENERATOR_FLEET.filter(g => g.hubId === hub.id && g.status === 'Standby').length;
            const hubMarker = L.circleMarker([hub.lat, hub.lng], {
                radius: 7,
                color: '#3B82F6',
                fillColor: '#3B82F6',
                fillOpacity: 0.75,
                weight: 2
            }).bindPopup(`<b>🏢 ${hub.name}</b><br>จุดรวมงานเขต กฟฉ.1<br>🟢 เครื่องพร้อมใช้งาน: ${standby} เครื่อง`);

            hubMarker.bindTooltip(hub.name, {
                direction: 'top',
                offset: [0, -6],
                className: 'hub-marker-label'
            });
            dashboardMarkersGroup.addLayer(hubMarker);
        });

        // Render all generator job coordinates
        fleetBookings.forEach(booking => {
            if (booking.lat && booking.lng && booking.genSize > 0) {
                const orangeIcon = L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });
                
                const marker = L.marker([booking.lat, booking.lng], { icon: orangeIcon });
                marker.bindPopup(`
                    <div style="font-family:'Prompt',sans-serif; min-width:200px;">
                        <div style="font-weight:700; color:#1E293B; font-size:0.92rem; margin-bottom:4px;">⚡ ${booking.projectName || booking.locationName}</div>
                        <div style="font-size:0.82rem; color:#475569; line-height:1.4;">
                            📍 <b>สถานที่:</b> ${booking.locationName}<br>
                            ⚡ <b>เครื่อง:</b> ${booking.genName} (${booking.genSize} kW)<br>
                            🏢 <b>คลังต้นทาง:</b> ${booking.hubName || '-'}<br>
                            📅 <b>วันปฏิบัติงาน:</b> ${fmtDateRange(booking.startDate, booking.endDate)}<br>
                            👷 <b>ผู้รับผิดชอบ:</b> ${booking.responsible || '-'}
                        </div>
                    </div>
                `);
                 
                marker.bindTooltip(`${booking.genSize} kW`, {
                    permanent: true,
                    direction: 'bottom',
                    className: 'job-marker-label',
                    offset: [0, 5]
                });

                dashboardMarkersGroup.addLayer(marker);
            }
        });
    };

    const renderDashboard = () => {
        // Refresh data from localStorage to ensure we have the absolute latest state
// removed localStorage fetch
// removed localStorage fetch
        
        // Generator Stats
        const total = GENERATOR_FLEET.length;
        const maint = GENERATOR_FLEET.filter(g => g.status === 'Maintenance').length;
        const todayStr = getLocalDateString();
        const activeGenIds = fleetBookings
            .filter(b => b.startDate <= todayStr && b.endDate >= todayStr && b.genSize > 0)
            .map(b => b.genId);
        const activeCnt = GENERATOR_FLEET.filter(g => activeGenIds.includes(g.id)).length;
        const standbyCnt = total - activeCnt - maint;
        const standbyPct = total > 0 ? Math.round((standbyCnt / total) * 100) : 0;

        const totalGenEl = document.getElementById('dash-total-gen');
        const standbyGenEl = document.getElementById('dash-standby-gen');
        const activeGenEl = document.getElementById('dash-active-gen');
        const maintGenEl = document.getElementById('dash-maint-gen');
        const standbyPctEl = document.getElementById('dash-standby-pct');

        if (totalGenEl) totalGenEl.textContent = total;
        if (standbyGenEl) standbyGenEl.textContent = standbyCnt;
        if (activeGenEl) activeGenEl.textContent = activeCnt;
        if (maintGenEl) maintGenEl.textContent = maint;
        if (standbyPctEl) standbyPctEl.textContent = `${standbyPct}% พร้อมใช้งาน`;

        const navFleetActiveBadge = document.getElementById('nav-badge-fleet-active');
        if (navFleetActiveBadge) {
            navFleetActiveBadge.textContent = activeCnt > 0 ? `${activeCnt} งานกำลังจ่ายไฟ` : `${standbyCnt} เครื่องพร้อมใช้งาน`;
        }

        // Revenue Stats
        let peaRev = 0;
        let genRev = 0;
        let peaItems = 0;
        quoteHistory.forEach(q => {
            if (q.type === 'cover') {
                peaRev += q.total || 0;
                peaItems += (parseInt(q.insQty) || 0);
            }
            if (q.type === 'generator') {
                genRev += q.totalPea || 0;
            }
        });
        
        const revPeaEl = document.getElementById('dash-rev-pea');
        const revGenEl = document.getElementById('dash-rev-gen');
        const revTotalEl = document.getElementById('dash-rev-total');

        if (revPeaEl) revPeaEl.textContent = fmt(peaRev) + ' ฿';
        if (revGenEl) revGenEl.textContent = fmt(genRev) + ' ฿';
        if (revTotalEl) revTotalEl.textContent = fmt(peaRev + genRev) + ' ฿';
        
        // Render ApexCharts and Recent Activity
        initApexCharts(peaRev, genRev, standbyCnt, activeCnt, maint);
        renderRecentQuotesFeed();
    };

    // Global switchTab helper function
    window.switchTab = (target) => {
        document.querySelectorAll('.tab-btn').forEach(b => {
            if (b.getAttribute('data-target') === target) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        const targetEl = document.getElementById(target);
        if (targetEl) targetEl.classList.add('active');

        // Update Breadcrumb and Titles
        const pageTitleEl = document.getElementById('current-page-title');
        const breadcrumbEl = document.getElementById('current-breadcrumb');
        const titles = {
            'tab-dashboard': ['Dashboard', 'ภาพรวมระบบและสถิติ'],
            'tab-pea': ['ครอบการ์ด', 'บริการฉนวนครอบสายไฟและลูกถ้วยแรงสูง'],
            'tab-gen': ['เช่าเครื่องกำเนิดไฟฟ้า', 'วิเคราะห์ขนาดและประมาณการค่าบริการ'],
            'tab-fleet': ['คิวและแผนที่เครื่องกำเนิดไฟฟ้า', 'บริหารจัดการคิวและตำแหน่งติดตั้ง'],
            'tab-history': ['ประวัติใบเสนอราคา', 'บันทึกข้อมูลและออกเอกสารย้อนหลัง']
        };

        if (titles[target]) {
            if (pageTitleEl) pageTitleEl.textContent = titles[target][0];
            if (breadcrumbEl) breadcrumbEl.textContent = titles[target][1];
        }

        // Close sidebar on mobile
        const sidebar = document.getElementById('app-sidebar');
        if (sidebar && window.innerWidth <= 992) {
            sidebar.classList.remove('open');
        }

        if (target === 'tab-dashboard') {
            renderDashboard();
            setTimeout(() => {
                initDashboardMap();
                if (dashboardMap) dashboardMap.invalidateSize();
            }, 100);
            setTimeout(() => {
                if (dashboardMap) dashboardMap.invalidateSize();
            }, 300);
        }
        if (target === 'tab-history') {
            renderHistory();
        }
        if (target === 'tab-fleet') {
            setTimeout(() => {
// removed localStorage fetch
                initFleetMap();
                if (map) {
                    map.invalidateSize();
                    updateMapMarkers();
                }
                const fDateEl = document.getElementById('filter-schedule-date');
                renderScheduleList(fDateEl ? fDateEl.value : '');
                renderCalendar();
                updateFleetStats();
            }, 100);
            setTimeout(() => {
                if (map) map.invalidateSize();
            }, 300);
        }
    };

    // ---- Tab Switching Event Listeners ----
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            if (target) switchTab(target);
        });
    });

    // ---- Sidebar Toggle Handler ----
    const sidebarToggleBtn = document.getElementById('btn-sidebar-toggle');
    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', () => {
            const sidebar = document.getElementById('app-sidebar');
            if (sidebar) sidebar.classList.toggle('open');
        });
    }

    // ---- Eye-Care Theme Toggle Handler ----
    const themeToggleBtn = document.getElementById('btn-theme-toggle');
    const moonIcon = document.getElementById('theme-icon-moon');
    const sunIcon = document.getElementById('theme-icon-sun');

    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('wequote_theme', theme);
        if (theme === 'dark') {
            if (moonIcon) moonIcon.style.display = 'none';
            if (sunIcon) sunIcon.style.display = 'block';
        } else {
            if (moonIcon) moonIcon.style.display = 'block';
            if (sunIcon) sunIcon.style.display = 'none';
        }
        // Re-render charts with updated theme colors
        renderDashboard();
    };

    // Initialize saved theme
    const savedTheme = localStorage.getItem('wequote_theme') || 'light';
    applyTheme(savedTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(nextTheme);
        });
    }

    // ---- Global Header Search ----
    const globalSearchInput = document.getElementById('global-header-search');
    if (globalSearchInput) {
        globalSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = globalSearchInput.value.trim();
                if (query) {
                    switchTab('tab-history');
                    const historyInput = document.getElementById('history-search-input');
                    if (historyInput) {
                        historyInput.value = query;
                        renderHistory();
                    }
                }
            }
        });
    }

    // ---- History Search Listeners ----
    const historySearchInput = document.getElementById('history-search-input');
    const historySearchType = document.getElementById('history-search-type');
    if (historySearchInput) historySearchInput.addEventListener('input', renderHistory);
    if (historySearchType) historySearchType.addEventListener('change', renderHistory);
    
    // Initialize default tab (Dashboard)
    renderDashboard();
    setTimeout(() => {
        initDashboardMap();
    }, 200);

    // ---- PEA Cover Calculation ----
    document.getElementById('pea-calculate-btn').addEventListener('click', () => {
        const wireQty = parseInt(document.getElementById('pea-qty-wire').value) || 0;
        const insQty  = parseInt(document.getElementById('pea-qty-insulator').value) || 0;
        const days    = parseInt(document.getElementById('pea-days').value) || 0;

        const wireCost = PEA_COVER_RATE * wireQty * days;
        const insCost  = PEA_COVER_RATE * insQty  * days;
        const subtotal = wireCost + insCost + PEA_INSTALL_COST;
        const vat      = subtotal * VAT_RATE;
        const total    = subtotal + vat;

        // Update summary panel
        document.getElementById('out-wire-qty').textContent = wireQty;
        document.getElementById('out-days').textContent     = days;
        document.getElementById('out-ins-qty').textContent  = insQty;
        document.getElementById('out-days2').textContent    = days;
        document.getElementById('out-wire-cost').textContent = fmt(wireCost) + ' ฿';
        document.getElementById('out-ins-cost').textContent  = fmt(insCost)  + ' ฿';
        document.getElementById('out-subtotal').textContent  = fmt(subtotal) + ' ฿';
        document.getElementById('out-vat').textContent       = fmt(vat)      + ' ฿';
        document.getElementById('out-total').textContent     = fmt(total)    + ' ฿';

         // Store for PDF
        window._currentPeaData = {
            type:        'cover',
            custId:      document.getElementById('cust-id').value,
            custName:    document.getElementById('cust-name').value,
            custAddress: document.getElementById('cust-address').value,
            startDate:   document.getElementById('cust-start-date').value,
            endDate:     document.getElementById('cust-end-date').value,
            serviceDate: fmtDateRange(
                document.getElementById('cust-start-date').value,
                document.getElementById('cust-end-date').value
            ),
            location:    document.getElementById('cust-location').value,
            wireQty, insQty, days, wireCost, insCost, subtotal, vat, total,
            estimatorName: document.getElementById('pea-estimator-name')?.value || '',
            estimatorPos:  document.getElementById('pea-estimator-pos')?.value || '',
            estimatorDept: document.getElementById('pea-estimator-dept')?.value || '',
            checkerName:   document.getElementById('pea-checker-name')?.value || '',
            checkerPos:    document.getElementById('pea-checker-pos')?.value || '',
            checkerDept:   document.getElementById('pea-checker-dept')?.value || ''
        };

        const badge = document.getElementById('pea-save-status');
        if (badge) {
            badge.textContent = 'คำนวณแล้ว (ยังไม่บันทึก)';
            badge.style.background = '#FFF3CD';
            badge.style.color = '#856404';
        }
    });


    // Save Data (Dashboard update)
    const peaSaveDataBtn = document.getElementById('pea-save-data');
    if (peaSaveDataBtn) {
        peaSaveDataBtn.addEventListener('click', () => {
            if (!window._currentPeaData) { alert('กรุณาคำนวณราคาก่อนบันทึกข้อมูลครับ'); return; }
            saveHistory(window._currentPeaData);
            const badge = document.getElementById('pea-save-status');
            if (badge) {
                badge.textContent = 'บันทึกแล้ว ✓';
                badge.style.background = '#E8F5EE';
                badge.style.color = '#1F906A';
            }
            alert('บันทึกข้อมูลสำเร็จ! อัปเดตรายได้ "ครอบการ์ด" ในหน้า Dashboard เรียบร้อยแล้วครับ');
            renderDashboard();
            initDashboardMap();
        });
    }

    // Export PDF
    document.getElementById('pea-export-pdf').addEventListener('click', () => {
        if (!window._currentPeaData) { alert('กรุณาคำนวณราคาก่อนออกใบเสนอราคา'); return; }
        populateAndPrint(window._currentPeaData);
    });



    // ---- Generator Amp input (Amp is user-editable; kW is fixed from machine selection) ----
    const updateAmpIndicator = () => {
        const kw     = parseFloat(document.getElementById('gen-load-kw').value) || 0;
        const amp    = parseFloat(document.getElementById('gen-load-amp').value) || 0;
        const maxAmp = Math.round(kw * 1.8);   // rated max current for selected gen

        const pct    = maxAmp > 0 ? (amp / maxAmp) * 100 : 0;
        const pctClamped = Math.min(pct, 150);  // bar can show up to 150% (overload zone)

        // Color: green ≤70%, yellow 70–100%, red >100%
        let barColor = '#1F906A';
        if (pct > 100) barColor = '#EF4444';
        else if (pct > 70) barColor = '#F59E0B';

        document.getElementById('amp-load-bar').style.width  = Math.min(pctClamped, 100) + '%';
        document.getElementById('amp-load-bar').style.background = barColor;
        document.getElementById('amp-load-label').textContent = `โหลด: ${pct.toFixed(0)}%`;
        document.getElementById('amp-max-label').textContent  = `สูงสุด: ${maxAmp} A`;
        document.getElementById('amp-max-val').textContent    = maxAmp;

        // Show/hide overload warning
        const warn = document.getElementById('amp-overload-warning');
        if (pct > 100) {
            warn.style.display = 'block';
            document.getElementById('gen-load-amp').style.borderColor = '#EF4444';
            document.getElementById('gen-load-amp').style.backgroundColor = '#FEF2F2';
        } else {
            warn.style.display = 'none';
            document.getElementById('gen-load-amp').style.borderColor = '';
            document.getElementById('gen-load-amp').style.backgroundColor = '';
        }
    };

    document.getElementById('gen-load-amp').addEventListener('input', updateAmpIndicator);

    // ---- Generator Hours Max 12 Limit Validation ----
    const genHoursInput = document.getElementById('gen-hours');
    const genHoursWarning = document.getElementById('gen-hours-warning');
    const genCalculateBtn = document.getElementById('gen-calculate-btn');

    if (genHoursInput && genHoursWarning && genCalculateBtn) {
        genHoursInput.addEventListener('input', () => {
            const val = parseFloat(genHoursInput.value) || 0;
            if (val > 12) {
                genHoursWarning.style.display = 'block';
                genHoursInput.style.borderColor = '#EC5A5A';
                genHoursInput.style.backgroundColor = '#FFF5F5';
                genCalculateBtn.disabled = true;
                genCalculateBtn.style.opacity = '0.6';
                genCalculateBtn.style.cursor = 'not-allowed';
            } else {
                genHoursWarning.style.display = 'none';
                genHoursInput.style.borderColor = '';
                genHoursInput.style.backgroundColor = '';
                genCalculateBtn.disabled = false;
                genCalculateBtn.style.opacity = '';
                genCalculateBtn.style.cursor = '';
            }
        });
    }

    // ---- Generator Calculation ----
    const updateForecast = (selectedSize, params) => {
        const { type, loadKw, dist, days, hours, fuelPrice } = params;
        const typeKey = type === 'A_EXEMPT' ? 'A' : type;

        document.querySelectorAll('.gen-option').forEach(el =>
            el.classList.toggle('selected', parseInt(el.dataset.size) === selectedSize));

        let rentalCost = getRentalCost(typeKey, selectedSize, days);
        if (type === 'A_EXEMPT') rentalCost = 0;

        const transportCost  = getTransportCost(selectedSize, dist);
        const opCost         = getControlCost(days);
        const subtotalPea    = rentalCost + transportCost + opCost;
        const vatPea         = subtotalPea * VAT_RATE;
        const totalPea       = subtotalPea + vatPea;

        const loadPct       = Math.min(loadKw / selectedSize, 1.0);
        const fuelRate      = getFuelRate(selectedSize, loadPct);
        const totalFuelLit  = fuelRate * hours * days;
        const totalFuelCost = totalFuelLit * fuelPrice;
        const grandTotal    = totalPea + totalFuelCost;

        // Store current gen data for PDF
        window._currentGenData = {
            type:        'generator',
            rawType:     type,
            genSize:     selectedSize,
            loadKw,
            fuelRate,
            fuelPrice,
            hours,
            days,
            rentalCost,
            transportCost,
            opCost,
            subtotalPea,
            vatPea,
            totalPea,
            totalFuelLit,
            totalFuelCost,
            grandTotal,
            startDate:   document.getElementById('gen-start-date').value,
            endDate:     document.getElementById('gen-end-date').value,
            serviceDate: fmtDateRange(
                document.getElementById('gen-start-date').value,
                document.getElementById('gen-end-date').value
            ),
            purpose:     document.getElementById('gen-purpose').value,
            custId:      document.getElementById('gen-cust-id').value,
            custName:    document.getElementById('gen-cust-name').value,
            custAddress: document.getElementById('gen-cust-address').value,
            location:    document.getElementById('gen-location').value,
            estimatorName: document.getElementById('gen-estimator-name')?.value || '',
            estimatorPos:  document.getElementById('gen-estimator-pos')?.value || '',
            estimatorDept: document.getElementById('gen-estimator-dept')?.value || '',
            checkerName:   document.getElementById('gen-checker-name')?.value || '',
            checkerPos:    document.getElementById('gen-checker-pos')?.value || '',
            checkerDept:   document.getElementById('gen-checker-dept')?.value || ''
        };
        // Determine coordinates & generator/hub info
        let matchedHub = null;
        const locText = (document.getElementById('gen-location')?.value || '').trim();
        if (locText) {
            matchedHub = DISTRICT_HUBS.find(h => 
                locText.includes(h.name.replace('กฟจ.', '').replace('กฟส.', '')) || 
                locText.includes(h.name)
            );
        }

        const matchedGen = GENERATOR_FLEET.find(g => g.size === selectedSize && g.status !== 'Maintenance') || 
                           GENERATOR_FLEET.find(g => g.size === selectedSize) || 
                           GENERATOR_FLEET[0];
        if (!matchedHub && matchedGen) {
            matchedHub = DISTRICT_HUBS.find(h => h.id === matchedGen.hubId);
        }
        if (!matchedHub) matchedHub = DISTRICT_HUBS[0];

        if (window._activeRentalData) {
            window._currentGenData.genId = window._activeRentalData.genId;
            window._currentGenData.genName = (GENERATOR_FLEET.find(g => g.id === window._activeRentalData.genId) || matchedGen).name;
            window._currentGenData.lat = window._activeRentalData.lat;
            window._currentGenData.lng = window._activeRentalData.lng;
            window._currentGenData.hubName = window._activeRentalData.hubName;
        } else {
            window._currentGenData.genId = matchedGen.id;
            window._currentGenData.genName = matchedGen.name;
            window._currentGenData.lat = matchedHub.lat;
            window._currentGenData.lng = matchedHub.lng;
            window._currentGenData.hubName = matchedHub.name;
        }

        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('cost-rental', fmt(rentalCost) + ' ฿');
        set('cost-transport', fmt(transportCost) + ' ฿');
        set('cost-op', fmt(opCost) + ' ฿');
        set('cost-vat', fmt(vatPea) + ' ฿');
        set('cost-pea-total', fmt(totalPea) + ' ฿');
        set('disp-gen-days', days);
        set('disp-gen-dist', dist);
        set('forecast-title', `พยากรณ์ค่าใช้จ่าย เช่า Gen ${selectedSize} kW`);
        set('forecast-load-pct', (loadPct * 100).toFixed(0));
        set('forecast-fuel-rate', fuelRate.toFixed(1));
        document.getElementById('fuel-progress').style.width = Math.min(loadPct * 100, 100) + '%';
        set('forecast-total-fuel', fmt(totalFuelLit));
        set('forecast-fuel-cost', fmt(totalFuelCost));
        set('forecast-grand-total', fmt(grandTotal));
        document.getElementById('fuel-forecast-container').style.display = 'block';
    };

    document.getElementById('gen-calculate-btn').addEventListener('click', () => {
        const type      = document.getElementById('gen-type').value;
        // loadKw = actual electrical demand derived from Amp (amp ÷ 1.8)
        // kW field is locked to machine size and is NOT the load demand
        const amp       = parseFloat(document.getElementById('gen-load-amp').value) || 0;
        const loadKw    = amp / 1.8;
        const dist      = parseFloat(document.getElementById('gen-distance').value) || 0;
        const days      = parseInt(document.getElementById('gen-days').value) || 0;
        const hours     = parseFloat(document.getElementById('gen-hours').value) || 0;
        const fuelPrice = parseFloat(document.getElementById('gen-fuel-price').value) || 0;
        const params    = { type, loadKw, dist, days, hours, fuelPrice };

        const sizes  = [120, 300, 500, 800];
        const reqKw  = loadKw / 0.7;
        let bestSize = 800;
        if (window._forceGenSize) {
            bestSize = window._forceGenSize;
            window._forceGenSize = null; // reset
        } else if (window._activeRentalData) {
            // If a machine was selected from the queue, keep that size locked
            const lockedGen = GENERATOR_FLEET.find(g => g.id === window._activeRentalData.genId);
            if (lockedGen) bestSize = lockedGen.size;
        } else {
            for (const s of sizes) { if (s >= reqKw) { bestSize = s; break; } }
        }
        if (reqKw > 800 && !bestSize) alert('โหลดไฟฟ้าเกินกว่าเครื่องกำเนิดไฟฟ้าสูงสุด (800 kW) ที่กำหนด');

        const container = document.getElementById('gen-options-container');
        container.innerHTML = '';
        const typeKey = type === 'A_EXEMPT' ? 'A' : type;

        sizes.forEach(size => {
            const loadPct = loadKw / size;
            let desc = '';
            if (loadPct > 1)            desc = 'โหลดเกินขนาดเครื่อง — ห้ามใช้งาน';
            else if (size === bestSize)  desc = `รองรับโหลดได้ ${(loadPct * 100).toFixed(0)}% — เหมาะสมที่สุด`;
            else if (size < bestSize)    desc = `โหลด ${(loadPct * 100).toFixed(0)}% — เสี่ยงเกิน ไม่แนะนำ`;
            else                         desc = `โหลด ${(loadPct * 100).toFixed(0)}% — ปลอดภัย แต่สิ้นเปลืองน้ำมันกว่า`;

            const dayRate = type === 'A_EXEMPT' ? 0 : getRentalCost(typeKey, size, 1);
            const isSelected = size === bestSize;

            const card = document.createElement('div');
            card.className = 'gen-option' + (isSelected ? ' selected' : '');
            card.dataset.size = size;
            card.title = `คลิกเพื่อดูราคาขนาด ${size} kW`;
            card.innerHTML = `
                <div class="gen-info">
                    <div class="gen-header">
                        <h4>${size} kW</h4>
                        ${isSelected ? '<span class="tiny-badge">แนะนำ</span>' : ''}
                    </div>
                    <p>${desc}</p>
                </div>
                <div class="gen-price">
                    <h4>${fmt(dayRate)} <small>฿/วัน</small></h4>
                </div>`;
            card.addEventListener('click', () => updateForecast(size, params));
            container.appendChild(card);
        });

        // Initialize by simulating a click on the best recommended size
        updateForecast(bestSize, params);

        // Update save status badge
        const badge = document.getElementById('gen-save-status');
        if (badge) {
            badge.textContent = 'คำนวณแล้ว (ยังไม่บันทึก)';
            badge.style.background = '#FFF3CD';
            badge.style.color = '#856404';
        }
    });

    // Gen PDF export
    document.getElementById('gen-export-pdf').addEventListener('click', genExportPDF);


    // Gen Save Data (Dashboard update)
    const genSaveDataBtn = document.getElementById('gen-save-data');
    if (genSaveDataBtn) {
        genSaveDataBtn.addEventListener('click', () => {
            if (!window._currentGenData) {
                const calcBtn = document.getElementById('gen-calculate-btn');
                if (calcBtn) calcBtn.click();
            }
            if (!window._currentGenData) { alert('กรุณาวิเคราะห์และคำนวณราคาก่อนบันทึกข้อมูลครับ'); return; }
            
            if (window._extendingBookingId) {
                if (window._extendingBookingId.startsWith('q_')) {
                    const oldQid = window._extendingBookingId.substring(2);
                    quoteHistory = quoteHistory.filter(q => String(q.id) !== String(oldQid));
                    db.from('quote_history').delete().eq('id', oldQid).then();
                }
                fleetBookings = fleetBookings.filter(b => b.id !== window._extendingBookingId);
                db.from('fleet_bookings').delete().eq('id', window._extendingBookingId).then();
                window._extendingBookingId = null;
            }
            
            saveHistory(window._currentGenData);
            
            const badge = document.getElementById('gen-save-status');
            if (badge) {
                badge.textContent = 'บันทึกแล้ว ✓';
                badge.style.background = '#E8F5EE';
                badge.style.color = '#1F906A';
            }
            alert('บันทึกข้อมูลสำเร็จ! ระบบได้อัปเดตข้อมูลไปยัง Dashboard และตารางคิวงานเรียบร้อยแล้วครับ');
            
            renderDashboard();
            initDashboardMap();
            updateMapMarkers();
            updateFleetStats();
            renderScheduleList('');
            renderCalendar();
            renderHistory();
        });
    }

    // Reset save badge to 'ยังไม่บันทึก' when fields change
    const resetGenSaveStatus = () => {
        const badge = document.getElementById('gen-save-status');
        if (badge) {
            badge.textContent = 'ยังไม่บันทึก';
            badge.style.background = '#F1F3F5';
            badge.style.color = '#6B7280';
        }
    };

    const genInputs = [
        'gen-cust-id', 'gen-cust-name', 'gen-cust-address', 'gen-location',
        'gen-purpose', 'gen-start-date', 'gen-end-date', 'gen-days',
        'gen-hours', 'gen-load-amp', 'gen-distance', 'gen-fuel-price', 'gen-type'
    ];
    genInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const eventType = el.tagName === 'SELECT' || el.type === 'date' ? 'change' : 'input';
            el.addEventListener(eventType, resetGenSaveStatus);
        }
    });
    // Fleet management logic
    let map = null;
    let markersGroup = null;

    const haversineDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    const initFleetMap = () => {
        const mapContainer = document.getElementById('fleet-map');
        if (!mapContainer) return;

        if (map) {
            setTimeout(() => { 
                map.invalidateSize(); 
                updateMapMarkers();
            }, 50);
            return;
        }
        
        if (mapContainer.offsetHeight === 0) return;

        map = L.map('fleet-map').setView([17.6500, 103.2000], 8);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        
        markersGroup = L.layerGroup().addTo(map);
        updateMapMarkers();
    };

    const updateMapMarkers = () => {
        if (!map) return;
        if (!markersGroup) {
            markersGroup = L.layerGroup().addTo(map);
        }
        markersGroup.clearLayers();

// removed localStorage fetch
        
        // 1. Render Hubs
        DISTRICT_HUBS.forEach(hub => {
            const standby = GENERATOR_FLEET.filter(g => g.hubId === hub.id && g.status === 'Standby').length;
            const active = GENERATOR_FLEET.filter(g => g.hubId === hub.id && g.status === 'Active').length;
            const maint = GENERATOR_FLEET.filter(g => g.hubId === hub.id && g.status === 'Maintenance').length;
            
            const tooltipText = `<b>🏢 ${hub.name}</b><br>
                                 🟢 ว่าง: ${standby} เครื่อง<br>
                                 🟠 ปฏิบัติงาน: ${active} เครื่อง<br>
                                 🔴 ซ่อมบำรุง: ${maint} เครื่อง`;
                                 
            const marker = L.circleMarker([hub.lat, hub.lng], {
                radius: 8 + standby * 1.5,
                fillColor: '#10B981',
                color: '#FFFFFF',
                weight: 2.5,
                fillOpacity: 0.85
            });
            
            marker.bindPopup(tooltipText);
            
            marker.bindTooltip(hub.name, {
                permanent: true,
                direction: 'top',
                className: 'hub-marker-label',
                offset: [0, -6]
            });
            
            markersGroup.addLayer(marker);
        });
        
        // 2. Render Active Bookings
        fleetBookings.forEach(booking => {
            if (booking.genSize === 0 || !booking.lat || !booking.lng) return;
            
            const tooltipText = `<b>⚡ ${booking.projectName}</b><br>
                                 📍 สถานที่: ${booking.locationName}<br>
                                 ⚡ เครื่อง: ${booking.genName} (${booking.genSize} kW)<br>
                                 🏢 ต้นทาง: ${booking.hubName || '-'}<br>
                                 📅 วันสัญญา: ${fmtDateRange(booking.startDate, booking.endDate)}<br>
                                 👷 ผู้รับผิดชอบ: ${booking.responsible || '-'}`;
                                 
            const marker = L.marker([booking.lat, booking.lng], {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            });
            
            marker.bindPopup(tooltipText);
            
            marker.bindTooltip(`${booking.genSize} kW`, {
                permanent: true,
                direction: 'bottom',
                className: 'job-marker-label',
                offset: [0, 5]
            });
            
            markersGroup.addLayer(marker);
        });
        
        // 3. Map Click Event: Select Destination Coordinate
        map.off('click');
        map.on('click', (e) => {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            
            if (window._tempClickMarker) {
                map.removeLayer(window._tempClickMarker);
            }
            
            window._tempClickMarker = L.marker([lat, lng], {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            }).addTo(map);
            
            window._tempClickMarker.bindPopup(`<b>📍 จุดติดตั้งปฏิบัติงานที่เลือก:</b><br>พิกัด: ${lat.toFixed(4)}, ${lng.toFixed(4)}`).openPopup();
            
            const sel = document.getElementById('search-target-location');
            if (sel) {
                sel.value = 'custom_click';
                sel.dataset.lat = lat;
                sel.dataset.lng = lng;
                sel.dataset.name = `พิกัดบนแผนที่ (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            }

            const displayInput = document.getElementById('search-target-display');
            if (displayInput) {
                displayInput.value = `พิกัดบนแผนที่ (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            }
        });
    };

    const renderScheduleList = (filterDate = '') => {
        const container = document.getElementById('schedule-timeline-container');
        if (!container) return;
        
// removed localStorage fetch
// removed localStorage fetch

        let filtered = fleetBookings;
        if (filterDate) {
            filtered = fleetBookings.filter(b => {
                return b.startDate <= filterDate && b.endDate >= filterDate;
            });
        }
        
        if (filtered.length === 0) {
            container.innerHTML = `
            <div class="empty-state" style="padding: 20px; text-align: center;">
                <p style="font-size:0.85rem; color:var(--text-muted);">ไม่มีรายการคิวงานเครื่องยนต์ในวันที่เลือก</p>
            </div>`;
            return;
        }
        
        filtered.sort((a,b) => {
            const states = { 'Active': 1, 'Standby': 2, 'Pending': 3 };
            return (states[a.status] || 99) - (states[b.status] || 99);
        });
        
        container.innerHTML = filtered.map((b, idx) => {
            let badgeClass = 'badge-active';
            let statusText = 'กำลังปฏิบัติงาน (Active)';
            
            if (b.status === 'Standby') {
                badgeClass = 'badge-standby';
                statusText = 'สำรองจ่าย (Standby)';
            } else if (b.status === 'Pending') {
                badgeClass = 'badge-maintenance';
                statusText = 'รอประชุม (Pending)';
            }
            
            const genText = b.genSize > 0 ? `${b.genName} (${b.genSize} kW)` : b.genName;
            
            let extensionHTML = '';
            if (b.id && String(b.id).startsWith('q_')) {
                const qId = parseInt(String(b.id).replace('q_', ''));
                const q = quoteHistory.find(x => x.id === qId);
                if (q) {
                    const sDate = new Date(q.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
                    const eDate = new Date(q.endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
                    
                    if (q.originalDays && q.originalDays !== q.days) {
                        extensionHTML = `
                        <div style="margin-top: 6px; margin-bottom: 6px;">
                            <span class="badge" style="background: #F1F5F9; color: #475569; font-size: 0.75rem; font-weight: normal; border: 1px solid #CBD5E1; display: inline-flex; align-items: center; gap: 4px;">
                                ℹ️ ระยะเวลาเช่า: ${q.days} วัน (เริ่ม ${sDate} ถึง ${eDate})
                            </span>
                        </div>`;
                    } else {
                        extensionHTML = `
                        <div style="margin-top: 6px; margin-bottom: 6px;">
                            <span class="badge" style="background: #FEF2F2; color: #EF4444; font-size: 0.75rem; font-weight: normal; border: 1px solid #FECACA; display: inline-flex; align-items: center; gap: 4px;">
                                ⚠️ ขยายสัญญาออนไลน์ไม่ได้ ต้องแจ้งล่วงหน้าอย่างน้อย 2 วันก่อนหมดสัญญา (เริ่ม ${sDate} ถึง ${eDate})
                            </span>
                        </div>`;
                    }
                }
            }
            
            return `
            <div class="timeline-item">
                <div class="timeline-item-header">
                    <h4 style="margin:0;">${idx + 1}. ${b.locationName}</h4>
                    <span class="badge ${badgeClass}" style="font-size:0.7rem; font-weight:normal; flex-shrink:0;">${statusText}</span>
                </div>
                ${extensionHTML}
                <div class="timeline-details" style="${!extensionHTML ? 'margin-top: 8px;' : ''}">
                    <span>⚡ เครื่อง: <b>${genText}</b></span>
                    <span>🏢 ต้นทาง: <b>${b.hubName}</b></span>
                    <span>📅 วันสัญญา: <b>${fmtDateRange(b.startDate, b.endDate)}</b></span>
                    <span>🔌 หม้อแปลง: <b>${b.transformerInfo || '-'}</b></span>
                    <span>👷 ผู้คุม: <small>${b.responsible || '-'}</small></span>
                </div>
                <div class="timeline-actions" style="display:flex; gap:6px; justify-content:flex-end;">
                    ${b.status !== 'Pending' ? `
                    <button class="btn btn-outline btn-xs" style="font-size:0.75rem; padding:3px 8px; font-family:'Kanit', sans-serif; cursor:pointer;" onclick="useQueueForRental('${b.id}')">
                        🔗 ตรวจสอบข้อมูล
                    </button>
                    ` : ''}
                    <button class="btn btn-outline btn-xs" style="font-size:0.75rem; padding:3px 8px; color:#3B82F6; border-color:#BFDBFE; font-family:'Kanit', sans-serif; cursor:pointer;" onclick="editFleetBooking('${b.id}')">
                        ✏️ แก้ไข
                    </button>
                </div>
            </div>
            `;
        }).join('');
    };

    window.useQueueForRental = (bookingId) => {
        const b = fleetBookings.find(x => x.id === bookingId);
        if (!b) return;
        
        document.getElementById('ins-cust-id').value = '-'; // Default to hyphen
        document.getElementById('ins-project-name').value = b.projectName || '-';
        document.getElementById('ins-location-name').value = b.locationName || '-';
        document.getElementById('ins-start-date').value = b.startDate || '-';
        document.getElementById('ins-end-date').value = b.endDate || '-';
        document.getElementById('ins-gen-info').value = b.genSize > 0 ? `${b.genName} (${b.genSize} kW)` : (b.genName || '-');
        document.getElementById('ins-hub-name').value = b.hubName || '-';
        document.getElementById('ins-responsible').value = b.responsible || '-';
        
        // Find corresponding quote history to extract cost details
        let costData = {
            rentalCost: '-', transportCost: '-', opCost: '-', vatPea: '-', totalPea: '-'
        };
        
        if (bookingId.startsWith('q_')) {
            const qId = parseInt(bookingId.replace('q_', ''));
            const q = quoteHistory.find(x => x.id === qId);
            if (q) {
                if (q.custId) {
                    document.getElementById('ins-cust-id').value = q.custId;
                }
                costData.rentalCost = (q.rentalCost != null ? fmt(q.rentalCost) : '-') + ' ฿';
                costData.transportCost = (q.transportCost != null ? fmt(q.transportCost) : '-') + ' ฿';
                costData.opCost = (q.opCost != null ? fmt(q.opCost) : '-') + ' ฿';
                costData.vatPea = (q.vatPea != null ? fmt(q.vatPea) : '-') + ' ฿';
                costData.totalPea = (q.totalPea != null ? fmt(q.totalPea) : '-') + ' ฿';
            }
        }
        
        document.getElementById('ins-cost-rental').textContent = costData.rentalCost;
        document.getElementById('ins-cost-transport').textContent = costData.transportCost;
        document.getElementById('ins-cost-op').textContent = costData.opCost;
        document.getElementById('ins-cost-vat').textContent = costData.vatPea;
        document.getElementById('ins-cost-total').textContent = costData.totalPea;
        
        document.getElementById('inspect-booking-modal').style.display = 'flex';
    };

    window.closeInspectBookingModal = () => {
        document.getElementById('inspect-booking-modal').style.display = 'none';
    };

    document.getElementById('btn-search-nearest').addEventListener('click', () => {
        const sel = document.getElementById('search-target-location');
        const targetVal = sel.value;
        const reqSize = parseInt(document.getElementById('search-gen-size').value) || 60;
        const startDate = document.getElementById('search-start-date').value;
        const endDate = document.getElementById('search-end-date').value;
        
        if (!targetVal) { alert('กรุณาคลิกเลือกจุดติดตั้งปฏิบัติงานบนแผนที่ด้านบนก่อนครับ'); return; }
        if (!startDate || !endDate) { alert('กรุณาระบุวันที่เริ่มและสิ้นสุดสัญญาเช่าด้วยครับ'); return; }
        if (startDate > endDate) { alert('วันที่เริ่มสัญญาต้องไม่เกินวันที่สิ้นสุดสัญญาครับ'); return; }
        
        let targetLat, targetLng, targetName;
        if (targetVal === 'custom_click') {
            targetLat = parseFloat(sel.dataset.lat);
            targetLng = parseFloat(sel.dataset.lng);
            targetName = sel.dataset.name || 'พิกัดบนแผนที่';
        }
        
        const bookedGenIds = fleetBookings
            .filter(b => !(b.endDate < startDate || b.startDate > endDate))
            .map(b => b.genId);
            
        const availableGens = GENERATOR_FLEET.filter(g => {
            return g.size === reqSize && g.status !== 'Maintenance' && !bookedGenIds.includes(g.id);
        });
        
        const resultsArea = document.getElementById('search-results-area');
        const resultsList = document.getElementById('search-results-list');
        
        if (availableGens.length === 0) {
            resultsArea.style.display = 'block';
            resultsList.innerHTML = `
            <div style="font-size:0.8rem; color:#EC5A5A; padding:6px 0;">
                ⚠️ ขออภัย ไม่มีเครื่องยนต์ขนาด ${reqSize} kW ว่างในช่วงเวลาดังกล่าว โปรดติดต่อแผนกเพื่อพิจารณาเพิ่มเติม
            </div>`;
            return;
        }
        
        const ratedResults = availableGens.map(g => {
            const hub = DISTRICT_HUBS.find(h => h.id === g.hubId);
            const dist = haversineDistance(targetLat, targetLng, hub.lat, hub.lng);
            const roundTrip = Math.round(dist * 2);
            const transportCost = getTransportCost(g.size, roundTrip);
            return {
                gen: g,
                hub: hub,
                distance: dist,
                roundTrip: roundTrip,
                transportCost: transportCost
            };
        });
        
        ratedResults.sort((a,b) => a.distance - b.distance);
        
        resultsArea.style.display = 'block';
        resultsList.innerHTML = ratedResults.map(r => {
            return `
            <div class="result-item-card" style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:14px; box-shadow:var(--shadow-sm); display:flex; flex-direction:column; gap:10px; margin-bottom:8px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
                    <div>
                        <h4 style="margin:0; font-size:0.95rem; color:var(--text-main); font-weight:700; display:flex; align-items:center; gap:6px;">
                            ⚡ ${r.gen.name} <span class="badge badge-green" style="font-size:0.75rem;">${r.gen.size} kW</span>
                        </h4>
                        <div style="font-size:0.82rem; color:var(--text-muted); margin-top:4px;">
                            📍 คลัง: <b style="color:var(--text-main);">${r.hub.name}</b> &nbsp;|&nbsp; 📏 ระยะห่าง: <b style="color:var(--secondary);">${r.distance.toFixed(1)} กม.</b> (ไป-กลับ ${r.roundTrip} กม.)
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:0.75rem; color:var(--text-muted);">ค่าจัดส่ง (ไป-กลับ)</div>
                        <div style="font-size:1rem; font-weight:700; color:var(--primary);">${fmt(r.transportCost)} ฿</div>
                    </div>
                </div>
                <button class="btn btn-secondary btn-full" style="padding:10px 16px; font-size:0.9rem; font-weight:600; font-family:'Kanit',sans-serif; cursor:pointer; width:100%; display:flex; align-items:center; justify-content:center; gap:8px; border-radius:var(--radius-md);" onclick="useNearestGenForRental('${r.gen.id}', '${targetName}', ${targetLat}, ${targetLng}, ${r.roundTrip}, ${r.gen.size}, '${startDate}', '${endDate}')">
                    <span>⚡ เช่าเครื่องนี้ (${r.gen.name} ขนาด ${r.gen.size} kW)</span>
                </button>
            </div>
            `;
        }).join('');
    });

    window.useNearestGenForRental = (genId, targetName, lat, lng, roundTrip, genSize, start, end) => {
        const gen = GENERATOR_FLEET.find(g => g.id === genId);
        const hub = DISTRICT_HUBS.find(h => h.id === gen.hubId);
        
        if (!confirm(`ยืนยันการเลือกจองเครื่องยนต์ ${gen.name} (${genSize} kW) หรือไม่?\n\n- กด "ตกลง" เพื่อบันทึกคิวและเริ่มทำใบเสนอราคา\n- กด "ยกเลิก" หากต้องการยกเลิกและค้นหาใหม่`)) {
            return;
        }

        let matchedSize = genSize || 120;
        if (matchedSize < 120) matchedSize = 120;
        window._forceGenSize = matchedSize;

        window._activeRentalData = { genId, targetName, lat, lng, roundTrip, hubName: hub.name };
        
        document.querySelector('[data-target="tab-gen"]').click();
        
        document.getElementById('gen-cust-name').value = `โครงการเช่าขยายผล - ${targetName}`;
        document.getElementById('gen-location').value = targetName;
        document.getElementById('gen-start-date').value = start;
        document.getElementById('gen-end-date').value = end;
        document.getElementById('gen-purpose').value = `จองเครื่อง ${gen.name} จาก ${hub.name}`;
        
        const startDateObj = new Date(start);
        const endDateObj = new Date(end);
        const diffDays = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;
        document.getElementById('gen-days').value = diffDays;
        
        document.getElementById('gen-distance').value = roundTrip;
        
        document.getElementById('gen-load-kw').value = genSize;
        document.getElementById('gen-load-amp').value = genSize;  // default Amp = kW
        document.getElementById('gen-hours').value = 12;
        updateAmpIndicator();  // refresh load bar for new generator size
        
        document.getElementById('gen-calculate-btn').click();
        
        alert(`เตรียมข้อมูลคิวเครื่องยนต์ ${gen.name} สำเร็จ!\nระบบได้ส่งข้อมูลไปยังใบเสนอราคาแล้ว:\n- คลังต้นทาง: ${hub.name}\n- ปลายทางปฏิบัติงาน: ${targetName}\n- ระยะทางไป-กลับ: ${roundTrip} กม.\n\n* ข้อมูลคิวจะถูกบันทึกลงปฏิทิน เมื่อคุณกดปุ่ม "บันทึกข้อมูล" ในหน้านี้`);
    };

    const updateFleetStats = () => {
// removed localStorage fetch
        const total = GENERATOR_FLEET.length;
        const maint = GENERATOR_FLEET.filter(g => g.status === 'Maintenance').length;
        
        const todayStr = getLocalDateString();
        const activeGenIds = fleetBookings
            .filter(b => b.startDate <= todayStr && b.endDate >= todayStr && b.genSize > 0)
            .map(b => b.genId);
            
        const activeCnt = GENERATOR_FLEET.filter(g => activeGenIds.includes(g.id)).length;
        const standbyCnt = total - activeCnt - maint;
        
        const totalEl = document.getElementById('fleet-total-cnt');
        const standbyEl = document.getElementById('fleet-standby-cnt');
        const activeEl = document.getElementById('fleet-active-cnt');
        const maintEl = document.getElementById('fleet-maint-cnt');
        if (totalEl) totalEl.innerHTML = `${total} <small class="kpi-unit">เครื่อง</small>`;
        if (standbyEl) standbyEl.innerHTML = `${standbyCnt} <small class="kpi-unit">เครื่อง</small>`;
        if (activeEl) activeEl.innerHTML = `${activeCnt} <small class="kpi-unit">เครื่อง</small>`;
        if (maintEl) maintEl.innerHTML = `${maint} <small class="kpi-unit">เครื่อง</small>`;
    };

    // Set default search dates in fleet tab
    const searchStartInput = document.getElementById('search-start-date');
    const searchEndInput = document.getElementById('search-end-date');
    if (searchStartInput) searchStartInput.value = getLocalDateString();
    if (searchEndInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        searchEndInput.value = tomorrow.toISOString().split('T')[0];
    }
    
    // ===========================
    // INTERACTIVE FLEET CALENDAR
    // ===========================
    let calYear  = new Date().getFullYear();
    let calMonth = new Date().getMonth(); // 0-indexed
    let calSelectedDate = null;
    let calStatusFilter = 'all';

    const THAI_MONTHS = [
        'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
        'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
    ];
    const THAI_DAYS_SHORT = ['อา','จ','อ','พ','พฤ','ศ','ส'];

    // Returns YYYY-MM-DD string for a day in the current calendar month
    const calDateStr = (day) => {
        const mm = String(calMonth + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        return `${calYear}-${mm}-${dd}`;
    };

    // How many bookings land on a date string?
    const getBookingsForDate = (dateStr) => {
// removed localStorage fetch
        return fleetBookings.filter(b => b.startDate <= dateStr && b.endDate >= dateStr);
    };

    // Which generator IDs are booked on a date?
    const getBookedGenIds = (dateStr) => {
        return getBookingsForDate(dateStr).map(b => b.genId);
    };

    // Build and render the calendar grid
    const renderCalendar = () => {
        const grid = document.getElementById('cal-grid');
        if (!grid) return;

// removed localStorage fetch

        document.getElementById('cal-month-label').textContent =
            `${THAI_MONTHS[calMonth]} ${calYear + 543}`;

        const todayStr = getLocalDateString();
        const firstDay = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

        let html = THAI_DAYS_SHORT.map(d =>
            `<div class="cal-day-header">${d}</div>`
        ).join('');

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            html += `<div class="cal-day empty"><div class="cal-day-num"></div></div>`;
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const ds = calDateStr(day);
            const bookings = getBookingsForDate(ds);
            const bookedIds = bookings.map(b => b.genId);
            const isToday = ds === todayStr;
            const isSelected = ds === calSelectedDate;

            // Build dots
            let dots = '';
            const hasActive  = bookings.some(b => b.status === 'Active');
            const hasStandby = bookings.some(b => b.status === 'Standby');
            const hasPending = bookings.some(b => b.status === 'Pending');
            const hasMaint   = GENERATOR_FLEET.some(g => g.status === 'Maintenance');

            if (hasActive)  dots += `<span class="cal-dot cal-dot-active"></span>`;
            if (hasStandby) dots += `<span class="cal-dot cal-dot-standby"></span>`;
            if (hasMaint)   dots += `<span class="cal-dot cal-dot-maint"></span>`;

            const cls = ['cal-day'];
            if (isToday)    cls.push('today');
            if (isSelected) cls.push('selected');

            html += `<div class="${cls.join(' ')}" data-date="${ds}" onclick="calSelectDate('${ds}')">
                <div class="cal-day-num">${day}</div>
                <div class="cal-dots">${dots}</div>
            </div>`;
        }

        grid.innerHTML = html;
    };

    // Click a date: show detail panel, hide the all-list panel
    window.calSelectDate = (dateStr) => {
        if (calSelectedDate === dateStr && document.getElementById('cal-detail-panel').style.display === 'block') {
            calShowAllBookings();
            return;
        }
        calSelectedDate = dateStr;
        renderCalendar();
        renderCalDetail();

        document.getElementById('cal-detail-panel').style.display = 'block';
        document.getElementById('cal-all-list-panel').style.display = 'none';
    };

    window.calShowAllBookings = () => {
        calSelectedDate = null;
        renderCalendar();
        renderScheduleList('');
        document.getElementById('cal-detail-panel').style.display = 'none';
        document.getElementById('cal-all-list-panel').style.display = 'block';
    };

    // Render the detail panel for the selected date with status filter
    const renderCalDetail = () => {
        const container = document.getElementById('cal-detail-container');
        const titleEl   = document.getElementById('cal-detail-title');
        if (!container || !calSelectedDate) return;

        const [y, m, d] = calSelectedDate.split('-');
        const thaiYear = parseInt(y) + 543;
        titleEl.textContent = `คิวเครื่องกำเนิดไฟฟ้า — ${parseInt(d)} ${THAI_MONTHS[parseInt(m)-1]} ${thaiYear}`;

        const bookedIds    = getBookedGenIds(calSelectedDate);
        const bookings     = getBookingsForDate(calSelectedDate);
        const bookingByGen = {};
        bookings.forEach(b => { bookingByGen[b.genId] = b; });

        // Build list of all gen cards: booked ones + available ones
        let cards = [];

        // Booked generators
        GENERATOR_FLEET.forEach(g => {
            if (!bookedIds.includes(g.id)) return;
            const b = bookingByGen[g.id];
            cards.push({ type: 'booked', gen: g, booking: b });
        });

        // Available generators (standby & not booked & not maintenance)
        GENERATOR_FLEET.forEach(g => {
            if (bookedIds.includes(g.id)) return;
            if (g.status === 'Maintenance') {
                cards.push({ type: 'maintenance', gen: g });
            } else {
                cards.push({ type: 'available', gen: g });
            }
        });

        // Apply status filter
        const filtered = cards.filter(c => {
            if (calStatusFilter === 'all') return true;
            if (calStatusFilter === 'booked')      return c.type === 'booked';
            if (calStatusFilter === 'available')   return c.type === 'available';
            if (calStatusFilter === 'maintenance') return c.type === 'maintenance';
            return true;
        });

        if (filtered.length === 0) {
            container.innerHTML = `<div class="empty-state" style="padding:16px; text-align:center;">
                <p style="color:var(--muted); font-size:0.85rem;">ไม่มีเครื่องที่ตรงกับตัวกรองที่เลือก</p>
            </div>`;
            return;
        }

        // Sort: booked → available → maintenance
        const order = { booked: 1, available: 2, maintenance: 3 };
        filtered.sort((a, b) => (order[a.type]||9) - (order[b.type]||9));

        container.innerHTML = filtered.map(c => {
            const g = c.gen;
            const hub = DISTRICT_HUBS.find(h => h.id === g.hubId);
            const hubName = hub ? hub.name : '-';

            if (c.type === 'booked') {
                const b = c.booking;
                return `<div class="cal-gen-card booked-card">
                    <div class="cal-gen-header">
                        <span class="cal-gen-name">⚡ ${g.name} (${g.size} kW)</span>
                        <span class="badge badge-active" style="font-size:0.68rem;">🔸 ใช้งานอยู่</span>
                    </div>
                    <div class="cal-gen-sub">📍 คลัง: ${hubName}</div>
                    <div class="cal-gen-sub">📋 โครงการ: <b>${b.locationName}</b></div>
                    <div class="cal-gen-sub">📅 ${fmtDateRange(b.startDate, b.endDate)}</div>
                    <div class="cal-gen-sub">👷 ${b.responsible || '-'}</div>
                    ${(() => {
                        if (b.id && String(b.id).startsWith('q_')) {
                            const qId = parseInt(String(b.id).replace('q_', ''));
                            const q = quoteHistory.find(x => x.id === qId);
                            if (q) {
                                const sDate = new Date(q.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
                                const eDate = new Date(q.endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
                                if (q.originalDays && q.originalDays !== q.days) {
                                    return `<div style="margin-top: 6px;"><span class="badge" style="background: #F1F5F9; color: #475569; font-size: 0.7rem; font-weight: normal; border: 1px solid #CBD5E1; display: inline-flex; align-items: center; gap: 4px;">ℹ️ ระยะเวลาเช่า: ${q.days} วัน (เริ่ม ${sDate} ถึง ${eDate})</span></div>`;
                                } else {
                                    return `<div style="margin-top: 6px;"><span class="badge" style="background: #FEF2F2; color: #EF4444; font-size: 0.7rem; font-weight: normal; border: 1px solid #FECACA; display: inline-flex; align-items: center; gap: 4px;">⚠️ ขยายสัญญาออนไลน์ไม่ได้ ต้องแจ้งล่วงหน้าอย่างน้อย 2 วันก่อนหมดสัญญา (เริ่ม ${sDate} ถึง ${eDate})</span></div>`;
                                }
                            }
                        }
                        return '';
                    })()}
                    <div style="display:flex; justify-content:flex-end; margin-top:4px; gap:6px;">
                        <button class="btn btn-outline btn-xs" style="font-size:0.72rem; padding:3px 8px; font-family:'Kanit',sans-serif; cursor:pointer;" onclick="useQueueForRental('${b.id}')">🔗 ตรวจสอบข้อมูล</button>
                        <button class="btn btn-outline btn-xs" style="font-size:0.72rem; padding:3px 8px; color:#3B82F6; border-color:#BFDBFE; font-family:'Kanit',sans-serif; cursor:pointer;" onclick="editFleetBooking('${b.id}')">✏️ แก้ไข</button>
                    </div>
                </div>`;
            } else if (c.type === 'maintenance') {
                return `<div class="cal-gen-card maint-card">
                    <div class="cal-gen-header">
                        <span class="cal-gen-name">⚡ ${g.name} (${g.size} kW)</span>
                        <span class="badge badge-maintenance" style="font-size:0.68rem;">🔴 ซ่อมบำรุง</span>
                    </div>
                    <div class="cal-gen-sub">📍 คลัง: ${hubName}</div>
                </div>`;
            } else {
                return `<div class="cal-gen-card available-card">
                    <div class="cal-gen-header">
                        <span class="cal-gen-name">⚡ ${g.name} (${g.size} kW)</span>
                        <span class="badge badge-standby" style="font-size:0.68rem;">🟢 ว่าง/Standby</span>
                    </div>
                    <div class="cal-gen-sub">📍 คลัง: ${hubName}</div>
                </div>`;
            }
        }).join('');
    };

    // Calendar month navigation
    document.getElementById('cal-prev-month').addEventListener('click', () => {
        calMonth--;
        if (calMonth < 0) { calMonth = 11; calYear--; }
        calSelectedDate = null;
        document.getElementById('cal-detail-panel').style.display = 'none';
        document.getElementById('cal-all-list-panel').style.display = 'block';
        renderCalendar();
        renderScheduleList();
    });

    document.getElementById('cal-next-month').addEventListener('click', () => {
        calMonth++;
        if (calMonth > 11) { calMonth = 0; calYear++; }
        calSelectedDate = null;
        document.getElementById('cal-detail-panel').style.display = 'none';
        document.getElementById('cal-all-list-panel').style.display = 'block';
        renderCalendar();
        renderScheduleList();
    });

    // Status filter chip click
    document.querySelectorAll('.cal-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cal-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            calStatusFilter = btn.dataset.filter;
            renderCalDetail();
        });
    });

    // Initial render
    renderCalendar();
    renderScheduleList();
    updateFleetStats();

    // ===========================
    // FLEET MANAGER ADMIN LOGIC
    // ===========================
    
    // Modal controls helpers
    window.closeAdminBookingModal = () => {
        document.getElementById('admin-booking-modal').style.display = 'none';
        window._editFleetBookingId = null;
        const btnSave = document.getElementById('btn-save-admin-booking');
        if (btnSave) btnSave.innerHTML = '💾 บันทึกคิวงาน';
    };
    
    window.closeAdminImportModal = () => {
        document.getElementById('admin-import-modal').style.display = 'none';
    };
    
    window.closeAdminInventoryModal = () => {
        document.getElementById('admin-inventory-modal').style.display = 'none';
    };

    window.openAdminBookingModal = (prefill = {}) => {
        window._editFleetBookingId = null;
        const btnSave = document.getElementById('btn-save-admin-booking');
        if (btnSave) btnSave.innerHTML = '💾 บันทึกคิวงาน';

        // Populate Generator Select
        const selGen = document.getElementById('adm-gen-asset');
        if (selGen) {
            selGen.innerHTML = GENERATOR_FLEET.map(g => {
                const hub = DISTRICT_HUBS.find(h => h.id === g.hubId);
                return `<option value="${g.id}">${g.name} (${g.size} kW) — ${hub ? hub.name : ''}</option>`;
            }).join('');
        }

        document.getElementById('adm-project-name').value = prefill.projectName || '';
        document.getElementById('adm-location-name').value = prefill.loc || prefill.locationName || '';
        document.getElementById('adm-lat').value = prefill.lat != null ? prefill.lat : '';
        document.getElementById('adm-lng').value = prefill.lng != null ? prefill.lng : '';
        
        const todayStr = getLocalDateString();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        document.getElementById('adm-start-date').value = prefill.startDate || todayStr;
        document.getElementById('adm-end-date').value = prefill.endDate || tomorrowStr;
        document.getElementById('adm-status').value = prefill.status || 'Active';
        document.getElementById('adm-responsible').value = prefill.responsible || 'แผนกปฏิบัติการระบบไฟฟ้า';

        if (prefill.genId && selGen) selGen.value = prefill.genId;

        document.getElementById('admin-booking-modal').style.display = 'flex';
    };

    window.editFleetBooking = (bookingId) => {
        const b = fleetBookings.find(x => x.id === bookingId);
        if (!b) return;
        window._editFleetBookingId = bookingId;
        const btnSave = document.getElementById('btn-save-admin-booking');
        if (btnSave) btnSave.innerHTML = '💾 บันทึกการแก้ไขคิวงาน';

        const selGen = document.getElementById('adm-gen-asset');
        if (selGen) {
            selGen.innerHTML = GENERATOR_FLEET.map(g => {
                const hub = DISTRICT_HUBS.find(h => h.id === g.hubId);
                return `<option value="${g.id}">${g.name} (${g.size} kW) — ${hub ? hub.name : ''}</option>`;
            }).join('');
            selGen.value = b.genId;
        }

        document.getElementById('adm-project-name').value = b.projectName || '';
        document.getElementById('adm-location-name').value = b.locationName || '';
        document.getElementById('adm-lat').value = b.lat != null ? b.lat : '';
        document.getElementById('adm-lng').value = b.lng != null ? b.lng : '';
        document.getElementById('adm-start-date').value = b.startDate || '';
        document.getElementById('adm-end-date').value = b.endDate || '';
        document.getElementById('adm-status').value = b.status || 'Active';
        document.getElementById('adm-responsible').value = b.responsible || '';

        document.getElementById('admin-booking-modal').style.display = 'flex';
    };

    document.getElementById('btn-save-admin-booking').addEventListener('click', () => {
        const proj = document.getElementById('adm-project-name').value.trim();
        const loc = document.getElementById('adm-location-name').value.trim();
        const lat = parseFloat(document.getElementById('adm-lat').value);
        const lng = parseFloat(document.getElementById('adm-lng').value);
        const genId = document.getElementById('adm-gen-asset').value;
        const start = document.getElementById('adm-start-date').value;
        const end = document.getElementById('adm-end-date').value;
        const status = document.getElementById('adm-status').value;
        const resp = document.getElementById('adm-responsible').value.trim();
        
        if (!proj) { alert('กรุณาระบุชื่อโครงการครับ'); return; }
        if (!loc) { alert('กรุณาระบุสถานที่ติดตั้งปฏิบัติงานครับ'); return; }
        if (isNaN(lat) || isNaN(lng)) { alert('กรุณาระบุพิกัดละติจูดและลองจิจูดให้ถูกต้องครับ'); return; }
        if (!start || !end) { alert('กรุณาระบุวันที่เริ่มและสิ้นสุดสัญญาเช่าครับ'); return; }
        if (start > end) { alert('วันที่เริ่มปฏิบัติงานต้องไม่เกินวันที่สิ้นสุดสัญญาครับ'); return; }
        
        const gen = GENERATOR_FLEET.find(g => g.id === genId);
        const hub = DISTRICT_HUBS.find(h => h.id === gen.hubId);
        
        const newBooking = {
            id: window._editFleetBookingId || ('b_' + Date.now()),
            projectName: proj,
            locationName: loc,
            lat: lat,
            lng: lng,
            genId: genId,
            genName: gen.name,
            genSize: gen.size,
            hubName: hub ? hub.name : '',
            startDate: start,
            endDate: end,
            status: status,
            responsible: resp || 'แผนกปฏิบัติการระบบไฟฟ้า'
        };
        
        if (window._editFleetBookingId) {
            const idx = fleetBookings.findIndex(b => b.id === window._editFleetBookingId);
            if (idx > -1) fleetBookings[idx] = newBooking;
            
            if (window._editFleetBookingId.startsWith('q_')) {
                const qId = parseInt(window._editFleetBookingId.replace('q_', ''));
                const qIdx = quoteHistory.findIndex(q => q.id === qId);
                if (qIdx > -1) {
                    quoteHistory[qIdx].purpose     = proj;
                    quoteHistory[qIdx].location    = loc;
                    quoteHistory[qIdx].lat         = lat;
                    quoteHistory[qIdx].lng         = lng;
                    quoteHistory[qIdx].genId       = genId;
                    quoteHistory[qIdx].genName     = gen.name;
                    quoteHistory[qIdx].genSize     = gen.size;
                    quoteHistory[qIdx].hubName     = hub ? hub.name : '';
                    quoteHistory[qIdx].startDate   = start;
                    quoteHistory[qIdx].endDate     = end;
                    quoteHistory[qIdx].custName    = resp;
                    quoteHistory[qIdx].status      = status;
                    localStorage.setItem('coverQuoteHistory', JSON.stringify(quoteHistory));
                }
            }
            
            alert('อัปเดตข้อมูลคิวงานและพิกัดแผนที่เรียบร้อยแล้ว!');
            window._editFleetBookingId = null;
        } else {
            fleetBookings.push(newBooking);
            alert('บันทึกคิวงานและปักหมุดพิกัดแผนที่สำเร็จ!');
        }
        
        localStorage.setItem('fleetBookings', JSON.stringify(fleetBookings));
        
        // Refresh all related UI
        updateFleetStats();
        updateMapMarkers();
        const fDate = document.getElementById('filter-schedule-date') ? document.getElementById('filter-schedule-date').value : '';
        renderScheduleList(fDate);
        renderCalendar();
        if (document.getElementById('cal-detail-panel').style.display === 'block') {
            renderCalDetail();
        }
        renderHistory();
        renderDashboard();
        initDashboardMap();
        
        closeAdminBookingModal();
    });
    
    // 2. Import/Export Modal Init
    document.getElementById('btn-admin-import-export').addEventListener('click', () => {
        document.getElementById('import-excel-paste').value = '';
        document.getElementById('admin-import-modal').style.display = 'flex';
    });
    
    // Parse Excel clipboard paste (TSV)
    document.getElementById('btn-import-excel-submit').addEventListener('click', () => {
        const text = document.getElementById('import-excel-paste').value.trim();
        if (!text) { alert('กรุณาวางข้อมูลคิวงานที่คัดลอกมาจาก Excel ในช่องป้อนข้อมูลก่อนครับ'); return; }
        
        const lines = text.split('\n');
        let parsedCnt = 0;
        let skipCnt = 0;
        
        lines.forEach(line => {
            if (!line.trim()) return;
            const cols = line.split('\t');
            if (cols.length < 8) {
                skipCnt++;
                return;
            }
            
            const projectName = cols[0].trim();
            const locationName = cols[1].trim();
            const lat = parseFloat(cols[2]);
            const lng = parseFloat(cols[3]);
            const genName = cols[4].trim();
            const genSize = parseInt(cols[5]) || 0;
            const hubName = cols[6].trim();
            const startDate = cols[7].trim();
            const endDate = cols[8].trim();
            const status = cols[9] ? cols[9].trim() : 'Active';
            const transformerInfo = cols[10] ? cols[10].trim() : '';
            const responsible = cols[11] ? cols[11].trim() : 'แผนกปฏิบัติการระบบไฟฟ้า';
            
            if (!projectName || !locationName || isNaN(lat) || isNaN(lng) || !startDate || !endDate) {
                skipCnt++;
                return;
            }
            
            let genId = 'grid_system';
            if (genSize > 0) {
                const matchedGen = GENERATOR_FLEET.find(g => g.name.toLowerCase() === genName.toLowerCase());
                if (matchedGen) {
                    genId = matchedGen.id;
                } else {
                    const fallback = GENERATOR_FLEET.find(g => g.size === genSize);
                    genId = fallback ? fallback.id : 'gen_60_1';
                }
            }
            
            fleetBookings.push({
                id: 'b_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                projectName,
                locationName,
                lat,
                lng,
                genId,
                genName,
                genSize,
                hubName,
                startDate,
                endDate,
                status: status || 'Active',
                transformerInfo: transformerInfo || 'ไม่ได้ระบุ',
                responsible
            });
            parsedCnt++;
        });
        
        localStorage.setItem('fleetBookings', JSON.stringify(fleetBookings));
        
        updateFleetStats();
        updateMapMarkers();
        const fDateEl = document.getElementById('filter-schedule-date');
        renderScheduleList(fDateEl ? fDateEl.value : '');
        
        closeAdminImportModal();
        alert(`นำเข้าข้อมูลจาก Excel เสร็จสิ้น!\nนำเข้าสำเร็จ: ${parsedCnt} รายการ\nข้ามรายการไม่สมบูรณ์: ${skipCnt} รายการ`);
    });
    
    // Import CSV File Uploader
    document.getElementById('import-csv-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target.result;
            const lines = text.split('\n');
            let parsedCnt = 0;
            let skipCnt = 0;
            
            lines.forEach((line, idx) => {
                if (idx === 0) return; // skip header
                if (!line.trim()) return;
                const cols = line.split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
                if (cols.length < 8 || !cols[0]) {
                    skipCnt++;
                    return;
                }
                
                const projectName = cols[0];
                const locationName = cols[1];
                const lat = parseFloat(cols[2]);
                const lng = parseFloat(cols[3]);
                const genName = cols[4];
                const genSize = parseInt(cols[5]) || 0;
                const hubName = cols[6];
                const startDate = cols[7];
                const endDate = cols[8];
                const status = cols[9] || 'Active';
                const transformerInfo = cols[10] || '';
                const responsible = cols[11] || 'แผนกปฏิบัติการระบบไฟฟ้า';
                
                if (isNaN(lat) || isNaN(lng) || !startDate || !endDate) {
                    skipCnt++;
                    return;
                }
                
                let genId = 'grid_system';
                if (genSize > 0) {
                    const matchedGen = GENERATOR_FLEET.find(g => g.name.toLowerCase() === genName.toLowerCase());
                    if (matchedGen) {
                        genId = matchedGen.id;
                    } else {
                        const fallback = GENERATOR_FLEET.find(g => g.size === genSize);
                        genId = fallback ? fallback.id : 'gen_60_1';
                    }
                }
                
                fleetBookings.push({
                    id: 'b_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                    projectName,
                    locationName,
                    lat,
                    lng,
                    genId,
                    genName,
                    genSize,
                    hubName,
                    startDate,
                    endDate,
                    status,
                    transformerInfo,
                    responsible
                });
                parsedCnt++;
            });
            
            localStorage.setItem('fleetBookings', JSON.stringify(fleetBookings));
            
            updateFleetStats();
            updateMapMarkers();
            const fDateEl = document.getElementById('filter-schedule-date');
            renderScheduleList(fDateEl ? fDateEl.value : '');
            
            closeAdminImportModal();
            e.target.value = '';
            alert(`นำเข้าไฟล์ CSV เสร็จสิ้น!\nนำเข้าสำเร็จ: ${parsedCnt} รายการ\nข้ามรายการไม่สมบูรณ์: ${skipCnt} รายการ`);
        };
        reader.readAsText(file);
    });
    
    // Download CSV template downloader
    document.getElementById('btn-download-csv-template').addEventListener('click', () => {
        const headers = 'ชื่อโครงการ,สถานที่ปฏิบัติงาน,ละติจูด,ลองจิจูด,รหัสเครื่องยนต์,ขนาดเครื่อง(kW),คลังต้นทาง,วันที่เริ่ม,วันที่สิ้นสุด,สถานะ,ข้อมูลหม้อแปลง,ผู้รับผิดชอบ\r\n';
        const rows = fleetBookings.map(b => {
            return `"${b.projectName}","${b.locationName}",${b.lat},${b.lng},"${b.genName}",${b.genSize},"${b.hubName}","${b.startDate}","${b.endDate}","${b.status}","${b.transformerInfo || ''}","${b.responsible || ''}"`;
        }).join('\r\n');
        
        const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'PEA_Generator_Queue_Template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    
    // Export CSV downloader
    document.getElementById('btn-export-fleet-csv').addEventListener('click', () => {
        const headers = 'ชื่อโครงการ,สถานที่ปฏิบัติงาน,ละติจูด,ลองจิจูด,รหัสเครื่องยนต์,ขนาดเครื่อง(kW),คลังต้นทาง,วันที่เริ่ม,วันที่สิ้นสุด,สถานะ,ข้อมูลหม้อแปลง,ผู้รับผิดชอบ\r\n';
        const rows = fleetBookings.map(b => {
            return `"${b.projectName}","${b.locationName}",${b.lat},${b.lng},"${b.genName}",${b.genSize},"${b.hubName}","${b.startDate}","${b.endDate}","${b.status}","${b.transformerInfo || ''}","${b.responsible || ''}"`;
        }).join('\r\n');
        
        const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'PEA_Generator_Active_Queue.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Export raw JSON downloader
    document.getElementById('btn-export-fleet-json').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(fleetBookings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'PEA_Generator_Active_Queue.json');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // 3. Inventory Modal Status Manager Init
    document.getElementById('btn-admin-inventory').addEventListener('click', () => {
        renderInventoryModalList();
        document.getElementById('admin-inventory-modal').style.display = 'flex';
    });
    
    const renderInventoryModalList = () => {
        const tbody = document.getElementById('inventory-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = GENERATOR_FLEET.map(g => {
            const hub = DISTRICT_HUBS.find(h => h.id === g.hubId);
            return `
            <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:10px; font-weight:600;">⚡ ${g.name}</td>
                <td style="padding:10px;">${g.size} kW</td>
                <td style="padding:10px;">📍 ${hub ? hub.name : '-'}</td>
                <td style="padding:10px;">
                    <select class="inventory-status-select" onchange="toggleGeneratorStatus('${g.id}', this.value)" style="border-color:${g.status === 'Maintenance' ? '#EC5A5A' : '#C2E7D4'}; color:${g.status === 'Maintenance' ? '#EC5A5A' : '#1F906A'}; background:${g.status === 'Maintenance' ? '#FFF5F5' : '#E8F5EE'}; font-weight:500;">
                        <option value="Standby" ${g.status === 'Standby' ? 'selected' : ''}>🟢 ว่าง/Standby</option>
                        <option value="Maintenance" ${g.status === 'Maintenance' ? 'selected' : ''}>🔴 ซ่อมบำรุง/Maintenance</option>
                    </select>
                </td>
            </tr>`;
        }).join('');
    };
    
    window.toggleGeneratorStatus = (genId, newStatus) => {
        const gen = GENERATOR_FLEET.find(g => g.id === genId);
        if (gen) {
            gen.status = newStatus;
            localStorage.setItem('generatorFleet', JSON.stringify(GENERATOR_FLEET));
            
            updateFleetStats();
            updateMapMarkers();
            renderInventoryModalList();
        }
    };
    
    // 4. Booking Deletion timeline hook
    window.deleteBooking = (bookingId) => {
        if (!confirm('คุณต้องการลบคิวจัดสรรเครื่องยนต์กำเนิดไฟฟ้ารายการนี้ออกจากตารางปฏิบัติงานใช่หรือไม่ครับ?')) return;
        
        const target = fleetBookings.find(b => b.id === bookingId);
        if (target) {
            fleetBookings = fleetBookings.filter(b => 
                b.id !== bookingId && 
                !(b.genId === target.genId && 
                  b.startDate === target.startDate && 
                  b.endDate === target.endDate && 
                  b.locationName === target.locationName)
            );
        } else {
            fleetBookings = fleetBookings.filter(b => b.id !== bookingId);
        }
        
        localStorage.setItem('fleetBookings', JSON.stringify(fleetBookings));
        
        updateFleetStats();
        updateMapMarkers();
        const fDateEl = document.getElementById('filter-schedule-date');
        renderScheduleList(fDateEl ? fDateEl.value : '');
        renderCalendar();
        renderCalDetail();
        alert('ลบคิวรายการที่เลือกเรียบร้อยแล้ว!');
    };

});
