"use strict";

const ethUtil = require("ethereumjs-util");
const ethTx = require('ethereumjs-tx');
const async = require("async");

const {normalizeComponent, encodeOrderArrayNoSig, buildOrder, signWithPrivateKey, buildFinalizationMessage, BigNumber} = require('./scUtil.js');



class SportCrypt {
    constructor(web3) {
        this.web3 = web3;

        this.spec = require('../build/SportCrypt.json');
        this.abi = JSON.parse(this.spec.contracts['SportCrypt.sol:SportCrypt'].abi);
        this.bin = this.spec.contracts['SportCrypt.sol:SportCrypt'].bin;

        this.SportCrypt = this.web3.eth.contract(this.abi);

        this.watchedTXs = {};
        this.watchTXIntervals = {};
    }


    // Attach/setup methods

    attachAddr(userAddr) {
        if (this.userAddr) throw('address already attached');
        this.userAddr = this.normalizeAddr(userAddr);
    }

    attachAddrPrivateKey(privateKey, addrVerify) {
        this.privateKey = new Buffer(privateKey, 'hex');
        let addr = '0x' + ethUtil.privateToAddress(this.privateKey).toString('hex');
        if (addrVerify && this.normalizeAddr(addrVerify) !== addr) throw("privateKey/addrVerify mismatch");
        this.attachAddr(addr);
    }

    attachContractExisting(contractAddr) {
        this.contractAddr = this.normalizeAddr(contractAddr);
        this.sc = this.SportCrypt.at(this.contractAddr);
    }

    attachContractCreate(cb) {
        if (!this.userAddr) throw('must attachAddr or attachAddrPrivateKey before creating contract');

        this.sendTX('new', [], { createContract: true, gas: 4000000, }, true, (err,res) => {
            if (err) return cb(err);
            if (!res.contractAddress) return cb("no contractAddress found");
            this.attachContractExisting(res.contractAddress);
            cb(undefined);
        });
    }

    setGasPrice(gasPrice) {
        this.gasPrice = parseInt(gasPrice);
    }

    normalizeAddr(addr) {
        addr = addr.toLowerCase();
        if (addr.substr(0, 2) !== '0x') addr = '0x'+addr;
        if (addr.length !== 42) throw(`bad address length: ${addr}`);
        return addr;
    }




    // Admin methods

    signFinalizationMessage(privateKey, matchId, finalPrice) {
        return buildFinalizationMessage(this.contractAddr, privateKey, matchId, finalPrice);
    }

    addAdmin(addr, waitForMine, cb) {
        if (addr.startsWith("0x")) addr = addr.substr(2);

        this.sendTX('addAdmin', ["0x" + addr], {}, waitForMine, cb);
    }

    removeAdmin(addr, waitForMine, cb) {
        if (addr.startsWith("0x")) addr = addr.substr(2);

        this.sendTX('removeAdmin', ["0x" + addr], {}, waitForMine, cb);
    }



    // User methods

    deposit(amount, waitForMine, cb) {
        if (typeof(amount) === 'object') amount = '0x' + amount.toString(16);
        this.sendTX('deposit', [], { value: amount, }, waitForMine, cb);
    }

    withdraw(amount, waitForMine, cb) {
        if (typeof(amount) === 'object') amount = '0x' + amount.toString(16);
        this.sendTX('withdraw', [amount], {}, waitForMine, cb);
    }

    claim(finalizationMsg, waitForMine, cb) {
        let details = finalizationMsg.details;
        let sig = finalizationMsg.sig;

        let contractAddr = this.contractAddr.substr(2);
        if (details.contractAddr.toLowerCase() !== contractAddr.toLowerCase()) throw(`contract address mismatch in finalization message (${details.contractAddr} / ${contractAddr})`);

        this.sendTX('claim', ['0x'+details.matchId, '0x'+details.finalPrice,'0x'+sig.r, '0x'+sig.s, '0x'+sig.v], {}, waitForMine, cb);
    }

    recoverFunds(matchId, waitForMine, cb) {
        this.sendTX('recoverFunds', ['0x'+matchId], {}, waitForMine, cb);
    }

    createOrder(info, cb) {
        let order = buildOrder(info, this.userAddr, this.contractAddr);

        if (this.privateKey) {
            order.sig = signWithPrivateKey(new Buffer(order.hash, 'hex'), this.privateKey);
            return cb(undefined, order);
        }

        this.web3.version.getNode((error, nodeVersion) => {
            let signCb = (err, sigResult) => {
                if (err) cb(`err from eth.sign: ${err}`);
                let sig = ethUtil.fromRpcSig(sigResult);

                let msgHash = ethUtil.sha3(Buffer.concat([
                    new Buffer("\x19Ethereum Signed Message:\n32"),
                    new Buffer(order.hash, 'hex'),
                ]));

                let recovered = ethUtil.ecrecover(msgHash, sig.v, sig.r, sig.s);

                let recoveredAddress = ethUtil.pubToAddress(new Buffer(recovered, 'hex')).toString('hex');

                if (recoveredAddress.toLowerCase() !== order.details.fromAddress.toLowerCase()) throw("couldn't verify signature");

                order.sig = {
                    v: normalizeComponent(sig.v, 8),
                    r: sig.r.toString('hex'),
                    s: sig.s.toString('hex'),
                };

                cb(undefined, order);
            };

            if (nodeVersion.match('TestRPC')) {
                this.web3.eth.sign(order.details.fromAddress, order.hash, signCb);
            } else {
                this.web3.personal.sign("0x"+order.hash, "0x"+order.details.fromAddress, signCb);
            }
        });
    }

    trade(amount, order, waitForMine, cb) {
        if (typeof(amount) === 'object') amount = '0x' + amount.toString(16);
        this.sendTX('trade', [amount, encodeOrderArrayNoSig(order), '0x'+order.sig.r, '0x'+order.sig.s, '0x'+order.sig.v], {}, waitForMine, cb);
    }

    cancelOrder(order, waitForMine, cb) {
        this.sendTX('cancelOrder', [encodeOrderArrayNoSig(order), '0x'+order.sig.r, '0x'+order.sig.s, '0x'+order.sig.v], {}, waitForMine, cb);
    }



    // Utils

    sendTX(method, args, opts, waitForMine, cb) {
        if (!this.userAddr) throw('must attachAddr or attachAddrPrivateKey before calling sendTX');

        let callObject = {
            from: this.userAddr,
            gas: 200000,
        };

        if (opts.value) callObject.value = opts.value;
        if (opts.gas) callObject.gas = opts.gas;

        if (opts.createContract) {
          callObject.data = "0x" + this.bin;
        } else {
          callObject.data = this.sc[method].getData.apply(this, args);
          callObject.to = this.contractAddr;
        }

        if (this.gasPrice) callObject.gasPrice = this.gasPrice;

        let txMadeCb = (err, val) => {
            if (err) return cb(err);
            if (waitForMine) this.watchTX(val, cb);
            else cb(err, val);
        };

        if (this.privateKey) {
            this.web3.eth.getTransactionCount(this.userAddr, (err, transactionCount) => {
                if (err) return cb(err);

                callObject.nonce = transactionCount;

                let tx = new ethTx(callObject);
                tx.sign(this.privateKey);
                let serializedTx = tx.serialize();
                this.web3.eth.sendRawTransaction('0x'+serializedTx.toString('hex'), txMadeCb);
            });
        } else {
            this.web3.eth.sendTransaction(callObject, txMadeCb);
        }
    }

    watchTX(txHash, cb) {
        this.watchedTXs[txHash] = () => {
            this.web3.eth.getTransactionReceipt(txHash, (err, val) => {
                if (err) {
                    console.error(err);
                    return;
                }

                if (!this.watchedTXs[txHash] || !val || !val.blockNumber) return;
                delete this.watchedTXs[txHash];

                if (this.watchTXIntervals[txHash]) {
                    clearInterval(this.watchTXIntervals[txHash]);
                    delete this.watchTXIntervals[txHash];
                }

                cb(undefined, val);
            });
        };

        this.watchTXIntervals[txHash] = setInterval(this.watchedTXs[txHash], 1000);

        this.watchedTXs[txHash]();
    }



    checkOrderBatch(orders, cb) {
        if (orders.length === 0) return cb(undefined, []);

        let batches = [[]];

        for (let o of orders) {
            if (batches[batches.length-1].length >= 48) batches.push([]);
            Array.prototype.push.apply(batches[batches.length-1], encodeOrderArrayNoSig(o));
        }

        let zero = `0x${normalizeComponent(0, 256)}`;
        while (batches[batches.length-1].length < 48) batches[batches.length-1].push(zero);

        async.map(batches, this.sc.checkOrderBatch.call, (err, res) => {
            if (err) return cb(err);

            let status = [];
            let amount = [];

            for (let b of res) {
                Array.prototype.push.apply(status, b[0]);
                Array.prototype.push.apply(amount, b[1]);
            }

            let results = orders.map((e, i) => {
                              return {
                                  orderHash: e.hash,
                                  status: status[i],
                                  amount: amount[i],
                              };
                          });

            cb(undefined, results);
        });
    }

    checkMatchBatch(addr, matchIds, cb) {
        if (matchIds.length === 0) return cb(undefined, []);

        let batches = [[]];

        for (let m of matchIds) {
            if (batches[batches.length-1].length >= 16) batches.push([]);
            batches[batches.length-1].push(`0x${m}`);
        }

        let zero = `0x${normalizeComponent(0, 256)}`;
        while (batches[batches.length-1].length < 16) batches[batches.length-1].push(zero);

        async.map(batches, (b, cb) => this.sc.checkMatchBatch.call(addr, b, cb), (err, res) => {
            if (err) return cb(err);

            let myPosition = [];
            let finalized = [];
            let finalPrice = [];

            for (let b of res) {
                Array.prototype.push.apply(myPosition, b[0]);
                Array.prototype.push.apply(finalized, b[1]);
                Array.prototype.push.apply(finalPrice, b[2]);
            }

            let results = matchIds.map((e, i) => {
                              return {
                                  matchId: matchIds[i],
                                  myPosition: myPosition[i],
                                  finalized: finalized[i],
                                  finalPrice: finalPrice[i],
                              };
                          });

            cb(undefined, results);
        });
    }
}



module.exports = SportCrypt;
