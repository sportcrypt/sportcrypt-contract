"use strict";

const Web3 = require('web3');
const SportCrypt = require("../lib/SportCrypt");

const web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));
let sc = new SportCrypt(web3);


let external = {
    changeOwner: 1,
    addAdmin: 1,
    removeAdmin: 1,

    deposit: 1,
    withdraw: 1,
    cancelOrder: 1,
    trade: 1,
    claim: 1,
    recoverFunds: 1,
};

let payable = {
    deposit: 1,
};


for(let e of sc.abi) {
    if (e.type === 'function' && !e.constant) {
        if (!external[e.name]) throw(`Unexpected non-constant entry in external interface: ${e.name}`);
    }

    if (e.payable) {
        if (e.type !== 'fallback' && !payable[e.name]) throw(`Unexpected payable entry in external interface: ${e.name}`);
    }
}
