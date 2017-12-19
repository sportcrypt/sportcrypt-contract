"use strict";

const async = require("async");
const Web3 = require('web3');

const SportCrypt = require("../lib/SportCrypt");

const web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));

let ownerAddr = process.argv[2];

if (!ownerAddr) {
    console.log("Available accounts: ", web3.eth.accounts);
    throw("must pass in owner address!");
}

let inst = new SportCrypt(web3);

inst.createAndAttach(ownerAddr, (err) => {
    if (err) throw(err);

    let addr = inst.contractAddr;
    if (addr.startsWith('0x')) addr = addr.substr(2);

    console.log(`contractAddr: ${addr}`);
});
