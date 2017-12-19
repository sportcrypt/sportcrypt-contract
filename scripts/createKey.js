"use strict";

const scUtil = require("../lib/scUtil");

let key = scUtil.generateKeyPair();

console.log(`adminKey:`);
console.log(`    private: ${key.privateKey}`);
console.log(`    address: ${key.address}`);
