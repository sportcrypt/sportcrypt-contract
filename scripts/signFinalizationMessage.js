"use strict";

const scUtil = require("../lib/scUtil");

let privateKey = process.env.ADMIN_PRIVATE_KEY;
let contractAddr = process.argv[2];
let matchId = process.argv[3];
let finalPrice = process.argv[4];

if (!privateKey) throw("must set ADMIN_PRIVATE_KEY environment variable");
if (!contractAddr) throw("must pass in contractAddr");
if (!matchId) throw("must pass in matchId");
if (finalPrice === undefined) throw("must pass in finalPrice");

let signed = scUtil.buildFinalizationMessage(contractAddr, privateKey, matchId, parseInt(finalPrice));

console.log(JSON.stringify(signed));
