/**
 * Utility for converting numbers to Ukrainian words
 * Used for financial documents where amounts need to be written out in full
 */

/**
 * Converts a numeric amount to Ukrainian words
 * @param {number|string} amount - The amount to convert (e.g., 1234.56)
 * @returns {string} Amount in words (e.g., "одна тисяча двісті тридцять чотири грн. 56 коп.")
 */
function numberToWordsUkr(amount) {
    const num = parseFloat(amount) || 0;
    const grn = Math.floor(num);
    const kop = Math.round((num - grn) * 100);

    const ones = ['', 'одна', 'дві', 'три', 'чотири', 'п\'ять', 'шість', 'сім', 'вісім', 'дев\'ять'];
    const teens = ['десять', 'одинадцять', 'дванадцять', 'тринадцять', 'чотирнадцять', 'п\'ятнадцять', 'шістнадцять', 'сімнадцять', 'вісімнадцять', 'дев\'ятнадцять'];
    const tens = ['', '', 'двадцять', 'тридцять', 'сорок', 'п\'ятдесят', 'шістдесят', 'сімдесят', 'вісімдесят', 'дев\'яносто'];
    const hundreds = ['', 'сто', 'двісті', 'триста', 'чотириста', 'п\'ятсот', 'шістсот', 'сімсот', 'вісімсот', 'дев\'ятсот'];

    const convertHundreds = (n) => {
        let result = '';
        if (n >= 100) { result += hundreds[Math.floor(n / 100)] + ' '; n %= 100; }
        if (n >= 20) { result += tens[Math.floor(n / 10)] + ' '; n %= 10; }
        else if (n >= 10) { result += teens[n - 10] + ' '; n = 0; }
        if (n > 0) result += ones[n] + ' ';
        return result.trim();
    };

    const convert = (n) => {
        if (n === 0) return 'нуль';
        let result = '';
        if (n >= 1000) {
            const t = Math.floor(n / 1000);
            if (t === 1) result += 'одна тисяча ';
            else if (t === 2) result += 'дві тисячі ';
            else if (t >= 3 && t <= 4) result += convertHundreds(t) + ' тисячі ';
            else result += convertHundreds(t) + ' тисяч ';
            n %= 1000;
        }
        result += convertHundreds(n);
        return result.trim();
    };

    return `${convert(grn)} грн. ${kop.toString().padStart(2, '0')} коп.`;
}

module.exports = { numberToWordsUkr };
