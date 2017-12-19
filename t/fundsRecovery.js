let testlib = require('./lib/testlib.js');

let nullSig = {
    r: testlib.scUtil.normalizeComponent(0, 256),
    s: testlib.scUtil.normalizeComponent(0, 256),
    v: testlib.scUtil.normalizeComponent(0, 8),
};

testlib.doTests([
{
  desc: "claim unfinalized match",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 40, orderId: 1, },
    { action: 'trade', from: 'B', orderId: 1, amount: 500, },

    { action: 'assert', balances: { A: 9667, B: 9501, }, positions: { A: 832, B: -832, } },

    { action: 'finalize',
      price: 50,
      cb: (msg) => msg.sig = nullSig,
      expectError: true,
    },


    { action: 'recoverFunds', from: 'A', },
    { action: 'finalize',
      price: 50,
      cb: (msg) => msg.sig = nullSig,
      expectError: true,
    },
    { action: 'assert', balances: { A: 9667, B: 9501, }, positions: { A: 832, B: -832, } },



    { action: 'increaseTime', amount: 86400*7*11, },

    { action: 'recoverFunds', from: 'A', },
    { action: 'finalize',
      price: 50,
      cb: (msg) => msg.sig = nullSig,
      expectError: true,
    },
    { action: 'assert', balances: { A: 9667, B: 9501, }, positions: { A: 832, B: -832, } },

    { action: 'increaseTime', amount: 86400*7*2, },



    { action: 'recoverFunds', from: 'A', },
    { action: 'finalize',
      price: 50,
      cb: (msg) => msg.sig = nullSig,
    },
    { action: 'assert', balances: { A: 10083, B: 9917, }, positions: { A: 0, B: 0, } },
  ],
},
]);
