// https://gist.github.com/jed/982883#file-index-js

function UUID(a) {
    return a ? (a ^ Math.random() * 16 >> a / 4).toString(16) : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, UUID);
};

module.exports.UUID = UUID;

module.exports.clamp = function(value, min, max) {
    return value <= min ? min : value >= max ? max : value;
};