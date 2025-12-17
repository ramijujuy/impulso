export const numberToWords = (number) => {
    const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const tens = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];

    if (number === 0) return 'CERO';

    // Simple implementation for now, can be expanded for complex numbers
    // Assuming the user mostly deals with round numbers for installments
    // For a full implementation, a library like 'numero-a-letras' would be better, 
    // but I'll implement a basic version to avoid external dependencies if possible.

    // Let's use a simple approach for now or ask to install a library if complex parsing is needed.
    // Given the constraints, I will implement a basic parser for up to millions.

    const parseGroup = (n) => {
        if (n === 0) return '';
        if (n === 100) return 'CIEN';

        let str = '';
        let c = Math.floor(n / 100);
        let d = Math.floor((n % 100) / 10);
        let u = n % 10;

        if (c > 0) {
            if (c === 1) str += 'CIENTO ';
            else if (c === 5) str += 'QUINIENTOS ';
            else if (c === 7) str += 'SETECIENTOS ';
            else if (c === 9) str += 'NOVECIENTOS ';
            else str += units[c] + 'CIENTOS ';
        }

        if (d === 1 && u >= 0) {
            str += teens[u];
            return str;
        }

        if (d > 1) {
            if (d === 2 && u > 0) str += 'VEINTI' + units[u];
            else {
                str += tens[d];
                if (u > 0) str += ' Y ' + units[u];
            }
        } else if (u > 0) {
            str += units[u];
        }

        return str;
    };

    let str = '';
    let millions = Math.floor(number / 1000000);
    let remainder = number % 1000000;
    let thousands = Math.floor(remainder / 1000);
    let rest = remainder % 1000;

    if (millions > 0) {
        if (millions === 1) str += 'UN MILLON ';
        else str += parseGroup(millions) + ' MILLONES ';
    }

    if (thousands > 0) {
        if (thousands === 1) str += 'MIL ';
        else str += parseGroup(thousands) + ' MIL ';
    }

    if (rest > 0) {
        str += parseGroup(rest);
    }

    return str.trim() + ' CON 00/100.-';
};
