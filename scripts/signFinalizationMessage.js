"use strict";

const Web3 = require('web3');
const SportCrypt = require("../lib/SportCrypt");

const web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));


let privateKey = process.env.ADMIN_PRIVATE_KEY;
let contractAddr = process.argv[2];
let matchId = process.argv[3];
let finalPrice = process.argv[4];

if (!privateKey) throw("must set ADMIN_PRIVATE_KEY environment variable");
if (!contractAddr) throw("must pass in contractAddr");
if (!matchId) throw("must pass in matchId");
if (finalPrice === undefined) throw("must pass in finalPrice");


let inst = new SportCrypt(web3);
inst.attach("0x0000000000000000000000000000000000000000", contractAddr);

let signed = inst.signFinalizationMessage(privateKey, matchId, parseInt(finalPrice));

console.log(JSON.stringify(signed));
