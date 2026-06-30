const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://it_db_user:PTcGw3Y6IL0gjkaV@ecss-company-management.t7nhtee.mongodb.net/?retryWrites=true&w=majority&appName=Company-Management-System";
const client = new MongoClient(uri);

async function run() {
    await client.connect();
    const db = client.db('Company-Management-System');
    const col = db.collection('Receipts');
    const centres = [
        'CT Hub',
        'Pasir Ris West Wellness Centre',
        'Tampines 253 Centre',
        'Renewal Christian Church',
        'Sree Narayana Mission'
    ];

    for (const centre of centres) {
        const receipts = await col.find({ location: centre, receiptNo: /ECSS\/SFC\// }).toArray();
        const byYear = {};
        for (const r of receipts) {
            const m = r.receiptNo.match(/\/(\d{2})$/);
            if (m) {
                const yr = m[1];
                if (!byYear[yr]) byYear[yr] = [];
                byYear[yr].push(r.receiptNo);
            }
        }
        const years = Object.keys(byYear).sort();
        if (years.length === 0) {
            console.log(centre + ' | no SFC receipts found');
        }
        for (const yr of years) {
            // extract numeric part for sorting
            const nums = byYear[yr].map(no => {
                const match = no.match(/(?:TP|SNM|R)?(\d+)\/\d+$/);
                return match ? parseInt(match[1], 10) : 0;
            });
            const maxNum = Math.max(...nums);
            const lastReceipt = byYear[yr].find(no => {
                const match = no.match(/(?:TP|SNM|R)?(\d+)\/\d+$/);
                return match && parseInt(match[1], 10) === maxNum;
            });
            console.log(centre + ' | year:' + yr + ' | count:' + byYear[yr].length + ' | last receipt: ' + lastReceipt + ' | next would be: ' + (maxNum + 1));
        }
    }
    await client.close();
}
run().catch(console.error);
