"use strict";

const async = require("async");
const Web3 = require('web3');

const SportCrypt = require("../lib/SportCrypt");

let provider = 'http://localhost:8545';
if (process.env.WEB3_PROVIDER) provider = process.env.WEB3_PROVIDER;
const web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider(provider));

let ownerAddr = process.argv[2];

if (!ownerAddr) {
    console.log("Available accounts: ", web3.eth.accounts);
    throw("must pass in owner address!");
}

let inst = new SportCrypt(web3);

if (process.env.OWNER_PRIVATE_KEY) inst.attachAddrPrivateKey(process.env.OWNER_PRIVATE_KEY, ownerAddr);
else inst.attachAddr(ownerAddr);

if (process.env.GAS_PRICE) inst.setGasPrice(process.env.GAS_PRICE);

inst.attachContractCreate((err) => {
    if (err) throw(err);

    let addr = inst.contractAddr;
    if (addr.startsWith('0x')) addr = addr.substr(2);

    console.log(`contractAddr: ${addr}`);
});
