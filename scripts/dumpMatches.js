"use strict";

const async = require("async");
const Web3 = require('web3');

const SportCrypt = require("../lib/SportCrypt");

const web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));

let adminAddr = process.argv[2];
let contractAddr = process.argv[3];
let matchIds = process.argv.slice(4);

if (!adminAddr) throw("must pass in admin address");
if (!contractAddr) throw("must pass in contract address");
if (!matchIds.length) throw("must pass in one or more match ids");


let adminInstance = new SportCrypt(web3);

adminInstance.adminAttach(adminAddr, contractAddr);

adminInstance.checkMatchBatch("0x0", matchIds, (err, ret) => {
    if (err) throw(err);

    ret.forEach(m => {
      m.finalPrice = m.finalPrice.toNumber();
      delete m.myPosition;
    });

    console.log(JSON.stringify(ret));
});
