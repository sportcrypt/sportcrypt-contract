"use strict";

const BigNumber = require('bignumber.js');
const ethUtil = require("ethereumjs-util");
const crypto = require("crypto");




function getRandom(bytes) {
    if (typeof window === 'undefined') { // node
        return crypto.randomBytes(bytes);
    } else { // browser
        let buf = new Buffer(bytes);
        return window.crypto.getRandomValues(buf);
    }
}




function normalizeComponent(inp, bits) {
    if (inp instanceof Buffer) inp = inp.toString('hex');
    else if (typeof(inp) === 'number') inp = (new BigNumber(inp)).floor().toString(16);
    else if (typeof(inp) === 'string') {}
    else if (typeof(inp) === 'object' && inp.isBigNumber) inp = inp.floor().toString(16);
    else throw("unexpected type: " + typeof(inp));

    if (inp.substring(0, 2) === '0x') inp = inp.substring(2);
    inp = "0".repeat(Math.max(0, (bits/4) - inp.length)) + inp;

    if (inp.length > (bits/4)) throw("input too long");

    return inp;
}


function decodeStatus(s) {
    if (typeof(s) === 'object') s = s.toNumber();

    let lookup = [
        'OK',
        'MATCH_FINALIZED',
        'ORDER_EXPIRED',
        'ORDER_MALFORMED',
        'ORDER_BAD_SIG',
        'AMOUNT_MALFORMED',
        'SELF_TRADE',
        'ZERO_VALUE_TRADE',
    ];

    return lookup[s] || "UNKNOWN_STATUS";
}





function hashMatchDetails(details) {
    let orderedDetails = {};
    Object.keys(details).sort().forEach((key) => {
        orderedDetails[key] = details[key];
    });

    let hash = ethUtil.sha3(new Buffer(JSON.stringify(orderedDetails))).toString('hex');

    if (details.recoveryWeeks === undefined) return hash; // backwards compat

    return `${hash.substr(0, 60)}${normalizeComponent(parseInt(details.cancelPrice), 8)}${normalizeComponent(parseInt(details.recoveryWeeks), 8)}`;
}




/*
  [0]: match hash
  [1]: amount
  [2]: 5-byte expiry, 5-byte nonce, 1-byte price, 1-byte direction, 20-byte address
*/

function encodeOrderArrayNoSig(order) {
    return [
        `0x${order.details.matchId}`,
        `0x${order.details.amount}`,
        `0x${order.details.expiry}${order.details.nonce}${order.details.price}${order.details.direction}${order.details.fromAddress}`,
    ];
}

function hashOrderDetails(details) {
    let rawOrder = [
        details.contractAddr,
        details.matchId,
        details.amount,
        details.expiry,
        details.nonce,
        details.price,
        details.direction,
        details.fromAddress,
    ].join('');

    return ethUtil.sha3(new Buffer(rawOrder, 'hex')).toString('hex');
}

function encodeOrderStringWithSig(order) {
    return `${order.details.contractAddr}${order.details.matchId}${order.details.amount}${order.details.expiry}${order.details.nonce}${order.details.price}${order.details.direction}${order.details.fromAddress}${order.sig.r}${order.sig.s}${order.sig.v}`
}


function buildOrder(info, userAddr, contractAddr) {
    let details = {
        contractAddr: normalizeComponent(contractAddr, 160),
        matchId: normalizeComponent(info.matchId, 256),
        amount: normalizeComponent(info.amount, 256),
        expiry: normalizeComponent(info.expiry, 8*5),
        nonce: normalizeComponent(getRandom(5), 8*5),
        price: normalizeComponent(info.price, 8*1),
        direction: normalizeComponent(info.direction, 8*1),
        fromAddress: normalizeComponent(userAddr, 160),
    };

    let orderHash = hashOrderDetails(details);

    let order = {
        details: details,
        hash: orderHash,
    };

    return order;
}


function unpackOrderStringWithSig(orderString) {
    if (orderString.length !== 362) throw("bad length for order string");

    let details = {
        contractAddr: orderString.substr(0, 40),
        matchId: orderString.substr(40, 64),
        amount: orderString.substr(104, 64),
        expiry: orderString.substr(168, 10),
        nonce: orderString.substr(178, 10),
        price: orderString.substr(188, 2),
        direction: orderString.substr(190, 2),
        fromAddress: orderString.substr(192, 40),
    };

    let orderHash = hashOrderDetails(details);

    return {
        details: details,
        hash: orderHash,
        sig: {
            v: orderString.substr(360, 2),
            r: orderString.substr(232, 64),
            s: orderString.substr(296, 64),
        },
    };
}



function generateKeyPair() {
    let privKey;

    do {
        privKey = getRandom(32);
    } while (!ethUtil.isValidPrivate(privKey));

    return {
        privateKey: privKey.toString('hex'),
        address: ethUtil.privateToAddress(privKey).toString('hex'),
    };
}



function signWithPrivateKey(msg, privateKey) {
    let msgHash = ethUtil.sha3(Buffer.concat([
        new Buffer("\x19Ethereum Signed Message:\n" + msg.length),
        msg,
    ]));

    let sig = ethUtil.ecsign(msgHash, new Buffer(privateKey, 'hex'));
    sig.r = sig.r.toString('hex');
    sig.s = sig.s.toString('hex');
    sig.v = normalizeComponent(sig.v, 8);

    return sig;
}



module.exports = {
    BigNumber,

    getRandom,
    generateKeyPair,
    normalizeComponent,
    decodeStatus,
    hashMatchDetails,
    encodeOrderArrayNoSig,
    hashOrderDetails,
    buildOrder,
    encodeOrderStringWithSig,
    unpackOrderStringWithSig,
    signWithPrivateKey,
};
