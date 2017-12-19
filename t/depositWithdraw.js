let testlib = require('./lib/testlib.js');

testlib.doTests([
{
  desc: "deposit/withdraw",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'assert', balances: { A: 10000, }, },
    { action: 'withdraw', from: 'A', amount: 7333, },
    { action: 'assert', balances: { A: 2667, }, },
    { action: 'withdraw', from: 'A', amount: 5000, },
    { action: 'assert', balances: { A: 0, }, },

    { action: 'deposit', from: 'A', amount: testlib.toWei(new testlib.BigNumber("1.3")), },
    { action: 'assert', balances: { A: testlib.toWei(new testlib.BigNumber("1.3")), }, },
    { action: 'withdraw', from: 'A', amount: (new testlib.BigNumber(2).pow(256).minus(1)), },
    { action: 'assert', balances: { A: 0, }, },
  ],
},

{
  desc: "send ether directly",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'assert', balances: { A: 10000, }, },

    { action: 'sendEther', from: 'A', ether: 1, },

    { action: 'assert', balances: { A: 10000, }, },
    // invariant checks will make sure contract balance didn't increase
  ],
},
]);
