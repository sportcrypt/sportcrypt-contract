let testlib = require('./lib/testlib.js');

testlib.doTests([
{
  desc: "expired order",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },

    { action: 'order', from: 'A', amount: 2000, dir: 'sell', price: 60, orderId: 1, expiryOffset: 3600, },

    { action: 'trade', from: 'B', orderId: 1, amount: 500, },
    { action: 'assert', balances: { A: 9667, B: 9501, }, positions: { A: -832, B: 832, } },

    { action: 'increaseTime', amount: 3000, },

    { action: 'trade', from: 'B', orderId: 1, amount: 200, },
    { action: 'assert', balances: { A: 9534, B: 9302, }, positions: { A: -1164, B: 1164, } },

    { action: 'increaseTime', amount: 1000, },

    { action: 'trade', from: 'B', orderId: 1, amount: 200, },
    { action: 'assert', balances: { A: 9534, B: 9302, }, positions: { A: -1164, B: 1164, } },
  ],
},
]);
