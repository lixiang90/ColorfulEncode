// Name: ROT13
// Description: Caesar cipher with shift of 13
// Avatar: 🔄

function rot13(text) {
    return text.replace(/[a-zA-Z]/g, function(c) {
        const base = c <= 'Z' ? 65 : 97;
        return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
    });
}

function encode(text) {
    return rot13(text);
}

function decode(text) {
    return rot13(text);
}
