"use strict";

const async = require("async");
const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const clone = require('clone');
const child_process = require('child_process');
const waitforsocket = require('waitforsocket');

const SportCrypt = require("../../lib/SportCrypt");
const scUtil = require('../../lib/scUtil.js');

const web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8645'));




function validateInvariants(info) {
    let contractBalance = info.contractBalance;
    let balances = info.balances;
    let positions = info.positions;

    console.log("    >> contract:  ", contractBalance);
    console.log("    >> balances:  ", balances);
    console.log("    >> positions: ", positions);

    if (contractBalance.lessThan(0)) throw("contract balance negative");

    let balanceSum = Object.values(balances).reduce((sum,current) => sum.plus(current), new BigNumber(0));
    if (balanceSum.lessThan(0)) throw("balance sum negative");

    let positionSum = Object.values(positions).reduce((sum,current) => sum.plus(current), new BigNumber(0));
    if (!positionSum.isZero()) throw("position sum non-zero");

    let exposure = Object.values(positions).filter(e => e.greaterThan(0)).reduce((sum,current) => sum.plus(current), new BigNumber(0));

    let lhs = balanceSum.plus(exposure).plus(info.roundingLoss);
    if (!lhs.equals(contractBalance)) {
        throw(`balanceSum + exposure + roundingLoss !== contractBalance (${lhs} != ${contractBalance})   [${balanceSum} + ${exposure} + ${info.roundingLoss}]`);
    }
}





let gasTrack = {
    trade: [],
    claim: [],
    cancel: [],
};



function setupOwnerInstance(ownerAddr, cb) {
    let ownerInstance = new SportCrypt(web3);

    ownerInstance.attachAddr(ownerAddr);
    ownerInstance.attachContractCreate((err) => {
        if (err) throw(err);

        let adminKey = scUtil.generateKeyPair();

        ownerInstance.addAdmin(adminKey.address, true, (err) => {
            if (err) throw(err);

            cb(err, ownerInstance, adminKey);
        });
    });
}



function doTest(spec, testDone) {
    console.log(`START: [${spec.desc}]`);

    let ownerAddr = web3.eth.accounts[0];
    let nextAddrIndex = 1;
    let users = {};
    let orders = {};
    let roundingLoss = 0;

    setupOwnerInstance(ownerAddr, (err, ownerInstance, adminKey) => {
        if (err) throw(err);

        let getUser = (name) => {
            if (users[name]) return users[name];

            users[name] = {
                name: name,
                index: nextAddrIndex,
                addr: web3.eth.accounts[nextAddrIndex],
                sc: new SportCrypt(web3),
            };

            users[name].sc.attachAddr(users[name].addr);
            users[name].sc.attachContractExisting(ownerInstance.contractAddr);

            nextAddrIndex++;
            return users[name];
        };

        let matchId = '111111111111111111111111111111111111111111111111111111111111320c';

        let dumpInfo = () => {
            let balances = {};
            let positions = {};
            let contractBalance = web3.eth.getBalance(ownerInstance.contractAddr);

            for (let name of Object.keys(users)) {
                balances[name] = ownerInstance.sc.getBalance.call(users[name].addr);
                positions[name] = ownerInstance.sc.getPosition.call('0x'+matchId, users[name].addr);
            }

            return {
                balances,
                positions,
                contractBalance,
                roundingLoss,
            };
        };

        async.eachSeries(spec.actions, (action, finalCallback) => {
            console.log(action);

            let callback = () => {
                validateInvariants(dumpInfo());
                finalCallback();
            };

            if (action.action === 'deposit') {
                if (action.amount === 0) return callback();
                let user = getUser(action.from);
                user.sc.deposit(action.amount, true, (err) => {
                    if (err) throw(err);
                    callback();
                });
            } else if (action.action === 'withdraw') {
                if (action.amount === 0) return callback();
                let user = getUser(action.from);
                user.sc.withdraw(action.amount, true, (err) => {
                    if (err) throw(err);
                    callback();
                });
            } else if (action.action === 'order') {
                let user = getUser(action.from);

                let orderInfo = {
                    matchId: matchId,
                    amount: action.amount,
                    expiry: Math.floor(new Date() / 1000) + (action.expiryOffset === undefined ? 86400 : action.expiryOffset),
                    price: action.price,
                    direction: action.dir === 'sell' ? 0 :
                               action.dir === 'buy' ? 1 :
                               action.dir,
                };
                user.sc.createOrder(orderInfo, (err, order) => {
                    if (err) throw(err);
                    orders[action.orderId] = order;
                    callback();
                });
            } else if (action.action === 'trade') {
                let user = getUser(action.from);
                let order = clone(orders[action.orderId]);

                if (action.modifyOrder) action.modifyOrder(order); 

                user.sc.trade(action.amount, order, true, (err, receipt) => {
                    if (err) throw(err);

                    let doneTrade = () => {
                        gasTrack.trade.push(receipt.gasUsed);
                        callback();
                    };

                    if (!action.cb) return doneTrade();

                    async.map(['LogTrade', 'LogTradeError'], (event, cb) => {
                        user.sc.sc[event]({}, {fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber}).get((err,logs) => {
                            if (err) throw(err);
                            cb(null, logs);
                        });
                    }, (err, logs) => {
                        if (err) throw(err);
                        action.cb(receipt, { trade: logs[0][0], error: logs[1][0], });
                        doneTrade();
                    });
                });
            } else if (action.action === 'cancel') {
                let user = getUser(action.from);
                user.sc.cancelOrder(orders[action.orderId], true, (err, val) => {
                    if (err) throw(err);
                    gasTrack.cancel.push(val.gasUsed);
                    callback();
                });
            } else if (action.action === 'finalize') {
                let finalizationMsg = ownerInstance.signFinalizationMessage(adminKey.privateKey, matchId, action.price);

                if (action.cb) action.cb(finalizationMsg);
                if (action.roundingLoss) roundingLoss += action.roundingLoss;

                async.each(Object.values(users), (user, claimCb) => {
                    user.sc.claim(finalizationMsg, true, (err, val) => {
                        if (action.expectError) {
                            if (!err) throw("expected error but didn't get one");
                        } else {
                            if (err) throw(err);
                        }
                        if (val) gasTrack.claim.push(val.gasUsed);
                        claimCb();
                    });
                }, (err, results) => {
                    if (err) throw(err);
                    callback();
                });
            } else if (action.action === 'recoverFunds') {
                let user = getUser(action.from);
                user.sc.recoverFunds(matchId, true, (err, val) => {
                    if (err) throw(err);
                    callback();
                });
            } else if (action.action === 'removeAdmin') {
                ownerInstance.removeAdmin(adminKey.address, true, (err) => {
                    if (err) throw(err);
                    callback();
                });
            } else if (action.action === 'increaseTime') {
                ownerInstance.web3.currentProvider.sendAsync({
                    jsonrpc: "2.0",
                    method: "evm_increaseTime",
                    params: [action.amount],
                    id: new Date().getTime(),
                }, (err, result) => {
                    if (err) throw(err);
                    callback();
                });
            } else if (action.action === 'sendEther') {
                let user = getUser(action.from);
                user.sc.web3.eth.sendTransaction({from: user.addr, to: ownerInstance.contractAddr, value: web3.toWei(action.ether, 'ether'), gasLimit: 21000}, (err, val) => {
                    if (!err) throw("expected to get an error from raw send, but didn't");
                    callback();
                });
            } else if (action.action === 'assert') {
                let info = dumpInfo();

                if (action.balances) {
                    for (let name of Object.keys(action.balances)) {
                        if (!info.balances[name].equals(action.balances[name])) throw(`balance of ${name} was ${info.balances[name]}, expected ${action.balances[name]}`);
                    }
                }

                if (action.positions) {
                    for (let name of Object.keys(action.positions)) {
                        if (!info.positions[name].equals(action.positions[name])) throw(`positions of ${name} was ${info.positions[name]}, expected ${action.positions[name]}`);
                    }
                }

                finalCallback();
            } else {
                throw("unknown action: " + action.action);
            }
        },

        () => {
            web3.reset();
            console.log(`DONE: [${spec.desc}]`);
            testDone();
        });
    });
}


function dumpGasTrack(name, l) {
    console.log(`${name} GAS USAGE:`);
    console.log(`  avg: ${l.reduce((a,b) => a+b / l.length, 0)}`);
    console.log(`  med: ${l.sort((a,b) => a-b)[Math.floor(l.length / 2)]}`);
    console.log(`  min: ${Math.min.apply(Math, l)}`);
    console.log(`  max: ${Math.max.apply(Math, l)}`);
}


function doTests(specs) {
    let specsDevMode = specs.filter(s => s.dev);
    if (specsDevMode.length) specs = specsDevMode;

    specs = specs.filter(s => !s.skip);

    let testrpc = child_process.spawn('node_modules/.bin/testrpc', ['-p', '8645']);
    let stopTestrpc = () => {
        if (testrpc) {
            testrpc.kill('SIGQUIT');
            testrpc = undefined;
        }
    };

    process.on('exit', stopTestrpc);

    waitforsocket('localhost', 8645, {timeout: 2000}).then(() => {
        async.eachSeries(specs, doTest, (err, result) => {
            if (err) throw(err);
            console.log("All done.");

            if (gasTrack.trade.length > 0) dumpGasTrack("TRADE", gasTrack.trade);
            if (gasTrack.claim.length > 0) dumpGasTrack("CLAIM", gasTrack.claim);
            if (gasTrack.cancel.length > 0) dumpGasTrack("CANCEL", gasTrack.cancel);

            stopTestrpc();
        });
    }, (err) => {
        throw(`Error connecting to testrpc: ${err}`);
    });
}



function assertEqual(a, b) {
    if (a !== b) throw(`Assertion failed: ${a} === ${b}`);
}



module.exports = {
    doTests,
    BigNumber,
    scUtil,
    assertEqual,
    toWei: web3.toWei,
};
