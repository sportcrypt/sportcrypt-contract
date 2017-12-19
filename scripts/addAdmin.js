"use strict";

const async = require("async");
const Web3 = require('web3');

const SportCrypt = require("../lib/SportCrypt");

const web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));

let ownerAddr = process.argv[2];
let contractAddr = process.argv[3];
let adminAddr = process.argv[4];

if (!ownerAddr) {
    console.log("Available accounts: ", web3.eth.accounts);
    throw("must pass in owner address!");
}

if (!contractAddr) throw("must pass in contract addr");
if (!adminAddr) throw("must pass in admin addr");

let inst = new SportCrypt(web3);

inst.attach(ownerAddr, contractAddr);

inst.addAdmin(adminAddr, true, (err, tx) => {
    if (err) throw(err);
    console.log("ADDED ADMIN: " + adminAddr);
});
