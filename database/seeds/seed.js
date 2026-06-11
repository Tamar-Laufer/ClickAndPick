'use strict';

require('dotenv').config();
const { connectMongo, disconnectMongo } = require('../db');
const { User, Item, Booking } = require('../models');

// --- מאגרי נתונים ליצירה רנדומלית ---
const firstNames = ['שרה', 'יוסי', 'מיכל', 'דוד', 'רחל', 'אברהם', 'נועה', 'יעל', 'אורי', 'תמר', 'דניאל', 'איתי', 'עומר', 'שירה', 'מאיה', 'גיא', 'רועי', 'עידו', 'עדי', 'טליה', 'אבי', 'חיים', 'רוני', 'גל'];
const lastNames = ['לוי', 'כהן', 'גולן', 'פרידמן', 'קפלן', 'שפירא', 'אזולאי', 'ביטון', 'גבאי', 'אדרי', 'עמר', 'מלכה', 'שמש', 'ברקוביץ', 'אוחנה'];

// כל פריט ממופה לתמונה אמיתית בתיקייה client/public/images/products
const itemsDataPool = {
    TOOLS: [
        { title: 'מקדחה נטענת', priceRange: [8, 18], desc: 'מקדחה/מברגה נטענת חזקה, כולל סט מקדחים לבטון ועץ.', img: 'drill-cordless-hands-547x365.jpg' },
        { title: 'מקדחת רוטרי SDS', priceRange: [15, 30], desc: 'פטישון מקצועי לעבודות חציבה וקידוח בבטון.', img: '9a63610d7ff849b3865fd61b5af3bc70-sds-drill-corded-600w.png' },
        { title: 'משחזת זווית נטענת', priceRange: [12, 25], desc: 'משחזת 4.5 אינץ לחיתוך וליטוש ברזל וקרמיקה.', img: 'd725115f4013456482b4df1183391abb-angle-grinder-cordless-600w.jpg' },
        { title: 'מסור עיגול נטען', priceRange: [15, 28], desc: 'מסור עגול לחיתוך מהיר ומדויק של עץ ולוחות.', img: 'circular-saw-cordless-hands-547x365.jpg' },
        { title: 'מסור חרב (סייבר)', priceRange: [15, 28], desc: 'מסור חרב לגיזום, פירוק והריסות קלות.', img: '33d7c737c7fe433cbce4425a34f7b48a-reciprocating-saw-cordless-600w.png' },
        { title: 'מסור אנכי (ג׳יגסו)', priceRange: [12, 22], desc: 'לחיתוך עץ ופרספקס בקווים מעוקלים. מגיע עם מסוריות.', img: 'jigsaw-cordless-hands-547x365.jpg' },
        { title: 'מלטשת אקצנטרית', priceRange: [10, 20], desc: 'מעולה לחידוש רהיטים והחלקת משטחי עץ.', img: 'hand-sander-hands-547x365.jpg' },
        { title: 'ארגז כלי עבודה מלא', priceRange: [10, 20], desc: 'פטיש, מברגים, פלייר, מפתח שוודי וברגים.', img: 'c99f817f6b7d45d19c5fd640576acf3f-diy-toolkit-600w.png' },
        { title: 'אקדח סיכות (סטייפלר)', priceRange: [8, 15], desc: 'לריפוד, חיבור בדים וקיבוע מהיר.', img: 'staple-gun-hands-547x365.jpg' },
        { title: 'גלאי מתכות וחיווט', priceRange: [10, 18], desc: 'לאיתור צנרת וחוטי חשמל בקיר לפני קידוח.', img: 'multi-detector-600w.jpg' },
        { title: 'מצלמה תרמית', priceRange: [25, 45], desc: 'לאיתור נזילות, גשרי חום ובידוד לקוי.', img: 'thermal-imaging-camera-600w.jpeg' },
        { title: 'סולם טלסקופי', priceRange: [10, 20], desc: 'סולם אלומיניום מתקפל, יציב ונוח לאחסון.', img: 'extendable-ladder-600w.jpg' },
        { title: 'עגלת משא (סק-טראק)', priceRange: [10, 18], desc: 'להובלת ארגזים ורהיטים כבדים בקלות.', img: 'sack-truck-600w.jpg' },
        { title: 'חותך אריחים', priceRange: [15, 28], desc: 'לחיתוך נקי ומדויק של קרמיקה ופורצלן.', img: 'TileCutter_CompactPlusXL_547x365.jpg' },
    ],
    CLEANING: [
        { title: 'מכונת שטיפה בלחץ', priceRange: [21, 40], desc: 'מכונה חזקה לניקוי חצרות, דקים, גדרות ורכבים.', img: 'heavy-duty-pressure-washer-600w.jpg' },
        { title: 'מכונה לניקוי שטיחים וספות', priceRange: [40, 70], desc: 'שואבת ומרססת מים וסבון יחד — ניקוי עמוק.', img: 'carpet-cleaner-hands-547x365.jpg' },
        { title: 'שואב רטוב/יבש', priceRange: [13, 28], desc: 'שואב מסיבי לשאיבת מים או פסולת שיפוצים.', img: 'WetDry_Vacuum_WD3_Car_547x365.jpg' },
        { title: 'מסיר לחות (דה-יומידיפייר)', priceRange: [18, 32], desc: 'לייבוש חדרים אחרי הצפה או רטיבות.', img: 'dehumidifier-hands-547x365.jpg' },
        { title: 'מכונת ניקוי בקיטור', priceRange: [13, 26], desc: 'חיטוי וניקוי ללא כימיקלים — חלונות, תנורים ומסילות.', img: 'steam-cleaner-600w.jpg' },
        { title: 'מסיר טפטים בקיטור', priceRange: [13, 24], desc: 'מקלף טפטים ישנים מהקיר במהירות ובקלות.', img: 'wallpaper-stripper-hands-547x365.jpg' },
    ],
    EVENTS: [
        { title: 'מכונת תפירה', priceRange: [13, 25], desc: 'לתיקונים, תחפושות ופרויקטים יצירתיים.', img: '598cec7182554d2697e5155236d6e9f5-sewing-machine-600w.png' },
        { title: 'מקרן וידאו ביתי', priceRange: [25, 45], desc: 'מקרן לערב סרטים, מצגות ואירועים בחצר.', img: '89eea43c0d834a3c962b9359a8012c10-projector-600w.png' },
        { title: 'רמקול הגברה + מיקרופונים', priceRange: [50, 90], desc: 'מערכת PA ניידת עם 2 מיקרופונים, בלוטות׳ וסוללה.', img: '3497a2357da94de19dbdaac2ac4a8ea7-speaker-pa-system-mic-amp-speakers-600w.png' },
    ],
    CAMPING: [
        { title: 'קוצץ דשא נטען (סטיל)', priceRange: [18, 35], desc: 'לקיצוץ שוליים ודשא גבוה סביב הגינה.', img: 'Stihl_Strimmer_FSA57_547x365.jpg' },
        { title: 'גוזם גדר חיה נטען', priceRange: [15, 30], desc: 'לעיצוב וגיזום שיחים וגדרות חיות.', img: 'hedge-trimmer-cordless-600w.jpg' },
        { title: 'מזמרת ענפים (לופר)', priceRange: [8, 15], desc: 'מזמרה ידנית לגיזום ענפים עבים.', img: 'loppers-600w.jpg' },
        { title: 'מזמרת גינה', priceRange: [5, 12], desc: 'מזמרה חדה לטיפוח צמחים ופרחים.', img: 'garden-shears-600w.jpg' },
    ],
};

// --- פונקציות עזר ---
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const generatePhone = () => `05${getRandomInt(0, 9)}${getRandomInt(1000000, 9999999)}`;
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const DAY_MS = 24 * 60 * 60 * 1000;

const NUM_USERS = 50;
const NUM_ITEMS = 150;
const NUM_BOOKINGS = 200;
const SEED_PASSWORD = '123456';

async function seedDatabase() {
    await connectMongo();

    console.log('Clearing old data...');
    await Promise.all([Booking.deleteMany({}), Item.deleteMany({}), User.deleteMany({})]);

    // ── 1. משתמשים (כולל אדמין קבוע לבדיקות) ──
    console.log(`Generating ${NUM_USERS} users...`);
    const userDocs = [];

    const admin = new User({ firstName: 'Sarah', lastName: 'Levi', email: 'sarah@example.com', phone: '0501234567', role: 'ADMIN' });
    await admin.setPassword(SEED_PASSWORD);
    userDocs.push(admin);

    for (let i = 1; i < NUM_USERS; i++) {
        const user = new User({
            firstName: getRandomElement(firstNames),
            lastName: getRandomElement(lastNames),
            email: `user${i}@example.com`,
            phone: generatePhone(),
            role: 'USER',
        });
        await user.setPassword(SEED_PASSWORD);
        userDocs.push(user);
    }
    const users = await User.insertMany(userDocs);
    console.log(`✓ ${users.length} users created (all passwords: '${SEED_PASSWORD}', admin: sarah@example.com)`);

    // ── 2. פריטים (כל אחד עם תמונת מוצר אמיתית מהתיקייה) ──
    console.log(`Generating ${NUM_ITEMS} items...`);
    const categories = Object.keys(itemsDataPool);
    const itemDocs = Array.from({ length: NUM_ITEMS }, () => {
        const category = getRandomElement(categories);
        const tmpl = getRandomElement(itemsDataPool[category]);
        return {
            owner: getRandomElement(users)._id,
            title: tmpl.title,
            description: tmpl.desc,
            category,
            dailyRate: getRandomInt(tmpl.priceRange[0], tmpl.priceRange[1]),
            imageUrl: `/images/products/${tmpl.img}`,
            isActive: Math.random() > 0.1,
        };
    });
    const items = await Item.insertMany(itemDocs);
    console.log(`✓ ${items.length} items created`);

    // ── 3. הזמנות ──
    console.log(`Generating ${NUM_BOOKINGS} bookings...`);
    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    const twoMonthsAhead = new Date(now.getFullYear(), now.getMonth() + 2, now.getDate());

    const bookingDocs = Array.from({ length: NUM_BOOKINGS }, () => {
        const item = getRandomElement(items);
        let renter;
        do { renter = getRandomElement(users); } while (renter._id.equals(item.owner));

        const startDate = randomDate(monthAgo, twoMonthsAhead);
        const durationDays = getRandomInt(1, 7);
        const endDate = new Date(startDate.getTime() + durationDays * DAY_MS);

        let status;
        if (endDate < now) status = Math.random() > 0.2 ? 'COMPLETED' : 'CANCELLED';
        else if (startDate > now) status = Math.random() > 0.5 ? 'APPROVED' : 'PENDING';
        else status = 'APPROVED';

        // משקף את פיצול העמלה בפרודקשן (totalPrice → 10% פלטפורמה / 90% בעלים)
        const totalPrice = item.dailyRate * durationDays;
        const platformFee = Math.round(totalPrice * Booking.PLATFORM_FEE_RATE * 100) / 100;
        const ownerEarnings = Math.round((totalPrice - platformFee) * 100) / 100;

        // פיזור createdAt על פני 6 החודשים האחרונים כדי שגרפי ההכנסה-לפי-חודש
        // יציגו היסטוריה אמיתית (חותמות זמן בעת ההוספה, לא הכול "היום").
        return { item: item._id, renter: renter._id, startDate, endDate, totalPrice, platformFee, ownerEarnings, status, createdAt: randomDate(sixMonthsAgo, now) };
    });
    const bookings = await Booking.insertMany(bookingDocs);
    console.log(`✓ ${bookings.length} bookings created`);

    console.log('\n🎉 Seeding complete!');
}

seedDatabase()
    .then(async () => { await disconnectMongo(); process.exit(0); })
    .catch(async (err) => {
        console.error('Seeding failed:', err.message);
        await disconnectMongo().catch(() => {});
        process.exit(1);
    });
