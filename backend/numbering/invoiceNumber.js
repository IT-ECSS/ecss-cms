function getNextInvoiceNumber({ existingInvoices, year = new Date().getFullYear().toString().slice(-2) }) {
    const prefix = 'ECSS/SFC/';
    const suffix = `/${year}`;

    if (existingInvoices.length === 0) {
        return `${prefix}001${suffix}`;
    }

    const invoiceNumbers = existingInvoices.map(invoice => {
        const match = invoice.invoiceNumber.match(new RegExp(`^${prefix}(\\d{3})${suffix}$`));
        return match ? parseInt(match[1], 10) : null;
    }).filter(num => num !== null);

    const latestNumber = Math.max(...invoiceNumbers);
    const nextNumber = latestNumber + 1;
    const padded = String(nextNumber).padStart(3, '0');

    return `${prefix}${padded}${suffix}`;
}

module.exports = {
    getNextInvoiceNumber,
};
